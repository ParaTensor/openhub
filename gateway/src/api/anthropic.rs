use std::sync::Arc;

use axum::body::Body;
use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::Value;
use url::Url;
use uuid::Uuid;

use super::enforce_model_acl;
use unigateway_sdk::core::{
    Endpoint, ExecutionTarget, MessageRole, ProviderKind, ProxyChatRequest,
};
use unigateway_sdk::host::status::status_for_host_error;
use unigateway_sdk::host::{
    dispatch_request, HostContext, HostDispatchOutcome, HostDispatchTarget, HostError,
    HostProtocol, HostRequest,
};
use unigateway_sdk::protocol::{
    ProtocolHttpResponse, ProtocolResponseBody, REASONING_TEXT_ENCODING_KEY,
};

use crate::auth::keys::AuthenticatedUser;
use crate::routing::resolve::resolve_model_target;
use crate::runtime::ParaRouterRuntime;
use crate::translators::anthropic::{into_core_chat_request, PermissiveAnthropicRequest};
use crate::usage::health::mark_provider_key_unhealthy;
use crate::usage::stream::{observe_sse_body, StreamObservationLabels, StreamObservationSink};

/// Convert a ProtocolHttpResponse into an axum::Response.
fn into_axum_response(
    response: ProtocolHttpResponse,
    stream_observation: Option<(Arc<dyn StreamObservationSink>, StreamObservationLabels)>,
) -> Response {
    let (status, body) = response.into_parts();
    match body {
        ProtocolResponseBody::Json(value) => (status, axum::Json(value)).into_response(),
        ProtocolResponseBody::ServerSentEvents(stream) => {
            let body = match stream_observation {
                Some((sink, labels)) => observe_sse_body(stream, sink, labels),
                None => Body::from_stream(stream),
            };

            Response::builder()
                .status(status)
                .header("content-type", "text/event-stream")
                .header("cache-control", "no-cache")
                .body(body)
                .unwrap_or_else(|e| {
                    (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
                })
        }
    }
}

/// Convert HostError into an appropriate HTTP Response.
fn error_response_for_host_error(err: &HostError) -> Response {
    let status = status_for_host_error(err);
    let error_body = serde_json::json!({
        "error": {
            "message": err.to_string()
        }
    });
    (status, axum::Json(error_body)).into_response()
}

fn base_url_requires_named_tool_choice_downgrade(base_url: &str) -> bool {
    let Ok(parsed) = Url::parse(base_url) else {
        return false;
    };

    let Some(host) = parsed
        .host_str()
        .map(|host| host.trim().to_ascii_lowercase())
    else {
        return false;
    };

    host == "memtensor.cn"
        || host.ends_with(".memtensor.cn")
        || host == "taotoken.net"
        || host.ends_with(".taotoken.net")
}

fn endpoint_urls_require_named_tool_choice_downgrade(endpoint_urls: &[String]) -> bool {
    endpoint_urls
        .iter()
        .any(|base_url| base_url_requires_named_tool_choice_downgrade(base_url))
}

fn extract_forced_tool_name(tool_choice: &Value) -> Option<&str> {
    let tool_type = tool_choice.get("type")?.as_str()?.trim();
    if !tool_type.eq_ignore_ascii_case("tool") {
        return None;
    }

    tool_choice
        .get("name")?
        .as_str()
        .map(str::trim)
        .filter(|name| !name.is_empty())
}

fn has_single_matching_tool(tools: Option<&Value>, forced_tool_name: &str) -> bool {
    let Some(tool_array) = tools.and_then(Value::as_array) else {
        return false;
    };

    if tool_array.len() != 1 {
        return false;
    }

    tool_array[0]
        .get("name")
        .and_then(Value::as_str)
        .map(str::trim)
        .is_some_and(|tool_name| tool_name == forced_tool_name)
}

fn downgrade_incompatible_tool_choice(
    endpoint_urls: &[String],
    tools: Option<&Value>,
    tool_choice: &mut Option<Value>,
) -> bool {
    if !endpoint_urls_require_named_tool_choice_downgrade(endpoint_urls) {
        return false;
    }

    let Some(forced_tool_name) = tool_choice.as_ref().and_then(extract_forced_tool_name) else {
        return false;
    };

    if !has_single_matching_tool(tools, forced_tool_name) {
        return false;
    }

    *tool_choice = Some(serde_json::json!({ "type": "any" }));
    true
}

const REASONING_TEXT_MODEL_SCOPE_KEY: &str = "pararouter.reasoning_text_model_scope";
const REASONING_TEXT_MODEL_SCOPE_CLAUDE_FAMILY: &str = "claude_family";
const REASONING_TEXT_MODEL_SCOPE_ALL_MODELS: &str = "all_models";

fn model_matches_reasoning_text_scope(global_model_id: &str, scope: &str) -> bool {
    let normalized = global_model_id.trim().to_ascii_lowercase();
    match scope.trim() {
        REASONING_TEXT_MODEL_SCOPE_ALL_MODELS => true,
        REASONING_TEXT_MODEL_SCOPE_CLAUDE_FAMILY => normalized.starts_with("claude-"),
        _ => false,
    }
}

fn selected_reasoning_policy<'a>(
    endpoints: &'a [Endpoint],
    endpoint_hint: Option<&str>,
) -> Option<(&'a str, &'a str)> {
    let selected = endpoints
        .iter()
        .filter(|endpoint| {
            endpoint_hint.is_none_or(|hint| {
                endpoint.endpoint_id == hint || endpoint.source_endpoint_id.as_deref() == Some(hint)
            })
        })
        .collect::<Vec<_>>();

    if selected.is_empty()
        || !selected
            .iter()
            .all(|endpoint| matches!(endpoint.provider_kind, ProviderKind::OpenAiCompatible))
    {
        return None;
    }

    let first = selected[0];
    let encoding = first
        .metadata
        .get(REASONING_TEXT_ENCODING_KEY)
        .map(String::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())?;
    let scope = first
        .metadata
        .get(REASONING_TEXT_MODEL_SCOPE_KEY)
        .map(String::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())?;

    if !selected.iter().all(|endpoint| {
        endpoint
            .metadata
            .get(REASONING_TEXT_ENCODING_KEY)
            .map(String::as_str)
            .map(str::trim)
            == Some(encoding)
            && endpoint
                .metadata
                .get(REASONING_TEXT_MODEL_SCOPE_KEY)
                .map(String::as_str)
                .map(str::trim)
                == Some(scope)
    }) {
        return None;
    }

    Some((encoding, scope))
}

fn maybe_apply_declared_reasoning_text_encoding(
    request: &mut ProxyChatRequest,
    global_model_id: &str,
    endpoints: &[Endpoint],
    endpoint_hint: Option<&str>,
) -> bool {
    if request.metadata.contains_key(REASONING_TEXT_ENCODING_KEY) {
        return false;
    }

    let Some((encoding, scope)) = selected_reasoning_policy(endpoints, endpoint_hint) else {
        return false;
    };
    if !model_matches_reasoning_text_scope(global_model_id, scope) {
        return false;
    }

    request.metadata.insert(
        REASONING_TEXT_ENCODING_KEY.to_string(),
        encoding.to_string(),
    );
    true
}

pub(crate) fn normalize_system_prompt_for_openai_upstream(request: &mut ProxyChatRequest) {
    if request.system.as_ref().is_some_and(Value::is_string) {
        return;
    }

    let system_text = request
        .messages
        .iter()
        .filter(|message| message.role == MessageRole::System)
        .map(|message| message.text_content())
        .filter(|text| !text.is_empty())
        .collect::<Vec<_>>()
        .join("\n");

    if !system_text.is_empty() {
        request.system = Some(Value::String(system_text));
    }
}

pub async fn messages(
    auth: AuthenticatedUser,
    State(runtime): State<Arc<ParaRouterRuntime>>,
    Json(permissive_request): Json<PermissiveAnthropicRequest>,
) -> Response {
    tracing::info!(
        "Anthropic /v1/messages handler invoked for model: {}",
        permissive_request.model
    );
    tracing::debug!("Auth user: key_id={}, uid={}", auth.key_id, auth.uid);
    let provider_hint = permissive_request
        .pararouter_provider_account_id
        .as_ref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    // Stage 1: Protocol Translation
    let mut request = match into_core_chat_request(permissive_request) {
        Ok(r) => r,
        Err(e) => {
            return (StatusCode::BAD_REQUEST, e).into_response();
        }
    };

    // Stage 2: Routing Lifecycle (find ExecutionTarget)
    let resolved =
        match resolve_model_target(&runtime, &request.model, provider_hint.as_deref()).await {
            Ok(t) => t,
            Err(e) => {
                return (StatusCode::NOT_FOUND, format!("Routing failed: {}", e)).into_response();
            }
        };

    if let Err(response) = enforce_model_acl(&auth, &request.model, Some(&resolved.global_model_id))
    {
        return response;
    }

    // Annotate metadata securely from Auth layer
    let request_correlation_id = Uuid::new_v4().to_string();
    request.metadata.insert(
        "request_correlation_id".to_string(),
        request_correlation_id.clone(),
    );
    request
        .metadata
        .insert("user_id".to_string(), auth.uid.clone());
    request
        .metadata
        .insert("key_id".to_string(), auth.key_id.clone());
    request
        .metadata
        .insert("requested_model".to_string(), request.model.clone());
    request.metadata.insert(
        "global_model_id".to_string(),
        resolved.global_model_id.clone(),
    );
    if let Some(budget_limit) = auth.budget_limit {
        request
            .metadata
            .insert("budget_limit".to_string(), budget_limit.to_string());
    }

    let service_id = match &resolved.target {
        ExecutionTarget::Pool { pool_id } => pool_id.clone(),
        _ => return (StatusCode::INTERNAL_SERVER_ERROR, "Unsupported target type").into_response(),
    };

    request.metadata.insert(
        "resolved_provider_account_id".to_string(),
        service_id.clone(),
    );
    request.metadata.insert(
        "global_model_id".to_string(),
        resolved.global_model_id.clone(),
    );
    if let Some(endpoint_hint) = &resolved.endpoint_hint {
        request.metadata.insert(
            "resolved_provider_key_id".to_string(),
            endpoint_hint.clone(),
        );
    }
    let stream_labels = StreamObservationLabels::new(
        "anthropic.messages",
        request.model.clone(),
        Some(request_correlation_id),
        Some(service_id.clone()),
        resolved.endpoint_hint.clone(),
    );

    let (targets_openai_upstream, pool_endpoints, pool_endpoint_urls) = runtime
        .engine
        .get_pool(&service_id)
        .await
        .map(|pool| {
            (
                pool.endpoints
                    .iter()
                    .all(|endpoint| endpoint.provider_kind == ProviderKind::OpenAiCompatible),
                pool.endpoints.clone(),
                pool.endpoints
                    .iter()
                    .map(|endpoint| endpoint.base_url.clone())
                    .collect::<Vec<_>>(),
            )
        })
        .unwrap_or((false, Vec::new(), Vec::new()));
    if targets_openai_upstream {
        if maybe_apply_declared_reasoning_text_encoding(
            &mut request,
            &resolved.global_model_id,
            &pool_endpoints,
            resolved.endpoint_hint.as_deref(),
        ) {
            request.metadata.insert(
                "compat_reasoning_text_encoding".to_string(),
                request
                    .metadata
                    .get(REASONING_TEXT_ENCODING_KEY)
                    .cloned()
                    .unwrap_or_default(),
            );
        }
        normalize_system_prompt_for_openai_upstream(&mut request);
        let request_tools = request.tools.clone();
        if downgrade_incompatible_tool_choice(
            &pool_endpoint_urls,
            request_tools.as_ref(),
            &mut request.tool_choice,
        ) {
            request.metadata.insert(
                "compat_tool_choice_downgraded".to_string(),
                "named_tool_to_any".to_string(),
            );
        }
    }

    // Stage 3: Execution via HostContext and dispatch_request
    let ctx = HostContext::from_parts(&runtime.engine, &*runtime);
    match dispatch_request(
        &ctx,
        HostDispatchTarget::Service(&service_id),
        HostProtocol::AnthropicMessages,
        resolved.endpoint_hint.as_deref(),
        HostRequest::Chat(request),
    )
    .await
    {
        Ok(outcome) => match outcome {
            HostDispatchOutcome::Response(response) => into_axum_response(
                response,
                Some((runtime.stream_observation_sink.clone(), stream_labels)),
            ),
            HostDispatchOutcome::PoolNotFound => {
                (StatusCode::NOT_FOUND, "Pool mapping not found").into_response()
            }
            _ => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Unexpected dispatch outcome",
            )
                .into_response(),
        },
        Err(err) => {
            mark_provider_key_unhealthy(
                &runtime.db,
                resolved.endpoint_hint.as_deref(),
                &err.to_string(),
            )
            .await;
            error_response_for_host_error(&err)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        base_url_requires_named_tool_choice_downgrade, downgrade_incompatible_tool_choice,
        endpoint_urls_require_named_tool_choice_downgrade,
        maybe_apply_declared_reasoning_text_encoding, normalize_system_prompt_for_openai_upstream,
        REASONING_TEXT_MODEL_SCOPE_CLAUDE_FAMILY, REASONING_TEXT_MODEL_SCOPE_KEY,
    };
    use serde_json::json;
    use std::collections::HashMap;
    use unigateway_sdk::core::{
        ContentBlock, Endpoint, Message, MessageRole, ModelPolicy, ProviderKind,
        ProxyChatRequest, SecretString,
    };
    use unigateway_sdk::protocol::REASONING_TEXT_ENCODING_KEY;

    fn test_endpoint(
        provider_name: &str,
        provider_kind: ProviderKind,
        reasoning_text_encoding: Option<&str>,
        reasoning_text_model_scope: Option<&str>,
    ) -> Endpoint {
        let mut metadata = HashMap::new();
        if let Some(value) = reasoning_text_encoding {
            metadata.insert(REASONING_TEXT_ENCODING_KEY.to_string(), value.to_string());
        }
        if let Some(value) = reasoning_text_model_scope {
            metadata.insert(
                REASONING_TEXT_MODEL_SCOPE_KEY.to_string(),
                value.to_string(),
            );
        }

        Endpoint {
            endpoint_id: format!("{provider_name}-endpoint"),
            provider_name: Some(provider_name.to_string()),
            source_endpoint_id: Some(format!("{provider_name}-source")),
            provider_family: Some(provider_name.to_string()),
            provider_kind,
            driver_id: "openai-compatible".to_string(),
            base_url: "https://example.invalid/v1".to_string(),
            api_key: SecretString::new("test-key"),
            model_policy: ModelPolicy::default(),
            enabled: true,
            metadata,
        }
    }

    fn test_proxy_chat_request() -> ProxyChatRequest {
        ProxyChatRequest {
            model: "claude-opus-4-7".to_string(),
            messages: Vec::new(),
            temperature: None,
            top_p: None,
            top_k: None,
            max_tokens: None,
            stop_sequences: None,
            stream: false,
            system: None,
            tools: None,
            tool_choice: None,
            raw_messages: None,
            extra: HashMap::new(),
            metadata: HashMap::new(),
        }
    }

    #[test]
    fn normalizes_block_system_prompt_for_openai_upstream() {
        let mut request = ProxyChatRequest {
            model: "claude-3-7-sonnet".to_string(),
            messages: vec![Message::from_blocks(
                MessageRole::System,
                vec![ContentBlock::Text {
                    text: "be concise".to_string(),
                }],
            )],
            temperature: None,
            top_p: None,
            top_k: None,
            max_tokens: Some(64),
            stop_sequences: None,
            stream: false,
            system: Some(json!([
                {"type": "text", "text": "be concise"}
            ])),
            tools: None,
            tool_choice: None,
            raw_messages: None,
            extra: HashMap::new(),
            metadata: HashMap::new(),
        };

        normalize_system_prompt_for_openai_upstream(&mut request);

        assert_eq!(request.system, Some(json!("be concise")));
    }

    #[test]
    fn taotoken_named_tool_choice_downgrades_to_any_for_single_matching_tool() {
        let endpoint_urls = vec!["https://taotoken.net/api/v1".to_string()];
        let tools = json!([
            {
                "name": "add_numbers",
                "description": "Add two integers",
                "input_schema": {
                    "type": "object"
                }
            }
        ]);
        let mut tool_choice = Some(json!({
            "type": "tool",
            "name": "add_numbers"
        }));

        let rewritten =
            downgrade_incompatible_tool_choice(&endpoint_urls, Some(&tools), &mut tool_choice);

        assert!(rewritten);
        assert_eq!(tool_choice, Some(json!({ "type": "any" })));
    }

    #[test]
    fn named_tool_choice_compatibility_gate_tracks_taotoken_and_memtensor_hosts() {
        assert!(base_url_requires_named_tool_choice_downgrade(
            "https://taotoken.net/api/v1"
        ));
        assert!(base_url_requires_named_tool_choice_downgrade(
            "https://api.memtensor.cn/v1"
        ));
        assert!(!base_url_requires_named_tool_choice_downgrade(
            "https://www.kaopuapi.com/v1"
        ));
        assert!(endpoint_urls_require_named_tool_choice_downgrade(&[
            "https://www.kaopuapi.com/v1".to_string(),
            "https://taotoken.net/api/v1".to_string()
        ]));
    }

    #[test]
    fn configured_claude_family_policy_adds_reasoning_text_encoding_metadata() {
        let mut request = test_proxy_chat_request();
        let endpoints = vec![test_endpoint(
            "provider",
            ProviderKind::OpenAiCompatible,
            Some("xml_think_tag"),
            Some(REASONING_TEXT_MODEL_SCOPE_CLAUDE_FAMILY),
        )];

        let applied = maybe_apply_declared_reasoning_text_encoding(
            &mut request,
            "claude-opus-4-7",
            &endpoints,
            Some("provider-endpoint"),
        );

        assert!(applied);
        assert_eq!(
            request.metadata.get(REASONING_TEXT_ENCODING_KEY),
            Some(&"xml_think_tag".to_string())
        );
    }

    #[test]
    fn claude_family_scope_does_not_apply_to_non_claude_models() {
        let mut request = test_proxy_chat_request();
        let endpoints = vec![test_endpoint(
            "provider",
            ProviderKind::OpenAiCompatible,
            Some("xml_think_tag"),
            Some(REASONING_TEXT_MODEL_SCOPE_CLAUDE_FAMILY),
        )];

        let applied = maybe_apply_declared_reasoning_text_encoding(
            &mut request,
            "gpt-4o-mini",
            &endpoints,
            Some("provider-endpoint"),
        );

        assert!(!applied);
        assert!(!request.metadata.contains_key(REASONING_TEXT_ENCODING_KEY));
    }
}

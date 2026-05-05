use std::collections::HashMap;
use std::time::SystemTime;

use futures_util::{stream, StreamExt};
use serde_json::{json, Value};
use tokio::sync::oneshot;
use unigateway_sdk::core::protocol::{anthropic, openai};
use unigateway_sdk::core::transport::TransportRequest;
use unigateway_sdk::core::{
    ChatResponseChunk, ChatResponseFinal, CompletedResponse, DriverEndpointContext, ModelPolicy,
    ProviderKind, ProxySession, RequestKind, RequestReport, SecretString, StreamingResponse,
    TokenUsage,
};
use unigateway_sdk::protocol::{
    render_anthropic_chat_session, render_openai_chat_session, ProtocolResponseBody,
};

use crate::api::anthropic::normalize_system_prompt_for_openai_upstream;
use crate::translators::{anthropic as anthropic_translator, openai as openai_translator};

#[test]
fn openai_translator_round_trips_into_anthropic_request_builder() {
    let request =
        openai_translator::into_core_chat_request(openai_translator::PermissiveChatRequest {
            model: Some("gpt-4.1".to_string()),
            messages: Some(vec![
                openai_translator::PermissiveChatMessage {
                    role: Some("system".to_string()),
                    content: Some(json!([
                        { "type": "text", "text": "be concise" }
                    ])),
                    extra: HashMap::new(),
                },
                openai_translator::PermissiveChatMessage {
                    role: Some("user".to_string()),
                    content: Some(Value::String("weather in Paris".to_string())),
                    extra: HashMap::new(),
                },
                openai_translator::PermissiveChatMessage {
                    role: Some("assistant".to_string()),
                    content: None,
                    extra: HashMap::from([
                        ("reasoning_content".to_string(), json!("need weather first")),
                        (
                            "tool_calls".to_string(),
                            json!([
                                {
                                    "id": "call_123",
                                    "type": "function",
                                    "function": {
                                        "name": "lookup_weather",
                                        "arguments": "{\"city\":\"Paris\"}"
                                    }
                                }
                            ]),
                        ),
                    ]),
                },
                openai_translator::PermissiveChatMessage {
                    role: Some("tool".to_string()),
                    content: Some(Value::String("18C".to_string())),
                    extra: HashMap::from([("tool_call_id".to_string(), json!("call_123"))]),
                },
            ]),
            temperature: None,
            top_p: None,
            top_k: None,
            max_tokens: Some(64),
            stop: None,
            stream: Some(false),
            tools: Some(json!([
                {
                    "type": "function",
                    "function": {
                        "name": "lookup_weather",
                        "description": "Look up weather",
                        "parameters": {
                            "type": "object",
                            "properties": {"city": {"type": "string"}},
                            "required": ["city"]
                        }
                    }
                }
            ])),
            tool_choice: Some(json!({
                "type": "function",
                "function": {"name": "lookup_weather"}
            })),
            pararouter_provider_account_id: None,
            extra: HashMap::new(),
        })
        .expect("translated request");

    let built =
        anthropic::build_chat_request(&anthropic_endpoint(), &request).expect("anthropic request");
    let body = body_json(&built);
    let messages = body["messages"].as_array().expect("messages array");

    assert_eq!(body["system"], json!("be concise"));
    assert_eq!(
        body["tool_choice"],
        json!({"type": "tool", "name": "lookup_weather"})
    );
    assert_eq!(messages.len(), 3);
    assert_eq!(messages[0]["role"], json!("user"));
    assert_eq!(messages[0]["content"][0]["text"], json!("weather in Paris"));
    assert_eq!(messages[1]["role"], json!("assistant"));
    assert_eq!(messages[1]["content"][0]["type"], json!("thinking"));
    assert_eq!(
        messages[1]["content"][0]["thinking"],
        json!("need weather first")
    );
    assert_eq!(messages[1]["content"][1]["type"], json!("tool_use"));
    assert_eq!(messages[1]["content"][1]["id"], json!("call_123"));
    assert_eq!(messages[1]["content"][1]["input"], json!({"city": "Paris"}));
    assert_eq!(messages[2]["role"], json!("user"));
    assert_eq!(messages[2]["content"][0]["type"], json!("tool_result"));
    assert_eq!(messages[2]["content"][0]["tool_use_id"], json!("call_123"));
}

#[test]
fn anthropic_translator_round_trips_into_openai_request_builder() {
    let mut request = anthropic_translator::into_core_chat_request(
        anthropic_translator::PermissiveAnthropicRequest {
            model: "claude-3-7-sonnet".to_string(),
            messages: vec![
                anthropic_translator::PermissiveAnthropicMessage {
                    role: "user".to_string(),
                    content: Value::String("weather in Paris".to_string()),
                    extra: HashMap::new(),
                },
                anthropic_translator::PermissiveAnthropicMessage {
                    role: "assistant".to_string(),
                    content: json!([
                        {
                            "type": "thinking",
                            "thinking": "need weather first",
                            "signature": "sig_123"
                        },
                        {
                            "type": "tool_use",
                            "id": "toolu_1",
                            "name": "lookup_weather",
                            "input": {"city": "Paris"}
                        }
                    ]),
                    extra: HashMap::new(),
                },
                anthropic_translator::PermissiveAnthropicMessage {
                    role: "user".to_string(),
                    content: json!([
                        {
                            "type": "tool_result",
                            "tool_use_id": "toolu_1",
                            "content": "18C"
                        }
                    ]),
                    extra: HashMap::new(),
                },
            ],
            max_tokens: Some(64),
            temperature: None,
            top_p: None,
            top_k: None,
            tools: Some(json!([
                {
                    "name": "lookup_weather",
                    "description": "Look up weather",
                    "input_schema": {
                        "type": "object",
                        "properties": {"city": {"type": "string"}},
                        "required": ["city"]
                    }
                }
            ])),
            tool_choice: Some(json!({"type": "tool", "name": "lookup_weather"})),
            stop_sequences: None,
            stream: Some(false),
            system: Some(json!([
                { "type": "text", "text": "be concise" }
            ])),
            pararouter_provider_account_id: None,
            extra: HashMap::new(),
        },
    )
    .expect("translated request");
    normalize_system_prompt_for_openai_upstream(&mut request);

    let built = openai::build_chat_request(&openai_endpoint(), &request).expect("openai request");
    let body = body_json(&built);
    let messages = body["messages"].as_array().expect("messages array");

    assert_eq!(
        body["tool_choice"],
        json!({
            "type": "function",
            "function": {"name": "lookup_weather"}
        })
    );
    assert_eq!(messages.len(), 4);
    assert_eq!(messages[0]["role"], json!("system"));
    assert_eq!(messages[0]["content"], json!("be concise"));
    assert_eq!(messages[1]["role"], json!("user"));
    assert_eq!(messages[1]["content"], json!("weather in Paris"));
    assert_eq!(messages[2]["role"], json!("assistant"));
    assert_eq!(messages[2]["thinking"], json!("need weather first"));
    assert_eq!(messages[2]["tool_calls"][0]["id"], json!("toolu_1"));
    assert_eq!(
        messages[2]["tool_calls"][0]["function"]["name"],
        json!("lookup_weather")
    );
    assert_eq!(messages[3]["role"], json!("tool"));
    assert_eq!(messages[3]["tool_call_id"], json!("toolu_1"));
    assert_eq!(messages[3]["content"], json!("18C"));
}

#[test]
fn openai_completed_response_renders_as_anthropic_message_with_structured_blocks() {
    let response = CompletedResponse {
        response: ChatResponseFinal {
            model: Some("gpt-4.1".to_string()),
            output_text: Some("Let me check.".to_string()),
            raw: json!({
                "id": "chatcmpl_123",
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "Let me check.",
                        "reasoning_content": "need weather first",
                        "tool_calls": [{
                            "id": "call_123",
                            "type": "function",
                            "function": {
                                "name": "lookup_weather",
                                "arguments": "{\"city\":\"Paris\"}"
                            }
                        }]
                    },
                    "finish_reason": "tool_calls"
                }],
                "usage": {
                    "prompt_tokens": 10,
                    "completion_tokens": 6,
                    "total_tokens": 16
                }
            }),
        },
        report: request_report(
            ProviderKind::OpenAiCompatible,
            HashMap::from([(
                "unigateway.requested_model_alias".to_string(),
                "claude-3-7-sonnet".to_string(),
            )]),
        ),
    };

    let rendered = render_anthropic_chat_session(ProxySession::Completed(response));
    let (_, body) = rendered.into_parts();
    let ProtocolResponseBody::Json(body) = body else {
        panic!("expected json body");
    };

    assert_eq!(body["type"], json!("message"));
    assert_eq!(body["model"], json!("gpt-4.1"));
    assert_eq!(body["stop_reason"], json!("tool_use"));
    assert_eq!(body["content"][0]["type"], json!("thinking"));
    assert_eq!(body["content"][0]["thinking"], json!("need weather first"));
    assert_eq!(body["content"][1]["type"], json!("text"));
    assert_eq!(body["content"][1]["text"], json!("Let me check."));
    assert_eq!(body["content"][2]["type"], json!("tool_use"));
    assert_eq!(body["content"][2]["input"], json!({"city": "Paris"}));
}

#[tokio::test]
async fn anthropic_stream_renders_as_openai_sse_chunks() {
    let (completion_tx, completion_rx) = oneshot::channel();
    assert!(
        completion_tx
            .send(Ok(CompletedResponse {
                response: ChatResponseFinal {
                    model: Some("claude-3-7-sonnet".to_string()),
                    output_text: Some("Hello".to_string()),
                    raw: json!({}),
                },
                report: request_report(ProviderKind::Anthropic, HashMap::new()),
            }))
            .is_ok(),
        "completion sent"
    );

    let streaming = StreamingResponse {
        stream: Box::pin(stream::iter(vec![
            Ok(ChatResponseChunk {
                delta: None,
                raw: json!({
                    "type": "message_start",
                    "message": {
                        "id": "msg_123",
                        "type": "message",
                        "role": "assistant",
                        "model": "claude-3-7-sonnet",
                        "content": []
                    }
                }),
            }),
            Ok(ChatResponseChunk {
                delta: Some("Hello".to_string()),
                raw: json!({
                    "type": "content_block_delta",
                    "delta": {
                        "type": "text_delta",
                        "text": "Hello"
                    }
                }),
            }),
            Ok(ChatResponseChunk {
                delta: None,
                raw: json!({
                    "type": "message_stop"
                }),
            }),
        ])),
        completion: completion_rx,
        request_id: "req_stream_123".to_string(),
        request_metadata: HashMap::new(),
    };

    let rendered = render_openai_chat_session(ProxySession::Streaming(streaming));
    let (_, body) = rendered.into_parts();
    let ProtocolResponseBody::ServerSentEvents(stream) = body else {
        panic!("expected sse body");
    };

    let frames = stream.collect::<Vec<_>>().await;
    let payloads = frames
        .into_iter()
        .map(|item| item.expect("sse chunk"))
        .map(|chunk| String::from_utf8(chunk.to_vec()).expect("utf8 chunk"))
        .collect::<Vec<_>>();

    assert!(payloads
        .iter()
        .any(|chunk| chunk.contains("\"role\":\"assistant\"")));
    assert!(payloads
        .iter()
        .any(|chunk| chunk.contains("\"content\":\"Hello\"")));
    assert!(payloads
        .iter()
        .any(|chunk| chunk.contains("\"finish_reason\":\"stop\"")));
    assert_eq!(
        payloads.last().map(String::as_str),
        Some("data: [DONE]\n\n")
    );
}

fn body_json(request: &TransportRequest) -> Value {
    serde_json::from_slice(request.body.as_deref().expect("request body")).expect("json body")
}

fn openai_endpoint() -> DriverEndpointContext {
    DriverEndpointContext {
        endpoint_id: "endpoint-openai".to_string(),
        provider_kind: ProviderKind::OpenAiCompatible,
        base_url: "https://api.openai-compatible.test/v1".to_string(),
        api_key: SecretString::new("test-key"),
        model_policy: ModelPolicy::default(),
        metadata: HashMap::new(),
    }
}

fn anthropic_endpoint() -> DriverEndpointContext {
    DriverEndpointContext {
        endpoint_id: "endpoint-anthropic".to_string(),
        provider_kind: ProviderKind::Anthropic,
        base_url: "https://api.anthropic.test/v1".to_string(),
        api_key: SecretString::new("test-key"),
        model_policy: ModelPolicy::default(),
        metadata: HashMap::new(),
    }
}

fn request_report(
    selected_provider: ProviderKind,
    metadata: HashMap<String, String>,
) -> RequestReport {
    RequestReport {
        request_id: "req_123".to_string(),
        correlation_id: "corr_123".to_string(),
        pool_id: None,
        selected_endpoint_id: "endpoint_123".to_string(),
        selected_provider,
        kind: RequestKind::Chat,
        attempts: Vec::new(),
        usage: Some(TokenUsage {
            input_tokens: Some(10),
            output_tokens: Some(6),
            total_tokens: Some(16),
        }),
        latency_ms: 5,
        started_at: SystemTime::UNIX_EPOCH,
        finished_at: SystemTime::UNIX_EPOCH,
        error_kind: None,
        stream: None,
        metadata,
    }
}

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

use unigateway_sdk::core::{
    anthropic_content_to_blocks, is_placeholder_thinking_signature, ClientProtocol, ContentBlock,
    Message, MessageRole, ProxyChatRequest, ThinkingSignatureStatus,
};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PermissiveAnthropicMessage {
    pub role: String,
    pub content: Value,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PermissiveAnthropicRequest {
    pub model: String,
    pub messages: Vec<PermissiveAnthropicMessage>,
    #[serde(rename = "max_tokens")]
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
    #[serde(rename = "top_p")]
    pub top_p: Option<f32>,
    #[serde(rename = "top_k")]
    pub top_k: Option<u32>,
    pub tools: Option<Value>,
    pub tool_choice: Option<Value>,
    pub stop_sequences: Option<Value>,
    pub stream: Option<bool>,
    /// System prompt (Anthropic top-level field) kept verbatim for upstream rendering.
    pub system: Option<Value>,

    /// When set, chat is routed to this provider account for the given logical `model` id.
    #[serde(default)]
    pub pararouter_provider_account_id: Option<String>,

    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

pub fn into_core_chat_request(
    permissive: PermissiveAnthropicRequest,
) -> Result<ProxyChatRequest, String> {
    let PermissiveAnthropicRequest {
        model,
        messages,
        max_tokens,
        temperature,
        top_p,
        top_k,
        tools,
        tool_choice,
        stop_sequences,
        stream,
        system,
        pararouter_provider_account_id,
        extra,
    } = permissive;

    if model.is_empty() {
        return Err("missing required field: model".to_string());
    }
    if messages.is_empty() {
        return Err("missing required field: messages".to_string());
    }

    let raw_messages = serde_json::to_value(&messages)
        .map_err(|error| format!("failed to serialize anthropic messages: {error}"))?;

    let mut core_messages = Vec::with_capacity(messages.len() + usize::from(system.is_some()));
    if let Some(system_blocks) = system_blocks(system.as_ref())? {
        core_messages.push(message_from_blocks(MessageRole::System, system_blocks));
    }

    for message in messages {
        let role = parse_role(&message.role);
        let blocks =
            anthropic_content_to_blocks(&message.content).map_err(|error| error.to_string())?;
        core_messages.push(message_from_blocks(role, blocks));
    }

    let mut metadata = HashMap::new();
    if let Some(hint) = pararouter_provider_account_id.filter(|hint| !hint.trim().is_empty()) {
        metadata.insert("pararouter_provider_account_id".to_string(), hint);
    }

    let mut request = ProxyChatRequest {
        model,
        messages: core_messages,
        temperature,
        top_p,
        top_k,
        max_tokens,
        stop_sequences,
        stream: stream.unwrap_or(false),
        system,
        tools,
        tool_choice,
        raw_messages: Some(raw_messages.clone()),
        extra,
        metadata,
    };

    request.set_client_protocol(ClientProtocol::AnthropicMessages);
    request.set_thinking_signature_status(anthropic_thinking_signature_status(
        request.raw_messages.as_ref(),
    ));

    Ok(request)
}

fn parse_role(role: &str) -> MessageRole {
    match role.to_ascii_lowercase().as_str() {
        "assistant" => MessageRole::Assistant,
        _ => MessageRole::User,
    }
}

fn message_from_blocks(role: MessageRole, blocks: Vec<ContentBlock>) -> Message {
    match blocks.as_slice() {
        [ContentBlock::Text { text }] => Message::text(role, text.clone()),
        _ => Message::from_blocks(role, blocks),
    }
}

fn system_blocks(system: Option<&Value>) -> Result<Option<Vec<ContentBlock>>, String> {
    let Some(system) = system else {
        return Ok(None);
    };

    let blocks = anthropic_content_to_blocks(system).map_err(|error| error.to_string())?;
    if blocks.is_empty() {
        Ok(None)
    } else {
        Ok(Some(blocks))
    }
}

fn anthropic_thinking_signature_status(raw_messages: Option<&Value>) -> ThinkingSignatureStatus {
    let Some(messages) = raw_messages.and_then(Value::as_array) else {
        return ThinkingSignatureStatus::Absent;
    };

    let mut has_verbatim = false;
    for message in messages {
        let Some(blocks) = message.get("content").and_then(Value::as_array) else {
            continue;
        };

        for block in blocks {
            if block.get("type").and_then(Value::as_str) != Some("thinking") {
                continue;
            }

            let Some(signature) = block
                .get("signature")
                .and_then(Value::as_str)
                .filter(|signature| !signature.is_empty())
            else {
                continue;
            };

            if is_placeholder_thinking_signature(signature) {
                return ThinkingSignatureStatus::Placeholder;
            }
            has_verbatim = true;
        }
    }

    if has_verbatim {
        ThinkingSignatureStatus::Verbatim
    } else {
        ThinkingSignatureStatus::Absent
    }
}

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

use unigateway_sdk::core::{
    openai_message_to_content_blocks, ClientProtocol, ContentBlock, Message, MessageRole,
    ProxyChatRequest, ThinkingSignatureStatus,
};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PermissiveChatMessage {
    pub role: Option<String>,
    pub content: Option<Value>,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PermissiveChatRequest {
    pub model: Option<String>,
    pub messages: Option<Vec<PermissiveChatMessage>>,
    pub temperature: Option<f32>,
    pub top_p: Option<f32>,
    pub top_k: Option<u32>,
    pub max_tokens: Option<u32>,
    pub stop: Option<Value>,
    pub stream: Option<bool>,
    pub tools: Option<Value>,
    pub tool_choice: Option<Value>,
    /// When set, chat is routed to this provider account for the given logical `model` id.
    #[serde(default)]
    pub pararouter_provider_account_id: Option<String>,

    // Unknown OpenAI-compatible top-level fields are forwarded through UniGateway extra passthrough.
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

pub fn into_core_chat_request(
    permissive: PermissiveChatRequest,
) -> Result<ProxyChatRequest, String> {
    let PermissiveChatRequest {
        model,
        messages,
        temperature,
        top_p,
        top_k,
        max_tokens,
        stop,
        stream,
        tools,
        tool_choice,
        pararouter_provider_account_id: _,
        extra,
    } = permissive;

    let model = model.unwrap_or_default();
    if model.is_empty() {
        return Err("missing required field: model".to_string());
    }

    let raw_messages = messages.unwrap_or_default();
    if raw_messages.is_empty() {
        return Err("missing required field: messages".to_string());
    }

    let raw_messages_value = serde_json::to_value(&raw_messages)
        .map_err(|error| format!("failed to serialize openai raw messages: {error}"))?;
    let raw_message_values = raw_messages_value
        .as_array()
        .ok_or_else(|| "openai raw messages must serialize to an array".to_string())?;

    let mut core_messages = Vec::with_capacity(raw_messages.len());
    for (message, raw_message_value) in raw_messages.iter().zip(raw_message_values.iter()) {
        let role = parse_role(message.role.as_deref());
        let blocks = openai_message_to_content_blocks(raw_message_value)
            .map_err(|error| error.to_string())?;
        core_messages.push(message_from_blocks(role, blocks));
    }

    let mut request = ProxyChatRequest {
        model,
        messages: core_messages,
        temperature,
        top_p,
        top_k,
        max_tokens,
        stop_sequences: stop,
        stream: stream.unwrap_or(false),
        system: None,
        tools,
        tool_choice,
        raw_messages: Some(raw_messages_value),
        extra,
        metadata: HashMap::new(),
    };

    request.mark_openai_raw_messages();
    request.set_client_protocol(ClientProtocol::OpenAiChat);
    request.set_thinking_signature_status(openai_thinking_signature_status(
        request.raw_messages.as_ref(),
    ));

    Ok(request)
}

fn parse_role(role: Option<&str>) -> MessageRole {
    match role.unwrap_or("user").to_ascii_lowercase().as_str() {
        "system" => MessageRole::System,
        "assistant" => MessageRole::Assistant,
        "tool" | "function" => MessageRole::Tool,
        _ => MessageRole::User,
    }
}

fn message_from_blocks(role: MessageRole, blocks: Vec<ContentBlock>) -> Message {
    match blocks.as_slice() {
        [ContentBlock::Text { text }] => Message::text(role, text.clone()),
        _ => Message::from_blocks(role, blocks),
    }
}

fn openai_thinking_signature_status(raw_messages: Option<&Value>) -> ThinkingSignatureStatus {
    let Some(messages) = raw_messages.and_then(Value::as_array) else {
        return ThinkingSignatureStatus::Absent;
    };

    if messages.iter().any(|message| {
        message
            .get("reasoning_content")
            .or_else(|| message.get("thinking"))
            .and_then(Value::as_str)
            .is_some_and(|thinking| !thinking.is_empty())
    }) {
        ThinkingSignatureStatus::Placeholder
    } else {
        ThinkingSignatureStatus::Absent
    }
}

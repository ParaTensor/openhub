use super::{into_core_chat_request, PermissiveChatMessage, PermissiveChatRequest};
use serde_json::{json, Value};
use std::collections::HashMap;
use unigateway_sdk::core::{ClientProtocol, ContentBlock, MessageRole, ThinkingSignatureStatus};

#[test]
fn preserves_unknown_openai_chat_fields_in_extra() {
    let request = PermissiveChatRequest {
        model: Some("gpt-5.5".to_string()),
        messages: Some(vec![PermissiveChatMessage {
            role: Some("user".to_string()),
            content: Some(Value::String("Hello".to_string())),
            extra: HashMap::new(),
        }]),
        temperature: None,
        top_p: None,
        top_k: None,
        max_tokens: None,
        stop: None,
        stream: Some(false),
        tools: None,
        tool_choice: None,
        pararouter_provider_account_id: None,
        extra: HashMap::from([
            ("reasoning_effort".to_string(), json!("low")),
            ("max_completion_tokens".to_string(), json!(2048)),
        ]),
    };

    let translated = into_core_chat_request(request).expect("request should translate");

    assert_eq!(
        translated.extra.get("reasoning_effort"),
        Some(&json!("low"))
    );
    assert_eq!(
        translated.extra.get("max_completion_tokens"),
        Some(&json!(2048))
    );
}

#[test]
fn preserves_openai_raw_messages_and_structured_blocks() {
    let request = PermissiveChatRequest {
        model: Some("gpt-5.5".to_string()),
        messages: Some(vec![
            PermissiveChatMessage {
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
                                    "name": "get_weather",
                                    "arguments": "{\"city\":\"上海\"}"
                                }
                            }
                        ]),
                    ),
                ]),
            },
            PermissiveChatMessage {
                role: Some("tool".to_string()),
                content: Some(json!("{\"temperature_c\":29}")),
                extra: HashMap::from([("tool_call_id".to_string(), json!("call_123"))]),
            },
        ]),
        temperature: None,
        top_p: None,
        top_k: None,
        max_tokens: None,
        stop: None,
        stream: Some(false),
        tools: None,
        tool_choice: None,
        pararouter_provider_account_id: None,
        extra: HashMap::new(),
    };

    let translated = into_core_chat_request(request).expect("request should translate");

    assert_eq!(
        translated.client_protocol(),
        Some(ClientProtocol::OpenAiChat)
    );
    assert!(translated.has_openai_raw_messages());
    assert_eq!(
        translated.thinking_signature_status(),
        Some(ThinkingSignatureStatus::Placeholder)
    );

    assert_eq!(translated.messages[0].role, MessageRole::Assistant);
    assert_eq!(
        translated.messages[0].content,
        vec![
            ContentBlock::Thinking {
                thinking: "need weather first".to_string(),
                signature: None,
            },
            ContentBlock::ToolUse {
                id: "call_123".to_string(),
                name: "get_weather".to_string(),
                input: json!({"city": "上海"}),
            },
        ]
    );
    assert_eq!(translated.messages[1].role, MessageRole::Tool);
    assert_eq!(
        translated.messages[1].content,
        vec![ContentBlock::ToolResult {
            tool_use_id: "call_123".to_string(),
            content: json!("{\"temperature_c\":29}"),
        }]
    );

    let raw_messages = translated
        .raw_messages
        .expect("raw_messages should be preserved");
    assert_eq!(
        raw_messages[0]["tool_calls"][0]["function"]["name"],
        json!("get_weather")
    );
    assert_eq!(raw_messages[1]["tool_call_id"], json!("call_123"));
}

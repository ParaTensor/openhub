use super::{into_core_chat_request, PermissiveAnthropicMessage, PermissiveAnthropicRequest};
use serde_json::{json, Value};
use std::collections::HashMap;
use unigateway_sdk::core::{
    ClientProtocol, ContentBlock, MessageRole, ThinkingSignatureStatus,
    THINKING_SIGNATURE_PLACEHOLDER_VALUE,
};

#[test]
fn preserves_structured_anthropic_messages_and_top_level_system() {
    let request = PermissiveAnthropicRequest {
        model: "claude-3-7-sonnet".to_string(),
        messages: vec![
            PermissiveAnthropicMessage {
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
                        "name": "get_weather",
                        "input": {"city": "Shanghai"}
                    }
                ]),
                extra: HashMap::new(),
            },
            PermissiveAnthropicMessage {
                role: "user".to_string(),
                content: json!([
                    {
                        "type": "tool_result",
                        "tool_use_id": "toolu_1",
                        "content": "29C"
                    }
                ]),
                extra: HashMap::new(),
            },
        ],
        max_tokens: Some(1024),
        temperature: None,
        top_p: None,
        top_k: None,
        tools: Some(json!([{"name": "get_weather"}])),
        tool_choice: Some(json!({"type": "tool", "name": "get_weather"})),
        stop_sequences: None,
        stream: Some(false),
        system: Some(json!([
            {
                "type": "text",
                "text": "be concise"
            }
        ])),
        pararouter_provider_account_id: Some("provider-1".to_string()),
        extra: HashMap::from([("anthropic_beta".to_string(), json!("tools-2024-04-04"))]),
    };

    let translated = into_core_chat_request(request).expect("request should translate");

    assert_eq!(
        translated.client_protocol(),
        Some(ClientProtocol::AnthropicMessages)
    );
    assert_eq!(
        translated.thinking_signature_status(),
        Some(ThinkingSignatureStatus::Verbatim)
    );
    assert_eq!(
        translated.system,
        Some(json!([
            {
                "type": "text",
                "text": "be concise"
            }
        ]))
    );
    assert_eq!(
        translated.extra.get("anthropic_beta"),
        Some(&json!("tools-2024-04-04"))
    );
    assert_eq!(
        translated.metadata.get("pararouter_provider_account_id"),
        Some(&"provider-1".to_string())
    );

    assert_eq!(translated.messages[0].role, MessageRole::System);
    assert_eq!(
        translated.messages[0].content,
        vec![ContentBlock::Text {
            text: "be concise".to_string(),
        }]
    );
    assert_eq!(translated.messages[1].role, MessageRole::Assistant);
    assert_eq!(
        translated.messages[1].content,
        vec![
            ContentBlock::Thinking {
                thinking: "need weather first".to_string(),
                signature: Some("sig_123".to_string()),
            },
            ContentBlock::ToolUse {
                id: "toolu_1".to_string(),
                name: "get_weather".to_string(),
                input: json!({"city": "Shanghai"}),
            },
        ]
    );
    assert_eq!(translated.messages[2].role, MessageRole::User);
    assert_eq!(
        translated.messages[2].content,
        vec![ContentBlock::ToolResult {
            tool_use_id: "toolu_1".to_string(),
            content: json!("29C"),
        }]
    );

    let raw_messages = translated
        .raw_messages
        .expect("raw_messages should be preserved");
    assert_eq!(raw_messages[0]["content"][0]["type"], json!("thinking"));
    assert_eq!(raw_messages[1]["content"][0]["type"], json!("tool_result"));
}

#[test]
fn tracks_placeholder_thinking_signatures() {
    let request = PermissiveAnthropicRequest {
        model: "claude-3-7-sonnet".to_string(),
        messages: vec![PermissiveAnthropicMessage {
            role: "assistant".to_string(),
            content: json!([
                {
                    "type": "thinking",
                    "thinking": "scratchpad",
                    "signature": THINKING_SIGNATURE_PLACEHOLDER_VALUE
                }
            ]),
            extra: HashMap::new(),
        }],
        max_tokens: Some(64),
        temperature: None,
        top_p: None,
        top_k: None,
        tools: None,
        tool_choice: None,
        stop_sequences: None,
        stream: Some(false),
        system: Some(Value::String("be concise".to_string())),
        pararouter_provider_account_id: None,
        extra: HashMap::new(),
    };

    let translated = into_core_chat_request(request).expect("request should translate");

    assert_eq!(
        translated.thinking_signature_status(),
        Some(ThinkingSignatureStatus::Placeholder)
    );
}

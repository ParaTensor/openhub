use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

use unigateway_sdk::core::ProxyEmbeddingsRequest;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PermissiveEmbeddingsRequest {
    pub model: Option<String>,
    pub input: Option<Value>,
    pub encoding_format: Option<String>,
    #[serde(default)]
    pub pararouter_provider_account_id: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

pub fn into_core_embeddings_request(
    permissive: PermissiveEmbeddingsRequest,
) -> Result<ProxyEmbeddingsRequest, String> {
    let model = permissive.model.unwrap_or_default();
    if model.is_empty() {
        return Err("missing required field: model".to_string());
    }

    let mut inputs = Vec::new();
    match permissive.input {
        Some(Value::String(text)) => inputs.push(text),
        Some(Value::Array(items)) => {
            for item in items {
                if let Some(text) = item.as_str() {
                    inputs.push(text.to_string());
                }
            }
        }
        _ => return Err("invalid or missing input".to_string()),
    }

    if inputs.is_empty() {
        return Err("input must not be empty".to_string());
    }

    Ok(ProxyEmbeddingsRequest {
        model,
        input: inputs,
        encoding_format: permissive.encoding_format,
        metadata: HashMap::new(),
    })
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Settings {
    pub server: ServerSettings,
    pub database: DatabaseSettings,
    pub llm_backend: LlmBackendSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerSettings {
    pub host: String,
    pub port: u16,
}

impl Default for ServerSettings {
    fn default() -> Self {
        Self {
            host: "0.0.0.0".to_string(),
            port: 3000,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseSettings {
    pub url: String,
}

impl Default for DatabaseSettings {
    fn default() -> Self {
        Self {
            url: "sqlite://gateway.db".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum LlmBackendSettings {
    OpenAI {
        api_key: String,
        base_url: Option<String>,
        region: Option<String>,
        model: String,
    },
    Anthropic {
        api_key: String,
        region: Option<String>,
        model: String,
    },
    Ollama {
        base_url: Option<String>,
        region: Option<String>,
        model: String,
    },
    Zhipu {
        api_key: String,
        base_url: Option<String>,
        region: Option<String>,
        model: String,
    },
    Aliyun {
        api_key: String,
        region: Option<String>,
        model: String,
    },
    Volcengine {
        api_key: String,
        region: Option<String>,
        model: String,
    },
    Tencent {
        api_key: String,
        model: String,
        region: Option<String>,
        secret_id: Option<String>,
        secret_key: Option<String>,
    },
    Longcat {
        api_key: String,
        region: Option<String>,
        model: String,
    },
    Moonshot {
        api_key: String,
        region: Option<String>,
        model: String,
    },
    Minimax {
        api_key: String,
        base_url: Option<String>,
        region: Option<String>,
        model: String,
    },
    DeepSeek {
        api_key: String,
        base_url: Option<String>,
        region: Option<String>,
        model: String,
    },
}

impl Default for LlmBackendSettings {
    fn default() -> Self {
        Self::Ollama {
            base_url: Some("http://localhost:11434".to_string()),
            region: None,
            model: "llama2".to_string(),
        }
    }
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DriverType {
    OpenAI,
    Anthropic,
    Ollama,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuthStrategy {
    Bearer(String),
    Header(String, String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriverConfig {
    pub driver_type: DriverType,
    pub url: String,
    pub auth: Option<AuthStrategy>,
}

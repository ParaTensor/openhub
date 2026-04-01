use crate::engine::{Client, Model, Response};
use crate::settings::LlmBackendSettings;
use anyhow::Result;
use llm_connector::types::Tool;
use llm_connector::StreamFormat;
use tokio_stream::wrappers::UnboundedReceiverStream;

/// Service layer - Business logic for LLM operations
pub struct Service {
    client: Client,
    #[allow(dead_code)]
    model: String,
}

impl Service {
    /// Create a new service with the specified backend configuration
    pub fn new(config: &LlmBackendSettings) -> Result<Self> {
        let client = Client::new(config)?;
        let model = match config {
            LlmBackendSettings::OpenAI { model, .. } => model.clone(),
            LlmBackendSettings::Anthropic { model, .. } => model.clone(),
            LlmBackendSettings::Ollama { model, .. } => model.clone(),
            LlmBackendSettings::Aliyun { model, .. } => model.clone(),
            LlmBackendSettings::Zhipu { model, .. } => model.clone(),
            LlmBackendSettings::Volcengine { model, .. } => model.clone(),
            LlmBackendSettings::Tencent { model, .. } => model.clone(),
            LlmBackendSettings::Longcat { model, .. } => model.clone(),
            LlmBackendSettings::Moonshot { model, .. } => model.clone(),
            LlmBackendSettings::Minimax { model, .. } => model.clone(),
            LlmBackendSettings::DeepSeek { model, .. } => model.clone(),
        };

        Ok(Self { client, model })
    }

    pub async fn chat(
        &self,
        model: Option<&str>,
        messages: Vec<llm_connector::types::Message>,
        tools: Option<Vec<Tool>>,
    ) -> Result<Response> {
        let backend_model = model.unwrap_or(&self.model);
        self.client.chat(backend_model, messages, tools).await
    }

    pub async fn chat_stream_ollama(
        &self,
        model: Option<&str>,
        messages: Vec<llm_connector::types::Message>,
        format: StreamFormat,
    ) -> Result<UnboundedReceiverStream<String>> {
        let backend_model = model.unwrap_or(&self.model);
        self.client
            .chat_stream_with_format(backend_model, messages, format)
            .await
    }

    pub async fn chat_stream_openai(
        &self,
        model: Option<&str>,
        messages: Vec<llm_connector::types::Message>,
        tools: Option<Vec<Tool>>,
        format: StreamFormat,
    ) -> Result<UnboundedReceiverStream<String>> {
        let backend_model = model.unwrap_or(&self.model);
        self.client
            .chat_stream_openai(backend_model, messages, tools, format)
            .await
    }

    pub async fn list_models(&self) -> Result<Vec<Model>> {
        self.client.list_models().await
    }
}

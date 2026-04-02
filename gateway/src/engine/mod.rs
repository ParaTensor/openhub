pub mod instance;

use crate::settings::LlmBackendSettings;
use anyhow::Result;
use llm_connector::types::{Message, Tool};
use llm_connector::StreamFormat;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tokio_stream::wrappers::UnboundedReceiverStream;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Model {
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response {
    pub content: String,
}

pub struct Client {
    _backend: LlmBackendSettings,
}

impl Client {
    pub fn new(config: &LlmBackendSettings) -> Result<Self> {
        Ok(Self {
            _backend: config.clone(),
        })
    }

    pub async fn chat(
        &self,
        _model: &str,
        _messages: Vec<Message>,
        _tools: Option<Vec<Tool>>,
    ) -> Result<Response> {
        Ok(Response {
            content: "placeholder response".to_string(),
        })
    }

    pub async fn chat_stream_with_format(
        &self,
        _model: &str,
        _messages: Vec<Message>,
        _format: StreamFormat,
    ) -> Result<UnboundedReceiverStream<String>> {
        let (_tx, rx) = mpsc::unbounded_channel();
        Ok(UnboundedReceiverStream::new(rx))
    }

    pub async fn chat_stream_openai(
        &self,
        _model: &str,
        _messages: Vec<Message>,
        _tools: Option<Vec<Tool>>,
        _format: StreamFormat,
    ) -> Result<UnboundedReceiverStream<String>> {
        let (_tx, rx) = mpsc::unbounded_channel();
        Ok(UnboundedReceiverStream::new(rx))
    }

    pub async fn list_models(&self) -> Result<Vec<Model>> {
        Ok(vec![Model {
            id: "gpt-3.5-turbo".to_string(),
        }])
    }
}

pub mod instance;

use crate::settings::LlmBackendSettings;
use anyhow::Result;
use futures_util::StreamExt;
use llm_connector::types::{ChatRequest, Message, Tool};
use llm_connector::{LlmClient, Provider, StreamFormat};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::sync::mpsc;
use tokio_stream::wrappers::UnboundedReceiverStream;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Model {
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response {
    pub content: String,
    pub model: String,
    pub usage: Usage,
    pub tool_calls: Option<serde_json::Value>,
}

pub struct Client {
    backend: LlmBackendSettings,
    llm_client: LlmClient,
}

impl Client {
    fn resolve_base_url(
        configured: Option<&str>,
        default: &'static str,
    ) -> &'static str {
        if configured.is_some() {
            default
        } else {
            default
        }
    }

    pub fn new(config: &LlmBackendSettings) -> Result<Self> {
        let llm_client = match config {
            LlmBackendSettings::OpenAI {
                api_key,
                base_url,
                region,
                ..
            } => {
                let _ = region;
                let url = base_url
                    .as_deref()
                    .unwrap_or(Self::resolve_base_url(None, "https://api.openai.com/v1"));
                LlmClient::openai(api_key, url)?
            }
            LlmBackendSettings::Anthropic {
                api_key, region, ..
            } => {
                let _ = region;
                let url = Self::resolve_base_url(None, "https://api.anthropic.com/v1");
                LlmClient::anthropic(api_key, url)?
            }
            LlmBackendSettings::Aliyun {
                api_key, region, ..
            } => {
                let _ = region;
                let url =
                    Self::resolve_base_url(None, "https://dashscope.aliyuncs.com/compatible-mode/v1");
                LlmClient::aliyun(api_key, url)?
            }
            LlmBackendSettings::Zhipu {
                api_key,
                base_url,
                region,
                ..
            } => {
                let _ = region;
                let url = base_url
                    .as_deref()
                    .unwrap_or(Self::resolve_base_url(None, "https://open.bigmodel.cn/api/paas/v4"));
                LlmClient::zhipu_openai_compatible(api_key, url)?
            }
            LlmBackendSettings::Volcengine {
                api_key, region, ..
            } => {
                let _ = region;
                let url = Self::resolve_base_url(None, "https://ark.cn-beijing.volces.com/api/v3");
                LlmClient::volcengine(api_key, url)?
            }
            LlmBackendSettings::Tencent {
                secret_id,
                secret_key,
                region,
                ..
            } => {
                let sid = secret_id
                    .as_ref()
                    .ok_or_else(|| anyhow::anyhow!("Tencent requires secret_id"))?;
                let skey = secret_key
                    .as_ref()
                    .ok_or_else(|| anyhow::anyhow!("Tencent requires secret_key"))?;
                let _ = region;
                let url = Self::resolve_base_url(None, "https://hunyuan.tencentcloudapi.com");
                LlmClient::tencent(sid, skey, url)?
            }
            LlmBackendSettings::Longcat {
                api_key, region, ..
            } => {
                let _ = region;
                let url = Self::resolve_base_url(None, "https://api.longcat.chat/v1");
                LlmClient::openai_compatible(api_key, url, "longcat")?
            }
            LlmBackendSettings::Moonshot {
                api_key, region, ..
            } => {
                let _ = region;
                let url = Self::resolve_base_url(None, "https://api.moonshot.cn/v1");
                LlmClient::openai_compatible(api_key, url, "moonshot")?
            }
            LlmBackendSettings::Minimax {
                api_key,
                base_url,
                region,
                ..
            } => {
                let _ = region;
                let url = base_url
                    .as_deref()
                    .unwrap_or(Self::resolve_base_url(None, "https://api.minimaxi.com/v1"));
                LlmClient::openai_compatible(api_key, url, "minimax")?
            }
            LlmBackendSettings::DeepSeek {
                api_key,
                base_url,
                region,
                ..
            } => {
                let _ = region;
                let url = base_url
                    .as_deref()
                    .unwrap_or(Self::resolve_base_url(None, "https://api.deepseek.com/v1"));
                LlmClient::openai_compatible(api_key, url, "deepseek")?
            }
            LlmBackendSettings::Ollama {
                base_url, region, ..
            } => {
                let _ = region;
                let url = base_url
                    .as_deref()
                    .unwrap_or(Self::resolve_base_url(None, "http://localhost:11434"));
                LlmClient::ollama(url)?
            }
        };

        Ok(Self {
            backend: config.clone(),
            llm_client,
        })
    }

    pub async fn chat(
        &self,
        model: &str,
        messages: Vec<Message>,
        tools: Option<Vec<Tool>>,
    ) -> Result<Response> {
        let request = ChatRequest {
            model: model.to_string(),
            messages,
            tools,
            ..Default::default()
        };

        let response = self
            .llm_client
            .chat(&request)
            .await
            .map_err(anyhow::Error::new)?;

        let (prompt_tokens, completion_tokens, total_tokens) = response.get_usage_safe();

        let (content, tool_calls) = if let Some(choice) = response.choices.first() {
            let msg = &choice.message;
            let content = if msg.is_text_only() && !msg.content_as_text().is_empty() {
                msg.content_as_text()
            } else if let Some(reasoning) = msg.reasoning_any() {
                reasoning.to_string()
            } else {
                msg.content_as_text()
            };

            let tool_calls = msg
                .tool_calls
                .as_ref()
                .and_then(|tc| serde_json::to_value(tc).ok());
            (content, tool_calls)
        } else if !response.content.is_empty() {
            (response.content.clone(), None)
        } else {
            (String::new(), None)
        };

        let model = if response.model.is_empty() {
            model.to_string()
        } else {
            response.model
        };

        Ok(Response {
            content,
            model,
            usage: Usage {
                prompt_tokens,
                completion_tokens,
                total_tokens,
            },
            tool_calls,
        })
    }

    async fn chat_stream_internal(
        &self,
        model: &str,
        messages: Vec<Message>,
        tools: Option<Vec<Tool>>,
        format: StreamFormat,
    ) -> Result<UnboundedReceiverStream<String>> {
        let request = ChatRequest {
            model: model.to_string(),
            messages,
            stream: Some(true),
            tools,
            ..Default::default()
        };

        let mut stream = self
            .llm_client
            .chat_stream(&request)
            .await
            .map_err(anyhow::Error::new)?;

        let (tx, rx) = mpsc::unbounded_channel();
        tokio::spawn(async move {
            while let Some(chunk) = stream.next().await {
                let out = match chunk {
                    Ok(stream_chunk) => {
                        let payload = serde_json::to_string(&stream_chunk)
                            .unwrap_or_else(|_| json!({"error": "serialize_chunk"}).to_string());
                        match format {
                            StreamFormat::SSE => format!("data: {}\n\n", payload),
                            StreamFormat::NDJSON => format!("{}\n", payload),
                            StreamFormat::Json => payload,
                        }
                    }
                    Err(err) => {
                        let payload = json!({
                            "error": {
                                "message": err.to_string(),
                                "type": "stream_error"
                            }
                        })
                        .to_string();
                        match format {
                            StreamFormat::SSE => format!("data: {}\n\n", payload),
                            StreamFormat::NDJSON => format!("{}\n", payload),
                            StreamFormat::Json => payload,
                        }
                    }
                };

                if tx.send(out).is_err() {
                    break;
                }
            }

            if matches!(format, StreamFormat::SSE) {
                let _ = tx.send("data: [DONE]\n\n".to_string());
            }
        });

        Ok(UnboundedReceiverStream::new(rx))
    }

    pub async fn chat_stream_with_format(
        &self,
        model: &str,
        messages: Vec<Message>,
        format: StreamFormat,
    ) -> Result<UnboundedReceiverStream<String>> {
        self.chat_stream_internal(model, messages, None, format).await
    }

    pub async fn chat_stream_openai(
        &self,
        model: &str,
        messages: Vec<Message>,
        tools: Option<Vec<Tool>>,
        format: StreamFormat,
    ) -> Result<UnboundedReceiverStream<String>> {
        self.chat_stream_internal(model, messages, tools, format).await
    }

    pub async fn list_models(&self) -> Result<Vec<Model>> {
        if matches!(self.backend, LlmBackendSettings::Ollama { .. }) {
            if let Some(ollama_client) = self.llm_client.as_ollama() {
                if let Ok(models) = ollama_client.models().await {
                    let models = models.into_iter().map(|id| Model { id }).collect::<Vec<_>>();
                    if !models.is_empty() {
                        return Ok(models);
                    }
                }
            }
        }

        let fallback_model = match &self.backend {
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

        Ok(vec![Model { id: fallback_model }])
    }
}

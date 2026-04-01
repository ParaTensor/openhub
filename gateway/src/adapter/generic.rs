use crate::adapter::types::RequestResult;
use crate::adapter::driver::DriverConfig;
use anyhow::Result;

pub async fn send_to_provider(_config: &DriverConfig, _payload: serde_json::Value) -> Result<RequestResult> {
    // Placeholder
    Ok(RequestResult {
        content: "Placeholder response".to_string(),
        usage: None,
    })
}

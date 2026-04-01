use crate::db::{DatabasePool, NewProviderType};
use crate::config::models::ConfigResponse;
use anyhow::Result;
use tracing::{info, warn};

pub struct HubSyncer;

impl HubSyncer {
    pub async fn sync(db: &DatabasePool, remote_config: ConfigResponse) -> Result<()> {
        info!("Synchronizing configuration from Hub...");

        for provider in remote_config.providers {
            let id = provider["name"].as_str().unwrap_or("unknown").to_string();
            let base_url = provider["base_url"].as_str().unwrap_or("").to_string();
            
            match db.get_provider_type(&id).await? {
                Some(_) => {
                    info!("Provider {} already exists, skipping.", id);
                }
                None => {
                    info!("Adding new provider from Hub: {}", id);
                    let pt = NewProviderType {
                        id: id.clone(),
                        label: id.clone(),
                        base_url,
                        models: vec![], // Models would need to be synced separately or provided by Hub
                        driver_type: "openai_compatible".to_string(),
                        enabled: Some(true),
                        sort_order: Some(0),
                        docs_url: None,
                    };
                    db.create_provider_type(pt).await?;
                }
            }
        }
        
        info!("Hub configuration synchronization completed");
        Ok(())
    }
}

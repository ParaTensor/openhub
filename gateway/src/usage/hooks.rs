use futures_util::future::BoxFuture;
use sqlx::{Pool, Postgres};
use std::time::{SystemTime, UNIX_EPOCH};

use unigateway_core::hooks::{AttemptFinishedEvent, AttemptStartedEvent, GatewayHooks};
use unigateway_core::response::RequestReport;

pub struct OpenHubHooks {
    pub db: Pool<Postgres>,
}

impl GatewayHooks for OpenHubHooks {
    fn on_attempt_started(&self, _event: AttemptStartedEvent) -> BoxFuture<'static, ()> {
        // No-op for now
        Box::pin(async {})
    }

    fn on_attempt_finished(&self, _event: AttemptFinishedEvent) -> BoxFuture<'static, ()> {
        // No-op for now
        Box::pin(async {})
    }

    fn on_request_finished(&self, report: RequestReport) -> BoxFuture<'static, ()> {
        let db = self.db.clone();
        
        Box::pin(async move {
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as i64;
                
            let user_id = report.metadata.get("user_id").cloned().unwrap_or_default();
            let model = report.metadata.get("requested_model").cloned().unwrap_or_else(|| "unknown".to_string());
            let tokens = report.usage.as_ref().and_then(|u| u.total_tokens).unwrap_or(0) as i32;
            let latency = report.latency_ms as i32;
            let status = 200; // unigateway_core RequestReport only emits for success paths right now, or errors surface differently
            
            // For now cost is '0', real billing can calculate cost asynchronous from prices
            let cost = "0.0";
            
            // Insert into activity table
            let result = sqlx::query(
                r#"
                INSERT INTO activity (timestamp, model, tokens, latency, status, user_id, cost)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                "#
            )
            .bind(timestamp)
            .bind(model)
            .bind(tokens)
            .bind(latency)
            .bind(status)
            .bind(user_id)
            .bind(cost)
            .execute(&db)
            .await;
            
            if let Err(e) = result {
                tracing::error!("Failed to persist request activity: {}", e);
            }
        })
    }
}

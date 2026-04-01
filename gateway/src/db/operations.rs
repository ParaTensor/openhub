use crate::db::{DatabasePool, ProviderType, NewProviderType};
use anyhow::Result;
use sqlx::Row;

impl DatabasePool {
    pub async fn get_provider_type(&self, id: &str) -> Result<Option<ProviderType>> {
        match self {
            Self::Postgres(pool) => {
                let row = sqlx::query_as::<_, ProviderType>("SELECT * FROM provider_types WHERE id = $1")
                    .bind(id)
                    .fetch_optional(pool)
                    .await?;
                Ok(row)
            }
            Self::Sqlite(pool) => {
                let row = sqlx::query_as::<_, ProviderType>("SELECT * FROM provider_types WHERE id = ?")
                    .bind(id)
                    .fetch_optional(pool)
                    .await?;
                Ok(row)
            }
        }
    }

    pub async fn create_provider_type(&self, pt: NewProviderType) -> Result<()> {
        let models_json = serde_json::to_string(&pt.models)?;
        match self {
            Self::Postgres(pool) => {
                sqlx::query("INSERT INTO provider_types (id, label, base_url, models, driver_type, enabled, sort_order, docs_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)")
                    .bind(pt.id)
                    .bind(pt.label)
                    .bind(pt.base_url)
                    .bind(models_json)
                    .bind(pt.driver_type)
                    .bind(pt.enabled.unwrap_or(true) as i32)
                    .bind(pt.sort_order.unwrap_or(0))
                    .bind(pt.docs_url.unwrap_or_default())
                    .execute(pool)
                    .await?;
            }
            Self::Sqlite(pool) => {
                sqlx::query("INSERT INTO provider_types (id, label, base_url, models, driver_type, enabled, sort_order, docs_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
                    .bind(pt.id)
                    .bind(pt.label)
                    .bind(pt.base_url)
                    .bind(models_json)
                    .bind(pt.driver_type)
                    .bind(pt.enabled.unwrap_or(true) as i32)
                    .bind(pt.sort_order.unwrap_or(0))
                    .bind(pt.docs_url.unwrap_or_default())
                    .execute(pool)
                    .await?;
            }
        }
        Ok(())
    }
}

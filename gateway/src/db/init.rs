use crate::db::pool::DatabasePool;
use anyhow::Result;

pub async fn try_database_with_url(url: Option<&str>) -> Result<DatabasePool> {
    let url = url.unwrap_or("postgresql://localhost:5432/openhub");
    if !url.starts_with("postgres://") && !url.starts_with("postgresql://") {
        anyhow::bail!("DATABASE_URL must be a postgres/postgresql URL");
    }
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
        .connect(url)
        .await?;
    ensure_schema_postgres(&pool).await?;
    Ok(DatabasePool::Postgres(pool))
}

async fn ensure_schema_postgres(pool: &sqlx::Pool<sqlx::Postgres>) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS models (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            provider TEXT NOT NULL,
            description TEXT,
            context TEXT,
            pricing_prompt TEXT,
            pricing_completion TEXT,
            tags JSONB NOT NULL DEFAULT '[]'::jsonb,
            is_popular BOOLEAN NOT NULL DEFAULT FALSE,
            latency TEXT,
            status TEXT NOT NULL DEFAULT 'online'
        );

        CREATE TABLE IF NOT EXISTS provider_types (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            base_url TEXT NOT NULL,
            driver_type TEXT NOT NULL,
            models JSONB NOT NULL DEFAULT '[]'::jsonb,
            enabled BOOLEAN NOT NULL DEFAULT TRUE,
            sort_order INT NOT NULL DEFAULT 0,
            docs_url TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS provider_keys (
            provider TEXT PRIMARY KEY,
            key TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            updated_at BIGINT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_api_keys (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            key TEXT NOT NULL,
            uid TEXT NOT NULL,
            created_at BIGINT NOT NULL,
            last_used TEXT,
            usage TEXT
        );

        CREATE TABLE IF NOT EXISTS activity (
            id BIGSERIAL PRIMARY KEY,
            timestamp BIGINT NOT NULL,
            model TEXT NOT NULL,
            tokens INTEGER NOT NULL DEFAULT 0,
            latency INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 200,
            user_id TEXT,
            cost TEXT
        );

        CREATE TABLE IF NOT EXISTS gateways (
            instance_id TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            last_seen BIGINT NOT NULL
        );
        "#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

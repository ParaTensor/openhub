use crate::db::pool::DatabasePool;
use anyhow::Result;
use sqlx::sqlite::SqliteConnectOptions;
use std::str::FromStr;

pub async fn try_database_with_url(url: Option<&str>) -> Result<DatabasePool> {
    let url = url.unwrap_or("sqlite://gateway.db");
    if url.starts_with("postgres") {
        let pool = sqlx::postgres::PgPoolOptions::new()
            .max_connections(5)
            .connect(url)
            .await?;
        ensure_schema_postgres(&pool).await?;
        Ok(DatabasePool::Postgres(pool))
    } else {
        let sqlite_url = normalize_sqlite_url(url);
        let options = SqliteConnectOptions::from_str(&sqlite_url)?.create_if_missing(true);
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await?;
        ensure_schema_sqlite(&pool).await?;
        Ok(DatabasePool::Sqlite(pool))
    }
}

fn normalize_sqlite_url(url: &str) -> String {
    if url.starts_with("sqlite::") || url.starts_with("sqlite:///") {
        return url.to_string();
    }
    if url.starts_with("sqlite:") {
        return url.to_string();
    }
    if url.starts_with('/') {
        return format!("sqlite://{}", url);
    }
    if url == ":memory:" {
        return "sqlite::memory:".to_string();
    }
    format!("sqlite:{}", url)
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

async fn ensure_schema_sqlite(pool: &sqlx::Pool<sqlx::Sqlite>) -> Result<()> {
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
            tags TEXT NOT NULL DEFAULT '[]',
            is_popular INTEGER NOT NULL DEFAULT 0,
            latency TEXT,
            status TEXT NOT NULL DEFAULT 'online'
        );

        CREATE TABLE IF NOT EXISTS provider_types (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            base_url TEXT NOT NULL,
            driver_type TEXT NOT NULL,
            models TEXT NOT NULL DEFAULT '[]',
            enabled INTEGER NOT NULL DEFAULT 1,
            sort_order INTEGER NOT NULL DEFAULT 0,
            docs_url TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS provider_keys (
            provider TEXT PRIMARY KEY,
            key TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_api_keys (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            key TEXT NOT NULL,
            uid TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            last_used TEXT,
            usage TEXT
        );

        CREATE TABLE IF NOT EXISTS activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
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
            last_seen INTEGER NOT NULL
        );
        "#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

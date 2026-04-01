use crate::db::pool::DatabasePool;
use anyhow::Result;

pub async fn try_database_with_url(url: Option<&str>) -> Result<DatabasePool> {
    let url = url.unwrap_or("sqlite://gateway.db");
    if url.starts_with("postgres") {
        let pool = sqlx::postgres::PgPoolOptions::new()
            .max_connections(5)
            .connect(url)
            .await?;
        Ok(DatabasePool::Postgres(pool))
    } else {
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(5)
            .connect(url)
            .await?;
        Ok(DatabasePool::Sqlite(pool))
    }
}

use anyhow::Result;
use sqlx::{Pool, Postgres};

#[derive(Clone)]
pub enum DatabasePool {
    Postgres(Pool<Postgres>),
}

impl DatabasePool {
    pub async fn ping(&self) -> Result<()> {
        match self {
            Self::Postgres(pool) => {
                sqlx::query("SELECT 1").execute(pool).await?;
            }
        }
        Ok(())
    }

    pub async fn close(&self) {
        match self {
            Self::Postgres(pool) => pool.close().await,
        }
    }
}

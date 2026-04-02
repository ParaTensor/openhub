use anyhow::Result;
use clap::Parser;
use opengateway::cli::{handle_command, Args};
use opengateway::config::{ConfigLoader, ConfigManager, ConfigResponse, HubSyncer, ModelSyncer};
use opengateway::db::init::try_database_with_url;
use opengateway::engine::instance::{get_instance_id, init_instance_id};
use opengateway::pool::PoolManager;
use opengateway::router::build_multi_mode_app;
use opengateway::service::Service;
use opengateway::settings::Settings;
use opengateway::trace::TraceClient;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Serialize, Deserialize, Debug)]
struct RegisterPayload {
    instance_id: String,
    status: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    let _ = dotenvy::dotenv();
    initialize_logging(&args);
    init_instance_id();

    if handle_command(&args).await? {
        return Ok(());
    }

    run_multi_mode(args).await
}

async fn register_with_hub(hub_url: &str, host: &str, port: u16) -> Result<()> {
    let client = reqwest::Client::new();
    let payload = RegisterPayload {
        instance_id: std::env::var("OPENGATEWAY_INSTANCE_ID")
            .unwrap_or_else(|_| format!("gw-{}-{}-{}", get_instance_id(), host, port)),
        status: "online".to_string(),
    };
    let response = client
        .post(format!("{}/api/gateway/register", hub_url))
        .json(&payload)
        .send()
        .await?;
    if !response.status().is_success() {
        return Err(anyhow::anyhow!("register failed: {}", response.status()));
    }
    Ok(())
}

async fn fetch_config_from_hub(hub_url: &str) -> Result<ConfigResponse> {
    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/api/gateway/config", hub_url))
        .send()
        .await?;
    if response.status().is_success() {
        Ok(response.json::<ConfigResponse>().await?)
    } else {
        Err(anyhow::anyhow!("fetch config failed: {}", response.status()))
    }
}

async fn run_multi_mode(args: Args) -> Result<()> {
    let config_manager = ConfigManager::load().await?;
    let mut config = config_manager.get();
    ConfigLoader::merge_cli_args(&mut config, &args);

    let database_url = std::env::var("DATABASE_URL")
        .ok()
        .filter(|v| !v.is_empty())
        .unwrap_or_else(|| config.database.url.clone());
    let db_pool = match try_database_with_url(Some(&database_url)).await {
        Ok(pool) => pool,
        Err(e) => {
            error!("Database initialization failed: {}", e);
            std::process::exit(1);
        }
    };

    if let Err(e) = ModelSyncer::sync(&db_pool).await {
        warn!("Model synchronization failed: {}", e);
    }

    if let Ok(hub_url) = std::env::var("HUB_URL") {
        if let Err(e) = register_with_hub(&hub_url, &config.server.host, config.server.port).await {
            warn!("Failed to register with hub: {}", e);
        } else if let Ok(remote_config) = fetch_config_from_hub(&hub_url).await {
            if let Err(e) = HubSyncer::sync(&db_pool, remote_config).await {
                warn!("Failed to sync hub config: {}", e);
            }
        }
    }

    let pool_manager = Arc::new(PoolManager::new(db_pool.clone()));
    if let Err(e) = pool_manager.init().await {
        warn!("Pool manager init failed: {}", e);
    }
    let _health_check = Arc::clone(&pool_manager).start_health_check();

    let settings = Settings::default();
    let llm_service = Arc::new(tokio::sync::RwLock::new(Service::new(&settings.llm_backend)?));
    let runtime_settings = Arc::new(tokio::sync::RwLock::new(settings));
    let trace = TraceClient::from_env();

    let app = build_multi_mode_app(
        db_pool.clone(),
        Arc::clone(&pool_manager),
        llm_service,
        runtime_settings,
        Arc::new(config.clone()),
        trace,
    );

    let bind_addr = format!("{}:{}", config.server.host, config.server.port);
    info!("OpenGateway starting on http://{}", bind_addr);
    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    pool_manager.shutdown().await;
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}

fn initialize_logging(args: &Args) {
    let log_level = args
        .log_level
        .clone()
        .or_else(|| std::env::var("OPENGATEWAY_LOG_LEVEL").ok())
        .unwrap_or_else(|| "info".to_string());

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new(log_level)),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();
}

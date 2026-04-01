use anyhow::Result;
use clap::Parser;
use opengateway::cli::{handle_command, Args};
use opengateway::config::{ConfigLoader, ConfigManager, ModelSyncer};
use opengateway::db::init::try_database_with_url;
use opengateway::engine::instance::{init_instance_id, INSTANCE_ID};
use opengateway::pool::PoolManager;
use opengateway::router::build_multi_mode_app;
use opengateway::service::Service;
use opengateway::settings::Settings;
use opengateway::trace::TraceClient;
use std::sync::Arc;
use tracing::{error, info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use serde::Serialize;

#[derive(Serialize, Deserialize, Debug)]
struct ConfigResponse {
    providers: Vec<serde_json::Value>,
    keys: Vec<serde_json::Value>,
}

async fn fetch_config_from_hub(hub_url: &str) -> Result<ConfigResponse> {
    let client = reqwest::Client::new();
    info!("Fetching configuration from Hub at {}...", hub_url);
    
    let response = client
        .get(format!("{}/api/gateway/config", hub_url))
        .send()
        .await?;

    if response.status().is_success() {
        let config: ConfigResponse = response.json().await?;
        info!("Successfully fetched configuration from Hub");
        Ok(config)
    } else {
        Err(anyhow::anyhow!("Failed to fetch config: {}", response.status()))
    }
}

async fn run_multi_mode(args: Args) -> Result<()> {
    info!("Multi-provider mode: using SQLite-capable data plane with CLI-only control plane");

    let config_manager = ConfigManager::load().await?;
    let mut config = config_manager.get();
    ConfigLoader::merge_cli_args(&mut config, &args);
    info!("Configuration loaded successfully");

    // Register and Sync with Hub if URL is provided
    if let Ok(hub_url) = std::env::var("HUB_URL") {
        if let Err(e) = register_with_hub(&hub_url).await {
            warn!("Failed to register with Hub: {}", e);
        } else {
            match fetch_config_from_hub(&hub_url).await {
                Ok(remote_config) => {
                    info!("Received remote config: {:?}", remote_config);
                    if let Err(e) = HubSyncer::sync(&db_pool, remote_config).await {
                        warn!("Failed to apply config from Hub: {}", e);
                    }
                }
                Err(e) => warn!("Failed to fetch config from Hub: {}", e),
            }
        }
    }
        Ok(pool) => {
            info!("Database initialized successfully");
            pool
        }
        Err(e) => {
            error!("Database initialization failed: {}", e);
            error!(
                "Please ensure DATABASE_URL is set to a valid SQLite path or URL"
            );
            std::process::exit(1);
        }
    };

    if let Err(e) = ModelSyncer::sync(&db_pool).await {
        warn!("Model synchronization failed: {}. Continuing startup...", e);
    }

    let pool_manager = Arc::new(PoolManager::new(db_pool.clone()));
    if let Err(e) = pool_manager.init().await {
        warn!("Failed to initialize pool manager: {}", e);
    }

    let _health_check_handle = Arc::clone(&pool_manager).start_health_check();
    info!("Background health check started");

    let settings = Settings::default();

    let llm_service = Arc::new(tokio::sync::RwLock::new(Service::new(&settings.llm_backend)?));
    let old_config = Arc::new(tokio::sync::RwLock::new(settings));
    let trace = TraceClient::from_env();

    let app = build_multi_mode_app(
        db_pool.clone(),
        Arc::clone(&pool_manager),
        llm_service,
        old_config,
        Arc::new(config.clone()),
        trace,
    );

    let port = config.server.port;
    let bind_addr = format!("{}:{}", config.server.host, port);

    info!("OpenGateway unified service starting on http://{}", bind_addr);
    info!("LLM API Proxy: http://{}/v1/chat/completions", bind_addr);
    info!("Health check: http://{}/health", bind_addr);

    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
    info!("OpenGateway is ready to accept connections!");

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
    tracing::info!("Shutdown signal received, starting graceful shutdown...");
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

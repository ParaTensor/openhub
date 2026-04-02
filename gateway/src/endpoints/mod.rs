pub mod admin;
pub mod basic;
pub mod chat;
pub mod control;
pub mod emulators;
pub mod models;
pub mod types;

use axum::{http::StatusCode, Json};
use serde_json::{json, Value};

pub(crate) fn error_response(
    status: StatusCode,
    message: impl Into<String>,
    error_type: &str,
) -> (StatusCode, Json<Value>) {
    (
        status,
        Json(json!({
            "error": {
                "message": message.into(),
                "type": error_type
            }
        })),
    )
}

pub use chat::handle_chat_completions;
pub use models::{handle_get_model, handle_list_models};
pub use types::ProxyState;

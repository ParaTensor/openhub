use axum::{
    extract::Request,
    middleware::Next,
    response::{IntoResponse, Response},
    http::StatusCode,
};
use std::env;

pub async fn admin_auth_middleware(
    req: Request,
    next: Next,
) -> Response {
    let admin_token = env::var("OPENGATEWAY_ADMIN_TOKEN").unwrap_or_default();
    
    if admin_token.is_empty() {
        // If no token is set, admin API is disabled for safety
        return (StatusCode::FORBIDDEN, "Admin API is disabled (OPENGATEWAY_ADMIN_TOKEN not set)").into_response();
    }

    let auth_header = req.headers().get("Authorization");
    
    match auth_header {
        Some(header) => {
            let header_str = header.to_str().unwrap_or("");
            if header_str == format!("Bearer {}", admin_token) || header_str == admin_token {
                next.run(req).await
            } else {
                (StatusCode::UNAUTHORIZED, "Invalid admin token").into_response()
            }
        }
        None => (StatusCode::UNAUTHORIZED, "Missing Authorization header").into_response(),
    }
}

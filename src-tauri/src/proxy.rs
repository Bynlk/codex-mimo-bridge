use axum::{
    extract::State as AxumState,
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::post,
    Json, Router,
};
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::oneshot;
use tower_http::cors::CorsLayer;

use crate::convert::{chat_to_responses, responses_to_chat, ChatCompletionResponse, ResponsesRequest};
use crate::state::{AppState, LogEntry};

/// Shared context passed to every request handler.
#[derive(Clone)]
pub struct ProxyContext {
    pub api_key: String,
    pub target_url: String,
    pub model: Option<String>,
    pub state: Arc<AppState>,
}

/// Handle returned when the proxy server starts. Allows graceful shutdown.
pub struct ProxyHandle {
    pub shutdown_tx: oneshot::Sender<()>,
}

/// Build the axum Router with all proxy routes.
pub fn create_proxy_router(ctx: ProxyContext) -> Router {
    Router::new()
        .route("/v1/responses", post(handle_responses))
        .route("/health", axum::routing::get(handle_health).post(handle_health))
        .layer(CorsLayer::permissive())
        .with_state(ctx)
}

/// Simple health-check endpoint.
async fn handle_health() -> &'static str {
    "ok"
}

/// Main handler: receives a Responses API request, converts it, forwards to
/// the upstream Chat Completions API, converts the response back, and returns it.
async fn handle_responses(
    AxumState(ctx): AxumState<ProxyContext>,
    headers: HeaderMap,
    Json(body): Json<ResponsesRequest>,
) -> Response {
    let start = Instant::now();

    // Convert the Responses API request into a Chat Completions request.
    let mut chat_req = responses_to_chat(&body);

    // Override the model if the proxy context specifies one.
    if let Some(ref model) = ctx.model {
        chat_req.model = model.clone();
    }

    // Determine the authorization header to forward.
    let auth_value = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("Bearer {}", ctx.api_key));

    // Build the upstream URL.
    let upstream_url = format!("{}/v1/chat/completions", ctx.target_url.trim_end_matches('/'));

    // Serialize the request body.
    let request_body = match serde_json::to_string(&chat_req) {
        Ok(b) => b,
        Err(e) => {
            log::error!("Failed to serialize chat request: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Internal error").into_response();
        }
    };

    // Forward the request to the upstream API.
    let client = reqwest::Client::new();
    let upstream_resp = match client
        .post(&upstream_url)
        .header("Authorization", &auth_value)
        .header("Content-Type", "application/json")
        .body(request_body.clone())
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            log::error!("Connection to upstream failed: {}", e);
            let duration_ms = start.elapsed().as_millis() as u64;
            log_request(&ctx, &body, "", 502, duration_ms);
            return (StatusCode::BAD_GATEWAY, "Bad gateway").into_response();
        }
    };

    let status = upstream_resp.status();
    let duration_ms = start.elapsed().as_millis() as u64;

    // Read the response body.
    let resp_text = match upstream_resp.text().await {
        Ok(t) => t,
        Err(e) => {
            log::error!("Failed to read upstream response: {}", e);
            log_request(&ctx, &body, "", 502, duration_ms);
            return (StatusCode::BAD_GATEWAY, "Bad gateway").into_response();
        }
    };

    // If the upstream returned an error, forward it as-is.
    if status.as_u16() >= 400 {
        log_request(&ctx, &body, &resp_text, status.as_u16(), duration_ms);
        return Response::builder()
            .status(status)
            .header("Content-Type", "application/json")
            .body(resp_text.into())
            .unwrap();
    }

    // Parse the upstream response as a ChatCompletionResponse and convert back.
    match serde_json::from_str::<ChatCompletionResponse>(&resp_text) {
        Ok(chat_resp) => {
            let responses_resp = chat_to_responses(&chat_resp);
            let response_body = serde_json::to_string(&responses_resp).unwrap_or_default();
            log_request(&ctx, &body, &response_body, 200, duration_ms);
            Json(responses_resp).into_response()
        }
        Err(e) => {
            log::error!("Failed to parse upstream response: {}", e);
            log_request(&ctx, &body, &resp_text, 502, duration_ms);
            (StatusCode::BAD_GATEWAY, "Bad gateway").into_response()
        }
    }
}

/// Log a completed request to the application state.
fn log_request(
    ctx: &ProxyContext,
    req: &ResponsesRequest,
    response_body: &str,
    status: u16,
    duration_ms: u64,
) {
    let entry = LogEntry {
        id: uuid::Uuid::new_v4().to_string(),
        timestamp: chrono::Utc::now(),
        method: "POST".to_string(),
        path: "/v1/responses".to_string(),
        request_body: serde_json::to_string(req).unwrap_or_default(),
        response_body: response_body.to_string(),
        status,
        duration_ms,
    };
    ctx.state.add_log(entry);
}

/// Start the proxy server on the given port. Returns a handle that can be used
/// to shut down the server gracefully.
pub async fn start_proxy_server(port: u16, ctx: ProxyContext) -> Result<ProxyHandle, String> {
    let addr = format!("127.0.0.1:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .map_err(|e| format!("Failed to bind to {}: {}", addr, e))?;

    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    let router = create_proxy_router(ctx);

    tokio::spawn(async move {
        axum::serve(listener, router)
            .with_graceful_shutdown(async {
                let _ = shutdown_rx.await;
                log::info!("Proxy server shutting down gracefully");
            })
            .await
            .unwrap_or_else(|e| log::error!("Proxy server error: {}", e));
    });

    log::info!("Proxy server started on {}", addr);
    Ok(ProxyHandle { shutdown_tx })
}

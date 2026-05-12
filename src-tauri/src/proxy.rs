use axum::{
    extract::State as AxumState,
    http::{HeaderMap, StatusCode},
    response::{
        sse::{Event, Sse},
        IntoResponse, Response,
    },
    routing::post,
    Json, Router,
};
use futures::stream::Stream;
use std::convert::Infallible;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::oneshot;
use tower_http::cors::CorsLayer;

use crate::convert::{
    chat_chunk_to_responses_event, chat_to_responses, responses_to_chat,
    ChatCompletionChunk, ChatCompletionResponse, ResponsesRequest,
};
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
        .route("/v1/responses/stream", post(handle_responses_stream))
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

/// Type alias for boxed SSE stream to unify different stream sources.
type BoxedSseStream = std::pin::Pin<Box<dyn Stream<Item = Result<Event, Infallible>> + Send>>;

/// Streaming handler: receives a Responses API request, converts it, forwards to
/// the upstream Chat Completions API with `stream: true`, and returns an SSE stream
/// of Responses API stream events.
async fn handle_responses_stream(
    AxumState(ctx): AxumState<ProxyContext>,
    headers: HeaderMap,
    Json(body): Json<ResponsesRequest>,
) -> Sse<BoxedSseStream> {
    // Convert the Responses API request into a Chat Completions request.
    let mut chat_req = responses_to_chat(&body);
    chat_req.stream = Some(true);

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
            return Sse::new(Box::pin(async_stream::stream! {
                yield Ok(Event::default().data(r#"{"error":"internal error"}"#));
            }));
        }
    };

    // Forward the request to the upstream API.
    let client = reqwest::Client::new();
    let upstream_resp = match client
        .post(&upstream_url)
        .header("Authorization", &auth_value)
        .header("Content-Type", "application/json")
        .body(request_body)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            log::error!("Connection to upstream failed: {}", e);
            return Sse::new(Box::pin(async_stream::stream! {
                yield Ok(Event::default().data(r#"{"error":"bad gateway"}"#));
            }));
        }
    };

    if upstream_resp.status().as_u16() >= 400 {
        let status = upstream_resp.status();
        let err_text = upstream_resp.text().await.unwrap_or_default();
        log::error!("Upstream returned error {}: {}", status, err_text);
        let status_code = status.as_u16();
        return Sse::new(Box::pin(async_stream::stream! {
            yield Ok(Event::default().data(format!(r#"{{"error":"upstream error {}"}}"#, status_code)));
        }));
    }

    // Stream the response body from upstream, parse SSE lines, and convert
    // each Chat Completions chunk into Responses API stream events.
    let byte_stream = upstream_resp.bytes_stream();

    let event_stream = async_stream::stream! {
        use futures::StreamExt;

        let mut buffer = String::new();
        let mut pinned = std::pin::pin!(byte_stream);

        while let Some(chunk_result) = pinned.next().await {
            let chunk = match chunk_result {
                Ok(c) => c,
                Err(e) => {
                    log::error!("Error reading upstream stream: {}", e);
                    break;
                }
            };

            buffer.push_str(&String::from_utf8_lossy(&chunk));

            // Process complete lines from the buffer
            while let Some(newline_pos) = buffer.find('\n') {
                let line = buffer[..newline_pos].trim().to_string();
                buffer = buffer[newline_pos + 1..].to_string();

                if line.is_empty() {
                    continue;
                }

                // Check for [DONE] marker
                if line == "data: [DONE]" {
                    yield Ok(Event::default().event("response.completed").data(r#"{"type":"response.completed"}"#));
                    continue;
                }

                // Parse "data: ..." lines
                if let Some(data_str) = line.strip_prefix("data: ") {
                    match serde_json::from_str::<ChatCompletionChunk>(data_str) {
                        Ok(chunk) => {
                            let events = chat_chunk_to_responses_event(&chunk);
                            for evt in events {
                                let event_name = evt.event.clone();
                                let event_data = serde_json::to_string(&evt.data).unwrap_or_default();
                                yield Ok(Event::default().event(&event_name).data(&event_data));
                            }
                        }
                        Err(e) => {
                            log::warn!("Failed to parse SSE chunk: {} (data: {})", e, data_str);
                        }
                    }
                }
            }
        }

        // If we exit the loop without seeing [DONE], emit a final completion event
        yield Ok(Event::default().event("response.completed").data(r#"{"type":"response.completed"}"#));
    };

    let stream: BoxedSseStream = Box::pin(event_stream);
    Sse::new(stream).keep_alive(axum::response::sse::KeepAlive::default())
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

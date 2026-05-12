use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub method: String,
    pub path: String,
    pub request_body: String,
    pub response_body: String,
    pub status: u16,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyStatus {
    pub running: bool,
    pub port: u16,
    pub request_count: usize,
}

pub struct AppState {
    pub logs: Arc<Mutex<Vec<LogEntry>>>,
    pub proxy_running: Arc<Mutex<bool>>,
    pub request_count: Arc<Mutex<usize>>,
}

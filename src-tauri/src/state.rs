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

impl AppState {
    /// Create a new AppState with empty logs, proxy not running, and zero requests.
    pub fn new() -> Self {
        Self {
            logs: Arc::new(Mutex::new(Vec::new())),
            proxy_running: Arc::new(Mutex::new(false)),
            request_count: Arc::new(Mutex::new(0)),
        }
    }

    /// Append a log entry. Keeps only the last 500 entries.
    pub fn add_log(&self, entry: LogEntry) {
        let mut logs = self.logs.lock().unwrap();
        logs.push(entry);
        if logs.len() > 500 {
            let excess = logs.len() - 500;
            logs.drain(0..excess);
        }
        let mut count = self.request_count.lock().unwrap();
        *count += 1;
    }

    /// Return a clone of all log entries.
    pub fn get_logs(&self) -> Vec<LogEntry> {
        self.logs.lock().unwrap().clone()
    }

    /// Clear all logs and reset the request counter.
    pub fn clear_logs(&self) {
        self.logs.lock().unwrap().clear();
        *self.request_count.lock().unwrap() = 0;
    }

    /// Check if the proxy is currently running.
    pub fn is_running(&self) -> bool {
        *self.proxy_running.lock().unwrap()
    }

    /// Set the proxy running state.
    pub fn set_running(&self, running: bool) {
        *self.proxy_running.lock().unwrap() = running;
    }

    /// Get the total number of requests processed.
    pub fn request_count(&self) -> usize {
        *self.request_count.lock().unwrap()
    }
}

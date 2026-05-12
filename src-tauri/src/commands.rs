use crate::config::AppConfig;
#[allow(unused_imports)]
use crate::proxy::{self, ProxyContext, ProxyHandle};
use crate::state::{AppState, LogEntry, ProxyStatus};
use std::sync::Arc;
use tokio::sync::Mutex as AsyncMutex;

/// Managed state held by Tauri, accessible from all IPC commands.
pub struct ManagedState {
    pub app_state: Arc<AppState>,
    pub config: AsyncMutex<AppConfig>,
    pub proxy_handle: AsyncMutex<Option<ProxyHandle>>,
}

impl ManagedState {
    pub fn new() -> Self {
        Self {
            app_state: Arc::new(AppState::new()),
            config: AsyncMutex::new(load_config_from_disk()),
            proxy_handle: AsyncMutex::new(None),
        }
    }
}

fn config_path() -> std::path::PathBuf {
    let dir = dirs::config_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("codex-mimo-bridge");
    std::fs::create_dir_all(&dir).ok();
    dir.join("config.json")
}

fn load_config_from_disk() -> AppConfig {
    let path = config_path();
    if path.exists() {
        let data = std::fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        AppConfig::default()
    }
}

fn save_config_to_disk(config: &AppConfig) {
    let path = config_path();
    if let Ok(data) = serde_json::to_string_pretty(config) {
        std::fs::write(&path, data).ok();
    }
}

#[tauri::command]
pub async fn get_config(state: tauri::State<'_, ManagedState>) -> Result<AppConfig, String> {
    let cfg = state.config.lock().await;
    Ok(cfg.clone())
}

#[tauri::command]
pub async fn save_config(
    state: tauri::State<'_, ManagedState>,
    config: AppConfig,
) -> Result<(), String> {
    save_config_to_disk(&config);
    let mut cfg = state.config.lock().await;
    *cfg = config;
    Ok(())
}

#[tauri::command]
pub async fn start_proxy(state: tauri::State<'_, ManagedState>) -> Result<(), String> {
    // Check if proxy is already running
    {
        let handle = state.proxy_handle.lock().await;
        if handle.is_some() {
            return Err("Proxy is already running".to_string());
        }
    }

    // Read config
    let (api_key, target_url, model, port) = {
        let cfg = state.config.lock().await;
        (
            cfg.api_key.clone(),
            cfg.target_url.clone(),
            cfg.model.clone(),
            cfg.proxy_port,
        )
    };

    if api_key.is_empty() {
        return Err("API key is not configured".to_string());
    }

    let ctx = ProxyContext {
        api_key,
        target_url,
        model: Some(model),
        state: state.app_state.clone(),
    };

    state.app_state.set_running(true);
    let handle = proxy::start_proxy_server(port, ctx).await.map_err(|e| {
        state.app_state.set_running(false);
        e
    })?;

    let mut h = state.proxy_handle.lock().await;
    *h = Some(handle);
    Ok(())
}

#[tauri::command]
pub async fn stop_proxy(state: tauri::State<'_, ManagedState>) -> Result<(), String> {
    let mut handle_guard = state.proxy_handle.lock().await;
    if let Some(handle) = handle_guard.take() {
        handle.shutdown_tx.send(()).ok();
        state.app_state.set_running(false);
        Ok(())
    } else {
        Err("Proxy is not running".to_string())
    }
}

#[tauri::command]
pub async fn get_proxy_status(
    state: tauri::State<'_, ManagedState>,
) -> Result<ProxyStatus, String> {
    let cfg = state.config.lock().await;
    Ok(ProxyStatus {
        running: state.app_state.is_running(),
        port: cfg.proxy_port,
        request_count: state.app_state.request_count(),
    })
}

#[tauri::command]
pub async fn get_logs(state: tauri::State<'_, ManagedState>) -> Result<Vec<LogEntry>, String> {
    Ok(state.app_state.get_logs())
}

#[tauri::command]
pub async fn clear_logs(state: tauri::State<'_, ManagedState>) -> Result<(), String> {
    state.app_state.clear_logs();
    Ok(())
}

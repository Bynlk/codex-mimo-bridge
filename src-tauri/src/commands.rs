use crate::config::AppConfig;
use crate::state::{LogEntry, ProxyStatus};

#[tauri::command]
pub fn get_config() -> AppConfig {
    AppConfig::default()
}

#[tauri::command]
pub fn save_config(config: AppConfig) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn start_proxy() -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn stop_proxy() -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn get_proxy_status() -> ProxyStatus {
    ProxyStatus {
        running: false,
        port: 8742,
        request_count: 0,
    }
}

#[tauri::command]
pub fn get_logs() -> Vec<LogEntry> {
    vec![]
}

#[tauri::command]
pub fn clear_logs() {
}

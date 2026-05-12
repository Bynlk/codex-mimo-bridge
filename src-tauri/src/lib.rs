mod commands;
mod config;
mod convert;
mod proxy;
mod state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_config,
            commands::save_config,
            commands::start_proxy,
            commands::stop_proxy,
            commands::get_proxy_status,
            commands::get_logs,
            commands::clear_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

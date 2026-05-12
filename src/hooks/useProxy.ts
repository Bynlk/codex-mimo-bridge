import { invoke } from "@tauri-apps/api/core";
import type { AppConfig, LogEntry, ProxyStatus } from "../types";

export async function getConfig(): Promise<AppConfig> {
  return await invoke<AppConfig>("get_config");
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await invoke("save_config", { config });
}

export async function startProxy(): Promise<void> {
  await invoke("start_proxy");
}

export async function stopProxy(): Promise<void> {
  await invoke("stop_proxy");
}

export async function getProxyStatus(): Promise<ProxyStatus> {
  return await invoke<ProxyStatus>("get_proxy_status");
}

export async function getLogs(): Promise<LogEntry[]> {
  return await invoke<LogEntry[]>("get_logs");
}

export async function clearLogs(): Promise<void> {
  await invoke("clear_logs");
}

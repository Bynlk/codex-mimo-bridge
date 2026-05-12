# Codex Mimo Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tauri desktop app that proxies OpenAI Codex CLI's Responses API to any Chat Completions compatible API (e.g. mimo), enabling Codex to work with third-party LLM providers.

**Architecture:** A Rust backend (axum) runs an HTTP proxy on `localhost:8742`. It receives Responses API requests from Codex CLI, converts them to Chat Completions format, forwards to the configured third-party API, converts the response back, and returns to Codex. A React frontend provides configuration, monitoring, and log viewing. Tauri bridges frontend and backend.

**Tech Stack:** Tauri 2, Rust (axum, reqwest, serde, tokio), React 19, TypeScript, Vite, Tailwind CSS v4

---

## File Structure

```
codex-mimo-bridge/
├── src-tauri/
│   ├── Cargo.toml                    # Rust dependencies
│   ├── tauri.conf.json               # Tauri config (window, bundle, NSIS)
│   ├── capabilities/
│   │   └── default.json              # Tauri v2 permissions
│   ├── src/
│   │   ├── main.rs                   # Tauri entry, registers commands
│   │   ├── lib.rs                    # Re-exports modules
│   │   ├── proxy.rs                  # Axum HTTP proxy server
│   │   ├── convert.rs                # Responses API <-> Chat Completions conversion
│   │   ├── config.rs                 # App configuration (API key, target URL, model)
│   │   ├── state.rs                  # Shared proxy state (logs, status)
│   │   └── commands.rs               # Tauri IPC commands for frontend
│   └── icons/                        # App icons
├── src/
│   ├── main.tsx                      # React entry
│   ├── App.tsx                       # Root component with routing
│   ├── index.css                     # Tailwind v4 imports
│   ├── components/
│   │   ├── Layout.tsx                # App shell (sidebar + content)
│   │   ├── Dashboard.tsx             # Main dashboard with status
│   │   ├── ConfigPanel.tsx           # API configuration form
│   │   ├── LogViewer.tsx             # Request/response log viewer
│   │   └── StatusBar.tsx             # Proxy status indicator
│   ├── hooks/
│   │   └── useProxy.ts              # Tauri invoke wrapper for proxy ops
│   └── types/
│       └── index.ts                  # Shared TypeScript types
├── index.html                        # Vite HTML entry
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts                # (or CSS-only config for v4)
└── docs/
    └── superpowers/
        └── plans/
            └── 2026-05-13-codex-mimo-bridge.md  # This file
```

---

## Task 1: Environment Setup & Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`
- Create: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Install Rust toolchain to D: drive**

```powershell
# Download and run rustup-init.exe with custom paths
# Set environment variables before installing
[Environment]::SetEnvironmentVariable("RUSTUP_HOME", "D:\rust\rustup", "User")
[Environment]::SetEnvironmentVariable("CARGO_HOME", "D:\rust\cargo", "User")

# Add to PATH
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
[Environment]::SetEnvironmentVariable("PATH", "$currentPath;D:\rust\cargo\bin", "User")

# Refresh current session
$env:RUSTUP_HOME = "D:\rust\rustup"
$env:CARGO_HOME = "D:\rust\cargo"
$env:PATH = "$env:PATH;D:\rust\cargo\bin"
```

- [ ] **Step 2: Install Tauri CLI**

```powershell
cargo install tauri-cli
```

Expected: `tauri-cli` installed to `D:\rust\cargo\bin`

- [ ] **Step 3: Create Vite + React + TypeScript project**

```powershell
cd D:\  # or any location
npm create vite@latest codex-mimo-bridge -- --template react-ts
cd codex-mimo-bridge
npm install
```

- [ ] **Step 4: Install frontend dependencies**

```powershell
npm install @tauri-apps/api@2 @tauri-apps/plugin-shell@2
npm install -D @tauri-apps/cli@2 tailwindcss @tailwindcss/vite
```

- [ ] **Step 5: Initialize Tauri in the project**

```powershell
cargo tauri init
```

When prompted:
- Window title: `Codex Mimo Bridge`
- Frontend dev URL: `http://localhost:1420`
- Frontend build command: `npm run build`
- Frontend dist: `../dist`
- Dev server command: `npm run dev`

- [ ] **Step 6: Configure `src-tauri/Cargo.toml` dependencies**

```toml
[package]
name = "codex-mimo-bridge"
version = "0.1.0"
edition = "2021"

[lib]
name = "codex_mimo_bridge_lib"
crate-type = ["lib", "cdylib", "staticlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
axum = "0.7"
reqwest = { version = "0.12", features = ["json"] }
tower-http = { version = "0.5", features = ["cors"] }
log = "0.4"
env_logger = "0.11"
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
```

- [ ] **Step 7: Configure `vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: ["es2021", "chrome100", "safari13"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
```

- [ ] **Step 8: Configure `src/index.css` for Tailwind v4**

```css
@import "tailwindcss";
```

- [ ] **Step 9: Configure `src-tauri/tauri.conf.json`**

```json
{
  "$schema": "https://raw.githubusercontent.com/nicklasxyz/tauri-v2-schema/refs/heads/main/tauri.conf.schema.json",
  "productName": "Codex Mimo Bridge",
  "version": "0.1.0",
  "identifier": "com.codex-mimo-bridge.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Codex Mimo Bridge",
        "width": 1000,
        "height": 700,
        "resizable": true,
        "center": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "nsis": {
        "installMode": "both"
      }
    }
  }
}
```

- [ ] **Step 10: Create `src-tauri/capabilities/default.json`**

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-open"
  ]
}
```

- [ ] **Step 11: Create minimal `src-tauri/src/main.rs`**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    codex_mimo_bridge_lib::run();
}
```

- [ ] **Step 12: Create minimal `src-tauri/src/lib.rs`**

```rust
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
```

- [ ] **Step 13: Create placeholder modules**

Create empty files so the project compiles:

`src-tauri/src/config.rs`:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub api_key: String,
    pub target_url: String,
    pub model: String,
    pub proxy_port: u16,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            api_key: String::new(),
            target_url: "https://api.openai.com".to_string(),
            model: "gpt-4".to_string(),
            proxy_port: 8742,
        }
    }
}
```

`src-tauri/src/state.rs`:
```rust
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
```

`src-tauri/src/convert.rs`:
```rust
// Placeholder - will be implemented in Task 3
```

`src-tauri/src/proxy.rs`:
```rust
// Placeholder - will be implemented in Task 4
```

`src-tauri/src/commands.rs`:
```rust
use crate::config::AppConfig;
use crate::state::{LogEntry, ProxyStatus};

#[tauri::command]
pub fn get_config() -> AppConfig {
    AppConfig::default()
}

#[tauri::command]
pub fn save_config(config: AppConfig) -> Result<(), String> {
    // TODO: persist config
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
    // TODO
}
```

- [ ] **Step 14: Verify project compiles**

```powershell
npm run build
cargo tauri build --debug 2>&1 | Select-Object -Last 20
```

Expected: Build succeeds with no errors.

- [ ] **Step 15: Commit**

```powershell
git init
git add -A
git commit -m "feat: scaffold Tauri + React + TypeScript project with placeholder modules"
```

---

## Task 2: Frontend UI — Layout & Dashboard

**Files:**
- Create: `src/components/Layout.tsx`, `src/components/Dashboard.tsx`, `src/components/StatusBar.tsx`
- Create: `src/hooks/useProxy.ts`, `src/types/index.ts`
- Modify: `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: Create TypeScript types**

`src/types/index.ts`:
```typescript
export interface AppConfig {
  api_key: string;
  target_url: string;
  model: string;
  proxy_port: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  request_body: string;
  response_body: string;
  status: number;
  duration_ms: number;
}

export interface ProxyStatus {
  running: boolean;
  port: number;
  request_count: number;
}
```

- [ ] **Step 2: Create Tauri invoke hook**

`src/hooks/useProxy.ts`:
```typescript
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
```

- [ ] **Step 3: Create StatusBar component**

`src/components/StatusBar.tsx`:
```tsx
import type { ProxyStatus } from "../types";

interface Props {
  status: ProxyStatus;
  onStart: () => void;
  onStop: () => void;
}

export function StatusBar({ status, onStart, onStop }: Props) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center gap-3">
        <div
          className={`h-3 w-3 rounded-full ${
            status.running ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-neutral-600"
          }`}
        />
        <span className="text-sm font-medium text-neutral-200">
          Proxy {status.running ? "Running" : "Stopped"} on :{status.port}
        </span>
        <span className="text-xs text-neutral-500">
          {status.request_count} requests
        </span>
      </div>
      <button
        onClick={status.running ? onStop : onStart}
        className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
          status.running
            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
            : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
        }`}
      >
        {status.running ? "Stop" : "Start"}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create Dashboard component**

`src/components/Dashboard.tsx`:
```tsx
import { useEffect, useState, useCallback } from "react";
import { StatusBar } from "./StatusBar";
import type { ProxyStatus, LogEntry } from "../types";
import { getProxyStatus, getLogs, startProxy, stopProxy, clearLogs } from "../hooks/useProxy";

export function Dashboard() {
  const [status, setStatus] = useState<ProxyStatus>({ running: false, port: 8742, request_count: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([getProxyStatus(), getLogs()]);
      setStatus(s);
      setLogs(l);
    } catch (e) {
      console.error("Failed to refresh:", e);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleStart = async () => { await startProxy(); await refresh(); };
  const handleStop = async () => { await stopProxy(); await refresh(); };
  const handleClear = async () => { await clearLogs(); await refresh(); };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-neutral-100">Dashboard</h1>
      <StatusBar status={status} onStart={handleStart} onStop={handleStop} />

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-300">Recent Requests</h2>
          <button onClick={handleClear} className="text-xs text-neutral-500 hover:text-neutral-300">
            Clear
          </button>
        </div>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-600">No requests yet</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 rounded-lg bg-neutral-800/50 px-3 py-2">
                <span className={`text-xs font-mono ${log.status < 400 ? "text-emerald-400" : "text-red-400"}`}>
                  {log.status}
                </span>
                <span className="text-xs font-mono text-neutral-400">{log.method}</span>
                <span className="flex-1 truncate text-xs text-neutral-300">{log.path}</span>
                <span className="text-xs text-neutral-500">{log.duration_ms}ms</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create Layout component**

`src/components/Layout.tsx`:
```tsx
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "config", label: "Configuration" },
  { id: "logs", label: "Logs" },
];

export function Layout({ children, activeTab, onTabChange }: Props) {
  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      <aside className="w-56 border-r border-neutral-800 bg-neutral-900/50 p-4">
        <div className="mb-8">
          <h1 className="text-lg font-bold tracking-tight">Codex Mimo Bridge</h1>
          <p className="text-xs text-neutral-500">API Proxy</p>
        </div>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-neutral-800 text-neutral-100"
                  : "text-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 6: Update App.tsx**

`src/App.tsx`:
```tsx
import { useState } from "react";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";

export default function App() {
  const [tab, setTab] = useState("dashboard");

  return (
    <Layout activeTab={tab} onTabChange={setTab}>
      {tab === "dashboard" && <Dashboard />}
      {tab === "config" && <div className="text-neutral-400">Configuration - Task 5</div>}
      {tab === "logs" && <div className="text-neutral-400">Logs - Task 5</div>}
    </Layout>
  );
}
```

- [ ] **Step 7: Update main.tsx**

`src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 8: Verify frontend compiles**

```powershell
npm run build
```

Expected: No TypeScript or build errors.

- [ ] **Step 9: Commit**

```powershell
git add -A
git commit -m "feat: add frontend layout, dashboard, and status bar components"
```

---

## Task 3: API Format Conversion Engine

**Files:**
- Modify: `src-tauri/src/convert.rs`

This is the core of the project. It converts between:
- **Responses API** (what Codex sends): `POST /v1/responses` with `input` array
- **Chat Completions API** (what mimo/other APIs expect): `POST /v1/chat/completions` with `messages` array

- [ ] **Step 1: Implement Responses API request types**

`src-tauri/src/convert.rs` — add at top:
```rust
use serde::{Deserialize, Serialize};
use serde_json::Value;

// ============================================================
// Responses API types (what Codex CLI sends)
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsesRequest {
    pub model: String,
    pub input: Vec<InputItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<ResponseTool>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_output_tokens: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
    #[serde(flatten)]
    pub extra: std::collections::HashMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum InputItem {
    #[serde(rename = "message")]
    Message {
        role: String,
        content: Vec<ContentPart>,
    },
    #[serde(rename = "function_call")]
    FunctionCall {
        id: Option<String>,
        call_id: String,
        name: String,
        arguments: String,
    },
    #[serde(rename = "function_call_output")]
    FunctionCallOutput {
        call_id: String,
        output: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ContentPart {
    #[serde(rename = "input_text")]
    InputText { text: String },
    #[serde(rename = "output_text")]
    OutputText { text: String },
    #[serde(rename = "input_image")]
    InputImage { image_url: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseTool {
    #[serde(rename = "type")]
    pub tool_type: String,
    pub name: String,
    pub description: Option<String>,
    pub parameters: Option<Value>,
}
```

- [ ] **Step 2: Implement Chat Completions request types**

Append to `convert.rs`:
```rust
// ============================================================
// Chat Completions types (what we send to target API)
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<ChatTool>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ChatToolCall>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatToolCall {
    pub id: String,
    #[serde(rename = "type")]
    pub call_type: String,
    pub function: ChatFunction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatFunction {
    pub name: String,
    pub arguments: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatTool {
    #[serde(rename = "type")]
    pub tool_type: String,
    pub function: ChatToolFunction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatToolFunction {
    pub name: String,
    pub description: String,
    pub parameters: Value,
}
```

- [ ] **Step 3: Implement conversion: Responses → Chat Completions**

Append to `convert.rs`:
```rust
// ============================================================
// Conversion: Responses API → Chat Completions API
// ============================================================

pub fn responses_to_chat(req: &ResponsesRequest) -> ChatCompletionRequest {
    let mut messages: Vec<ChatMessage> = Vec::new();

    for item in &req.input {
        match item {
            InputItem::Message { role, content } => {
                // Concatenate content parts into a single string
                let text = content
                    .iter()
                    .map(|part| match part {
                        ContentPart::InputText { text } => text.clone(),
                        ContentPart::OutputText { text } => text.clone(),
                        ContentPart::InputImage { .. } => "[image]".to_string(),
                    })
                    .collect::<Vec<_>>()
                    .join("\n");

                messages.push(ChatMessage {
                    role: role.clone(),
                    content: Some(text),
                    tool_calls: None,
                    tool_call_id: None,
                });
            }
            InputItem::FunctionCall { id, call_id, name, arguments } => {
                // Function calls are assistant-side tool_calls
                let tool_call_id = id.clone().unwrap_or_else(|| call_id.clone());
                messages.push(ChatMessage {
                    role: "assistant".to_string(),
                    content: None,
                    tool_calls: Some(vec![ChatToolCall {
                        id: tool_call_id,
                        call_type: "function".to_string(),
                        function: ChatFunction {
                            name: name.clone(),
                            arguments: arguments.clone(),
                        },
                    }]),
                    tool_call_id: None,
                });
            }
            InputItem::FunctionCallOutput { call_id, output } => {
                // Function outputs become tool role messages
                messages.push(ChatMessage {
                    role: "tool".to_string(),
                    content: Some(output.clone()),
                    tool_calls: None,
                    tool_call_id: Some(call_id.clone()),
                });
            }
        }
    }

    // Convert tools format
    let tools = req.tools.as_ref().map(|tools| {
        tools
            .iter()
            .map(|t| ChatTool {
                tool_type: "function".to_string(),
                function: ChatToolFunction {
                    name: t.name.clone(),
                    description: t.description.clone().unwrap_or_default(),
                    parameters: t.parameters.clone().unwrap_or(serde_json::json!({})),
                },
            })
            .collect()
    });

    ChatCompletionRequest {
        model: req.model.clone(),
        messages,
        tools,
        tool_choice: req.tool_choice.clone(),
        max_tokens: req.max_output_tokens,
        temperature: req.temperature,
        stream: req.stream,
    }
}
```

- [ ] **Step 4: Implement Chat Completions response types**

Append to `convert.rs`:
```rust
// ============================================================
// Chat Completions response types (what target API returns)
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionResponse {
    pub id: String,
    pub object: String,
    pub created: u64,
    pub model: String,
    pub choices: Vec<ChatChoice>,
    pub usage: Option<Usage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatChoice {
    pub index: u64,
    pub message: ChatMessage,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub total_tokens: u64,
}
```

- [ ] **Step 5: Implement Responses API response types**

Append to `convert.rs`:
```rust
// ============================================================
// Responses API response types (what Codex CLI expects back)
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsesResponse {
    pub id: String,
    pub object: String,
    pub created_at: u64,
    pub model: String,
    pub output: Vec<OutputItem>,
    pub usage: Option<ResponseUsage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum OutputItem {
    #[serde(rename = "message")]
    Message {
        id: String,
        role: String,
        content: Vec<OutputContent>,
    },
    #[serde(rename = "function_call")]
    FunctionCall {
        id: String,
        call_id: String,
        name: String,
        arguments: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum OutputContent {
    #[serde(rename = "output_text")]
    OutputText { text: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseUsage {
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub total_tokens: u64,
}
```

- [ ] **Step 6: Implement conversion: Chat Completions → Responses**

Append to `convert.rs`:
```rust
// ============================================================
// Conversion: Chat Completions Response → Responses API Response
// ============================================================

pub fn chat_to_responses(resp: &ChatCompletionResponse) -> ResponsesResponse {
    let mut output: Vec<OutputItem> = Vec::new();

    for choice in &resp.choices {
        let msg = &choice.message;

        // If the model returned tool_calls, emit function_call output items
        if let Some(tool_calls) = &msg.tool_calls {
            for tc in tool_calls {
                output.push(OutputItem::FunctionCall {
                    id: tc.id.clone(),
                    call_id: tc.id.clone(),
                    name: tc.function.name.clone(),
                    arguments: tc.function.arguments.clone(),
                });
            }
        }

        // If the model returned text content, emit a message output item
        if let Some(content) = &msg.content {
            if !content.is_empty() {
                output.push(OutputItem::Message {
                    id: format!("msg_{}", uuid::Uuid::new_v4()),
                    role: msg.role.clone(),
                    content: vec![OutputContent::OutputText {
                        text: content.clone(),
                    }],
                });
            }
        }
    }

    ResponsesResponse {
        id: resp.id.clone(),
        object: "response".to_string(),
        created_at: resp.created,
        model: resp.model.clone(),
        output,
        usage: resp.usage.as_ref().map(|u| ResponseUsage {
            input_tokens: u.prompt_tokens,
            output_tokens: u.completion_tokens,
            total_tokens: u.total_tokens,
        }),
    }
}
```

- [ ] **Step 7: Add unit tests**

Append to `convert.rs`:
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_message_conversion() {
        let req = ResponsesRequest {
            model: "gpt-4".to_string(),
            input: vec![InputItem::Message {
                role: "user".to_string(),
                content: vec![ContentPart::InputText {
                    text: "Hello".to_string(),
                }],
            }],
            tools: None,
            tool_choice: None,
            max_output_tokens: Some(1024),
            temperature: Some(0.7),
            stream: None,
            extra: std::collections::HashMap::new(),
        };

        let chat = responses_to_chat(&req);
        assert_eq!(chat.messages.len(), 1);
        assert_eq!(chat.messages[0].role, "user");
        assert_eq!(chat.messages[0].content.as_deref(), Some("Hello"));
        assert_eq!(chat.max_tokens, Some(1024));
    }

    #[test]
    fn test_function_call_conversion() {
        let req = ResponsesRequest {
            model: "gpt-4".to_string(),
            input: vec![
                InputItem::Message {
                    role: "user".to_string(),
                    content: vec![ContentPart::InputText {
                        text: "Read file".to_string(),
                    }],
                },
                InputItem::FunctionCall {
                    id: Some("call_123".to_string()),
                    call_id: "call_123".to_string(),
                    name: "read_file".to_string(),
                    arguments: r#"{"path":"/tmp/test.txt"}"#.to_string(),
                },
                InputItem::FunctionCallOutput {
                    call_id: "call_123".to_string(),
                    output: "file contents here".to_string(),
                },
            ],
            tools: None,
            tool_choice: None,
            max_output_tokens: None,
            temperature: None,
            stream: None,
            extra: std::collections::HashMap::new(),
        };

        let chat = responses_to_chat(&req);
        assert_eq!(chat.messages.len(), 3);
        assert_eq!(chat.messages[0].role, "user");
        assert_eq!(chat.messages[1].role, "assistant");
        assert!(chat.messages[1].tool_calls.is_some());
        assert_eq!(chat.messages[2].role, "tool");
        assert_eq!(chat.messages[2].tool_call_id.as_deref(), Some("call_123"));
    }

    #[test]
    fn test_tools_conversion() {
        let req = ResponsesRequest {
            model: "gpt-4".to_string(),
            input: vec![],
            tools: Some(vec![ResponseTool {
                tool_type: "function".to_string(),
                name: "read_file".to_string(),
                description: Some("Read a file".to_string()),
                parameters: Some(serde_json::json!({
                    "type": "object",
                    "properties": {
                        "path": {"type": "string"}
                    },
                    "required": ["path"]
                })),
            }]),
            tool_choice: None,
            max_output_tokens: None,
            temperature: None,
            stream: None,
            extra: std::collections::HashMap::new(),
        };

        let chat = responses_to_chat(&req);
        assert!(chat.tools.is_some());
        let tools = chat.tools.unwrap();
        assert_eq!(tools.len(), 1);
        assert_eq!(tools[0].function.name, "read_file");
    }

    #[test]
    fn test_response_conversion_with_tool_calls() {
        let resp = ChatCompletionResponse {
            id: "chatcmpl-123".to_string(),
            object: "chat.completion".to_string(),
            created: 1234567890,
            model: "gpt-4".to_string(),
            choices: vec![ChatChoice {
                index: 0,
                message: ChatMessage {
                    role: "assistant".to_string(),
                    content: None,
                    tool_calls: Some(vec![ChatToolCall {
                        id: "call_456".to_string(),
                        call_type: "function".to_string(),
                        function: ChatFunction {
                            name: "exec_command".to_string(),
                            arguments: r#"{"command":"ls"}"#.to_string(),
                        },
                    }]),
                    tool_call_id: None,
                },
                finish_reason: Some("tool_calls".to_string()),
            }],
            usage: Some(Usage {
                prompt_tokens: 100,
                completion_tokens: 50,
                total_tokens: 150,
            }),
        };

        let responses = chat_to_responses(&resp);
        assert_eq!(responses.output.len(), 1);
        match &responses.output[0] {
            OutputItem::FunctionCall { name, call_id, .. } => {
                assert_eq!(name, "exec_command");
                assert_eq!(call_id, "call_456");
            }
            _ => panic!("Expected FunctionCall output"),
        }
    }

    #[test]
    fn test_response_conversion_with_text() {
        let resp = ChatCompletionResponse {
            id: "chatcmpl-789".to_string(),
            object: "chat.completion".to_string(),
            created: 1234567890,
            model: "gpt-4".to_string(),
            choices: vec![ChatChoice {
                index: 0,
                message: ChatMessage {
                    role: "assistant".to_string(),
                    content: Some("Hello, world!".to_string()),
                    tool_calls: None,
                    tool_call_id: None,
                },
                finish_reason: Some("stop".to_string()),
            }],
            usage: None,
        };

        let responses = chat_to_responses(&resp);
        assert_eq!(responses.output.len(), 1);
        match &responses.output[0] {
            OutputItem::Message { content, .. } => {
                assert_eq!(content.len(), 1);
                match &content[0] {
                    OutputContent::OutputText { text } => assert_eq!(text, "Hello, world!"),
                }
            }
            _ => panic!("Expected Message output"),
        }
    }
}
```

- [ ] **Step 8: Run tests**

```powershell
cd src-tauri
cargo test -- --nocapture
```

Expected: All 5 tests pass.

- [ ] **Step 9: Commit**

```powershell
git add -A
git commit -m "feat: implement Responses API <-> Chat Completions conversion with tests"
```

---

## Task 4: Proxy HTTP Server

**Files:**
- Modify: `src-tauri/src/proxy.rs`, `src-tauri/src/state.rs`

- [ ] **Step 1: Implement proxy server**

`src-tauri/src/proxy.rs`:
```rust
use axum::{
    extract::State as AxumState,
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::post,
    Json, Router,
};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tokio::sync::oneshot;
use tower_http::cors::CorsLayer;

use crate::convert::{
    chat_to_responses, responses_to_chat, ChatCompletionResponse, ResponsesRequest,
};
use crate::state::{AppState, LogEntry};

#[derive(Clone)]
pub struct ProxyContext {
    pub api_key: String,
    pub target_url: String,
    pub model: String,
    pub state: Arc<AppState>,
}

pub struct ProxyHandle {
    pub shutdown_tx: oneshot::Sender<()>,
}

pub fn create_proxy_router(ctx: ProxyContext) -> Router {
    Router::new()
        .route("/v1/responses", post(handle_responses))
        .route("/health", post(handle_health).get(handle_health))
        .layer(CorsLayer::permissive())
        .with_state(ctx)
}

async fn handle_health() -> &'static str {
    "ok"
}

async fn handle_responses(
    AxumState(ctx): AxumState<ProxyContext>,
    headers: HeaderMap,
    Json(req): Json<ResponsesRequest>,
) -> Response {
    let start = Instant::now();
    let request_id = uuid::Uuid::new_v4().to_string();

    // Convert Responses API → Chat Completions API
    let chat_req = responses_to_chat(&req);

    // Override model if configured
    let mut chat_req = chat_req;
    if !ctx.model.is_empty() {
        chat_req.model = ctx.model.clone();
    }

    // Determine target endpoint
    let target = format!("{}/v1/chat/completions", ctx.target_url.trim_end_matches('/'));

    // Build HTTP client
    let client = reqwest::Client::new();
    let mut builder = client.post(&target);

    // Forward auth header
    if let Some(auth) = headers.get("authorization") {
        if let Ok(auth_str) = auth.to_str() {
            builder = builder.header("authorization", auth_str);
        }
    } else if !ctx.api_key.is_empty() {
        builder = builder.header("authorization", format!("Bearer {}", ctx.api_key));
    }

    // Send request
    let req_body = serde_json::to_string(&chat_req).unwrap_or_default();

    let result = builder.json(&chat_req).send().await;

    let duration = start.elapsed().as_millis() as u64;

    match result {
        Ok(resp) => {
            let status = resp.status().as_u16();
            let body_text = resp.text().await.unwrap_or_default();

            // Log the request
            ctx.state.add_log(LogEntry {
                id: request_id,
                timestamp: chrono::Utc::now(),
                method: "POST".to_string(),
                path: "/v1/responses".to_string(),
                request_body: req_body,
                response_body: body_text.clone(),
                status,
                duration_ms: duration,
            });

            if status >= 400 {
                // Forward error as-is
                return (
                    StatusCode::from_u16(status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
                    body_text,
                )
                    .into_response();
            }

            // Parse Chat Completions response and convert back
            match serde_json::from_str::<ChatCompletionResponse>(&body_text) {
                Ok(chat_resp) => {
                    let responses_resp = chat_to_responses(&chat_resp);
                    Json(responses_resp).into_response()
                }
                Err(e) => {
                    log::error!("Failed to parse upstream response: {}", e);
                    (
                        StatusCode::BAD_GATEWAY,
                        format!("Failed to parse upstream response: {}", e),
                    )
                        .into_response()
                }
            }
        }
        Err(e) => {
            log::error!("Proxy request failed: {}", e);

            ctx.state.add_log(LogEntry {
                id: request_id,
                timestamp: chrono::Utc::now(),
                method: "POST".to_string(),
                path: "/v1/responses".to_string(),
                request_body: req_body,
                response_body: format!("Error: {}", e),
                status: 502,
                duration_ms: duration,
            });

            (StatusCode::BAD_GATEWAY, format!("Proxy error: {}", e)).into_response()
        }
    }
}

pub async fn start_proxy_server(
    port: u16,
    ctx: ProxyContext,
) -> Result<ProxyHandle, String> {
    let router = create_proxy_router(ctx);
    let addr = format!("127.0.0.1:{}", port);

    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .map_err(|e| format!("Failed to bind to {}: {}", addr, e))?;

    log::info!("Proxy server listening on {}", addr);

    tokio::spawn(async move {
        axum::serve(listener, router)
            .with_graceful_shutdown(async {
                shutdown_rx.await.ok();
            })
            .await
            .ok();
    });

    Ok(ProxyHandle { shutdown_tx })
}
```

- [ ] **Step 2: Update AppState with helper methods**

Add to `src-tauri/src/state.rs`:
```rust
impl AppState {
    pub fn new() -> Self {
        Self {
            logs: Arc::new(Mutex::new(Vec::new())),
            proxy_running: Arc::new(Mutex::new(false)),
            request_count: Arc::new(Mutex::new(0)),
        }
    }

    pub fn add_log(&self, entry: LogEntry) {
        if let Ok(mut logs) = self.logs.lock() {
            logs.push(entry);
            // Keep only last 500 entries
            if logs.len() > 500 {
                let drain_count = logs.len() - 500;
                logs.drain(0..drain_count);
            }
        }
        if let Ok(mut count) = self.request_count.lock() {
            *count += 1;
        }
    }

    pub fn get_logs(&self) -> Vec<LogEntry> {
        self.logs.lock().map(|l| l.clone()).unwrap_or_default()
    }

    pub fn clear_logs(&self) {
        if let Ok(mut logs) = self.logs.lock() {
            logs.clear();
        }
        if let Ok(mut count) = self.request_count.lock() {
            *count = 0;
        }
    }

    pub fn is_running(&self) -> bool {
        self.proxy_running.lock().map(|r| *r).unwrap_or(false)
    }

    pub fn set_running(&self, running: bool) {
        if let Ok(mut r) = self.proxy_running.lock() {
            *r = running;
        }
    }

    pub fn request_count(&self) -> usize {
        self.request_count.lock().map(|c| *c).unwrap_or(0)
    }
}
```

- [ ] **Step 3: Verify compilation**

```powershell
cd src-tauri
cargo check
```

Expected: No errors.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat: implement axum proxy server with request forwarding and logging"
```

---

## Task 5: Tauri IPC Commands & Frontend Integration

**Files:**
- Modify: `src-tauri/src/commands.rs`, `src-tauri/src/lib.rs`
- Create: `src/components/ConfigPanel.tsx`, `src/components/LogViewer.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement Tauri commands**

`src-tauri/src/commands.rs`:
```rust
use crate::config::AppConfig;
use crate::proxy::{self, ProxyContext, ProxyHandle};
use crate::state::{LogEntry, ProxyStatus, AppState};
use std::sync::Arc;
use tokio::sync::Mutex as AsyncMutex;

// Global state managed by Tauri
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
pub async fn get_config(
    state: tauri::State<'_, ManagedState>,
) -> Result<AppConfig, String> {
    let config = state.config.lock().await;
    Ok(config.clone())
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
pub async fn start_proxy(
    state: tauri::State<'_, ManagedState>,
) -> Result<(), String> {
    let mut handle = state.proxy_handle.lock().await;
    if handle.is_some() {
        return Err("Proxy is already running".to_string());
    }

    let config = state.config.lock().await.clone();
    let ctx = ProxyContext {
        api_key: config.api_key,
        target_url: config.target_url,
        model: config.model,
        state: state.app_state.clone(),
    };

    let h = proxy::start_proxy_server(config.proxy_port, ctx).await?;
    state.app_state.set_running(true);
    *handle = Some(h);
    Ok(())
}

#[tauri::command]
pub async fn stop_proxy(
    state: tauri::State<'_, ManagedState>,
) -> Result<(), String> {
    let mut handle = state.proxy_handle.lock().await;
    if let Some(h) = handle.take() {
        h.shutdown_tx.send(()).ok();
        state.app_state.set_running(false);
    }
    Ok(())
}

#[tauri::command]
pub async fn get_proxy_status(
    state: tauri::State<'_, ManagedState>,
) -> Result<ProxyStatus, String> {
    let config = state.config.lock().await;
    Ok(ProxyStatus {
        running: state.app_state.is_running(),
        port: config.proxy_port,
        request_count: state.app_state.request_count(),
    })
}

#[tauri::command]
pub async fn get_logs(
    state: tauri::State<'_, ManagedState>,
) -> Result<Vec<LogEntry>, String> {
    Ok(state.app_state.get_logs())
}

#[tauri::command]
pub async fn clear_logs(
    state: tauri::State<'_, ManagedState>,
) -> Result<(), String> {
    state.app_state.clear_logs();
    Ok(())
}
```

- [ ] **Step 2: Update lib.rs to use ManagedState**

`src-tauri/src/lib.rs`:
```rust
mod commands;
mod config;
mod convert;
mod proxy;
mod state;

use commands::ManagedState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(ManagedState::new())
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
```

- [ ] **Step 3: Add `dirs` crate dependency**

```powershell
cd src-tauri
cargo add dirs
```

- [ ] **Step 4: Create ConfigPanel component**

`src/components/ConfigPanel.tsx`:
```tsx
import { useEffect, useState } from "react";
import type { AppConfig } from "../types";
import { getConfig, saveConfig } from "../hooks/useProxy";

export function ConfigPanel() {
  const [config, setConfig] = useState<AppConfig>({
    api_key: "",
    target_url: "https://api.openai.com",
    model: "gpt-4",
    proxy_port: 8742,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getConfig().then(setConfig).catch(console.error);
  }, []);

  const handleSave = async () => {
    await saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-100">Configuration</h1>

      <div className="max-w-lg space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-300">Target API URL</label>
          <input
            type="text"
            value={config.target_url}
            onChange={(e) => setConfig({ ...config, target_url: e.target.value })}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
            placeholder="https://api.example.com"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Codex CLI will send requests here: POST {"{url}"}/v1/chat/completions
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-300">API Key</label>
          <input
            type="password"
            value={config.api_key}
            onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
            placeholder="sk-..."
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-300">Model</label>
          <input
            type="text"
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
            placeholder="gpt-4"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-300">Proxy Port</label>
          <input
            type="number"
            value={config.proxy_port}
            onChange={(e) => setConfig({ ...config, proxy_port: parseInt(e.target.value) || 8742 })}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
          />
        </div>

        <button
          onClick={handleSave}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-neutral-100 hover:bg-white/20"
        >
          {saved ? "Saved!" : "Save Configuration"}
        </button>
      </div>

      <div className="max-w-lg rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-300">Codex CLI Config</h2>
        <p className="mb-2 text-xs text-neutral-500">
          Add this to your <code className="text-neutral-400">~/.codex/config.toml</code>:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-neutral-800 p-3 text-xs text-emerald-400">
{`model_provider = "custom"
[model_providers.custom]
base_url = "http://127.0.0.1:${config.proxy_port}/v1"
wire_api = "responses"
requires_openai_auth = true`}
        </pre>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create LogViewer component**

`src/components/LogViewer.tsx`:
```tsx
import { useEffect, useState, useCallback } from "react";
import type { LogEntry } from "../types";
import { getLogs, clearLogs } from "../hooks/useProxy";

export function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const l = await getLogs();
      setLogs(l);
    } catch (e) {
      console.error("Failed to fetch logs:", e);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleClear = async () => {
    await clearLogs();
    setLogs([]);
    setSelected(null);
  };

  const selectedLog = logs.find((l) => l.id === selected);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-100">Request Logs</h1>
        <button
          onClick={handleClear}
          className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
        >
          Clear All
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 space-y-1 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900 p-2">
          {logs.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-600">No requests logged</p>
          ) : (
            [...logs].reverse().map((log) => (
              <button
                key={log.id}
                onClick={() => setSelected(log.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                  selected === log.id ? "bg-neutral-800" : "hover:bg-neutral-800/50"
                }`}
              >
                <span
                  className={`font-mono text-xs ${
                    log.status < 400 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {log.status}
                </span>
                <span className="text-xs text-neutral-400">{log.method}</span>
                <span className="flex-1 truncate text-xs text-neutral-300">{log.path}</span>
                <span className="text-xs text-neutral-600">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-xs text-neutral-500">{log.duration_ms}ms</span>
              </button>
            ))
          )}
        </div>

        {selectedLog && (
          <div className="flex-1 space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <h3 className="text-sm font-semibold text-neutral-300">Request</h3>
            <pre className="max-h-40 overflow-auto rounded-lg bg-neutral-800 p-3 text-xs text-neutral-300">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(selectedLog.request_body), null, 2);
                } catch {
                  return selectedLog.request_body;
                }
              })()}
            </pre>
            <h3 className="text-sm font-semibold text-neutral-300">Response</h3>
            <pre className="max-h-60 overflow-auto rounded-lg bg-neutral-800 p-3 text-xs text-neutral-300">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(selectedLog.response_body), null, 2);
                } catch {
                  return selectedLog.response_body;
                }
              })()}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Update App.tsx with all views**

`src/App.tsx`:
```tsx
import { useState } from "react";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { ConfigPanel } from "./components/ConfigPanel";
import { LogViewer } from "./components/LogViewer";

export default function App() {
  const [tab, setTab] = useState("dashboard");

  return (
    <Layout activeTab={tab} onTabChange={setTab}>
      {tab === "dashboard" && <Dashboard />}
      {tab === "config" && <ConfigPanel />}
      {tab === "logs" && <LogViewer />}
    </Layout>
  );
}
```

- [ ] **Step 7: Build and test**

```powershell
npm run build
cargo tauri build --debug 2>&1 | Select-Object -Last 30
```

Expected: Build succeeds, app launches with all three views.

- [ ] **Step 8: Commit**

```powershell
git add -A
git commit -m "feat: implement Tauri IPC commands and all frontend views"
```

---

## Task 6: Streaming Support

**Files:**
- Modify: `src-tauri/src/convert.rs`, `src-tauri/src/proxy.rs`

- [ ] **Step 1: Add streaming types to convert.rs**

Append to `convert.rs`:
```rust
// ============================================================
// Streaming support
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionChunk {
    pub id: String,
    pub object: String,
    pub created: u64,
    pub model: String,
    pub choices: Vec<ChatChunkChoice>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatChunkChoice {
    pub index: u64,
    pub delta: ChatDelta,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatDelta {
    pub role: Option<String>,
    pub content: Option<String>,
    pub tool_calls: Option<Vec<ChatToolCallDelta>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatToolCallDelta {
    pub index: u64,
    pub id: Option<String>,
    #[serde(rename = "type")]
    pub call_type: Option<String>,
    pub function: Option<ChatFunctionDelta>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatFunctionDelta {
    pub name: Option<String>,
    pub arguments: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsesStreamEvent {
    pub event: String,
    pub data: Value,
}

pub fn chat_chunk_to_responses_event(chunk: &ChatCompletionChunk) -> Vec<ResponsesStreamEvent> {
    let mut events = Vec::new();

    for choice in &chunk.choices {
        // Text delta
        if let Some(content) = &choice.delta.content {
            if !content.is_empty() {
                events.push(ResponsesStreamEvent {
                    event: "response.output_text.delta".to_string(),
                    data: serde_json::json!({
                        "type": "response.output_text.delta",
                        "output_index": choice.index,
                        "content_index": 0,
                        "delta": content,
                    }),
                });
            }
        }

        // Tool call deltas
        if let Some(tool_calls) = &choice.delta.tool_calls {
            for tc in tool_calls {
                if let Some(func) = &tc.function {
                    events.push(ResponsesStreamEvent {
                        event: "response.output_function_call.delta".to_string(),
                        data: serde_json::json!({
                            "type": "response.output_function_call.delta",
                            "output_index": choice.index,
                            "call_id": tc.id,
                            "name": func.name,
                            "arguments": func.arguments,
                        }),
                    });
                }
            }
        }

        // Done event
        if choice.finish_reason.is_some() {
            events.push(ResponsesStreamEvent {
                event: "response.done".to_string(),
                data: serde_json::json!({
                    "type": "response.done",
                    "response": {
                        "id": chunk.id,
                        "object": "response",
                        "created_at": chunk.created,
                        "model": chunk.model,
                        "output": [],
                        "status": "completed",
                    }
                }),
            });
        }
    }

    events
}
```

- [ ] **Step 2: Add streaming route to proxy.rs**

Add streaming handler to `proxy.rs`:
```rust
use axum::response::sse::{Event, Sse};
use futures::stream::Stream;
use std::convert::Infallible;

async fn handle_responses_stream(
    AxumState(ctx): AxumState<ProxyContext>,
    headers: HeaderMap,
    Json(req): Json<ResponsesRequest>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let mut chat_req = responses_to_chat(&req);
    chat_req.stream = Some(true);
    if !ctx.model.is_empty() {
        chat_req.model = ctx.model.clone();
    }

    let target = format!("{}/v1/chat/completions", ctx.target_url.trim_end_matches('/'));
    let client = reqwest::Client::new();
    let mut builder = client.post(&target);

    if let Some(auth) = headers.get("authorization") {
        if let Ok(auth_str) = auth.to_str() {
            builder = builder.header("authorization", auth_str);
        }
    } else if !ctx.api_key.is_empty() {
        builder = builder.header("authorization", format!("Bearer {}", ctx.api_key));
    }

    let resp = builder.json(&chat_req).send().await;

    let stream = async_stream::stream! {
        match resp {
            Ok(resp) => {
                let mut buffer = String::new();
                let mut stream = resp.bytes_stream();

                use futures::StreamExt;
                while let Some(chunk) = stream.next().await {
                    match chunk {
                        Ok(bytes) => {
                            buffer.push_str(&String::from_utf8_lossy(&bytes));

                            while let Some(line_end) = buffer.find('\n') {
                                let line = buffer[..line_end].trim().to_string();
                                buffer = buffer[line_end + 1..].to_string();

                                if line.starts_with("data: ") {
                                    let data = &line[6..];
                                    if data == "[DONE]" {
                                        yield Ok(Event::default().data("[DONE]"));
                                        break;
                                    }

                                    if let Ok(chunk) = serde_json::from_str::<ChatCompletionChunk>(data) {
                                        let events = chat_chunk_to_responses_event(&chunk);
                                        for event in events {
                                            let json = serde_json::to_string(&event.data).unwrap_or_default();
                                            yield Ok(Event::default().event(&event.event).data(json));
                                        }
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            log::error!("Stream error: {}", e);
                            break;
                        }
                    }
                }
            }
            Err(e) => {
                log::error!("Connection error: {}", e);
                let error_event = serde_json::json!({
                    "type": "error",
                    "error": {"message": format!("Proxy error: {}", e)}
                });
                yield Ok(Event::default().event("error").data(serde_json::to_string(&error_event).unwrap()));
            }
        }
    };

    Sse::new(stream).keep_alive(axum::response::sse::KeepAlive::default())
}
```

Update the router to add streaming route:
```rust
pub fn create_proxy_router(ctx: ProxyContext) -> Router {
    Router::new()
        .route("/v1/responses", post(handle_responses))
        .route("/v1/responses/stream", post(handle_responses_stream))
        .route("/health", post(handle_health).get(handle_health))
        .layer(CorsLayer::permissive())
        .with_state(ctx)
}
```

- [ ] **Step 3: Add required dependencies**

```powershell
cd src-tauri
cargo add async-stream futures
```

- [ ] **Step 4: Verify compilation**

```powershell
cargo check
```

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: add SSE streaming support for Responses API"
```

---

## Task 7: App Icon & Packaging Configuration

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Create: `src-tauri/icons/` (various sizes)

- [ ] **Step 1: Generate app icons**

```powershell
# Use Tauri's icon generator (or create placeholder icons)
cargo tauri icon --help 2>$null
# If you have a source image (1024x1024 PNG):
# cargo tauri icon path/to/icon.png

# Otherwise create placeholder icons directory
mkdir src-tauri/icons -Force
```

- [ ] **Step 2: Configure NSIS packaging in tauri.conf.json**

Update `src-tauri/tauri.conf.json`:
```json
{
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "nsis": {
        "installMode": "both",
        "displayLanguageSelector": false,
        "languages": ["SimpChinese", "English"]
      },
      "webviewInstallMode": {
        "type": "embedBootstrapper",
        "silent": true
      }
    }
  }
}
```

- [ ] **Step 3: Build release installer**

```powershell
cargo tauri build
```

Expected output in `src-tauri/target/release/bundle/`:
- `nsis/` — NSIS installer `.exe`
- `msi/` — MSI installer (optional)

- [ ] **Step 4: Verify installer works**

Run the generated NSIS installer and verify:
- App installs correctly
- App launches
- Proxy can start/stop
- Configuration saves/loads

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: configure NSIS packaging and generate app icons"
```

---

## Task 8: README & Documentation

**Files:**
- Create: `README.md`, `.gitignore`

- [ ] **Step 1: Create .gitignore**

```gitignore
# Dependencies
node_modules/

# Rust build
src-tauri/target/

# Vite
dist/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Config (contains API keys)
config.json
```

- [ ] **Step 2: Create README.md**

```markdown
# Codex Mimo Bridge

A Tauri desktop proxy that lets OpenAI Codex CLI work with any Chat Completions compatible API.

## How It Works

```
Codex CLI → localhost:8742/v1/responses (Responses API)
         → Proxy converts format
         → Target API /v1/chat/completions (Chat Completions)
         → Proxy converts back
         → Returns to Codex CLI
```

## Setup

1. Download and install the app
2. Open the app and configure your target API URL and key
3. Start the proxy
4. Configure Codex CLI (`~/.codex/config.toml`):

```toml
model_provider = "custom"
[model_providers.custom]
base_url = "http://127.0.0.1:8742/v1"
wire_api = "responses"
requires_openai_auth = true
```

5. Use Codex normally — requests are proxied to your API

## Features

- Full Tool Use / function calling support
- Request/response logging
- Real-time proxy status
- Configurable target API, model, and port
- Windows NSIS installer + portable exe

## Development

```powershell
# Install dependencies
npm install
cd src-tauri && cargo build && cd ..

# Run in dev mode
cargo tauri dev

# Build release
cargo tauri build
```
```

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "docs: add README and gitignore"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run all Rust tests**

```powershell
cd src-tauri
cargo test
```

Expected: All tests pass.

- [ ] **Step 2: Run frontend type check**

```powershell
npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 3: Run full build**

```powershell
cargo tauri build
```

Expected: NSIS installer and portable exe generated.

- [ ] **Step 4: Manual integration test**

1. Launch the built app
2. Configure a target API (e.g., OpenAI or compatible endpoint)
3. Start the proxy
4. In another terminal, test with curl:

```powershell
curl http://127.0.0.1:8742/v1/responses `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer sk-your-key" `
  -d '{
    "model": "gpt-4",
    "input": [{"type": "message", "role": "user", "content": [{"type": "input_text", "text": "Say hello"}]}],
    "tools": [{"type": "function", "name": "test_fn", "description": "A test function", "parameters": {"type": "object", "properties": {"arg": {"type": "string"}}}}]
  }'
```

Expected: Valid Responses API format returned.

- [ ] **Step 5: Final commit**

```powershell
git add -A
git commit -m "chore: final verification and cleanup"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Environment & scaffolding | All base files |
| 2 | Frontend UI | Layout, Dashboard, StatusBar |
| 3 | Conversion engine | convert.rs (core logic) |
| 4 | Proxy server | proxy.rs (axum HTTP server) |
| 5 | IPC & integration | commands.rs, ConfigPanel, LogViewer |
| 6 | Streaming support | SSE streaming conversion |
| 7 | Packaging | NSIS installer config |
| 8 | Documentation | README |
| 9 | Final verification | End-to-end testing |

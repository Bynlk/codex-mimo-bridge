# Codex Mimo Bridge

A Tauri desktop proxy that lets OpenAI Codex CLI work with any Chat Completions compatible API.

## How It Works

```
Codex CLI -> localhost:8742/v1/responses (Responses API)
          -> Proxy converts format
          -> Target API /v1/chat/completions (Chat Completions)
          -> Proxy converts back
          -> Returns to Codex CLI
```

## Setup

1. Download and install the app (NSIS installer or portable exe)
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
- SSE streaming support
- Request/response logging with detail viewer
- Real-time proxy status monitoring
- Configurable target API, model, and port
- Windows NSIS installer + portable exe
- Dark-themed modern UI

## Development

```powershell
# Prerequisites
# - Node.js 18+
# - Rust (installed on D: drive recommended)
# - Visual Studio Build Tools (C++ workload)

# Install dependencies
npm install

# Run in dev mode
cargo tauri dev

# Build release installer
cargo tauri build
```

## Architecture

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend**: Rust (Tauri 2) with axum HTTP server
- **Proxy**: Listens on `localhost:8742`, converts Responses API to Chat Completions API
- **Config**: Persisted to system config directory (`%APPDATA%/codex-mimo-bridge/config.json`)

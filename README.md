# Codex Mimo Bridge

> Bridge OpenAI Codex CLI with third-party APIs — one command, zero config files.

Codex CLI only supports the OpenAI Responses API format. Most third-party providers (mimo, DeepSeek, Moonshot, etc.) only support Chat Completions. This tool runs a local proxy that automatically translates between the two formats.

```
Codex CLI  →  localhost:8742 (Responses API)  →  Proxy  →  Third-party API (Chat Completions)
```

## Quick Start

```bash
git clone https://github.com/Bynlk/codex-mimo-bridge.git
cd codex-mimo-bridge
node index.js
```

Open **http://127.0.0.1:18742** in your browser, fill in your API key and base URL, click **Start Proxy**.

Then configure Codex to use the proxy:

```toml
# ~/.codex/config.toml
model_provider = "custom"

[model_providers.custom]
base_url = "http://127.0.0.1:8742/v1"
wire_api = "responses"
requires_openai_auth = true
```

## Supported Providers

Any API that implements the OpenAI Chat Completions format:

| Provider | Base URL |
|----------|----------|
| mimo (SGP) | `https://token-plan-sgp.xiaomimimo.com/v1` |
| mimo (CN) | `https://token-plan-cn.xiaomimimo.com/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| Moonshot | `https://api.moonshot.cn/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |

## How It Works

1. You start the proxy on `localhost:8742`
2. Codex sends Responses API requests to the proxy
3. The proxy converts them to Chat Completions format
4. Forwards to your third-party API
5. Converts the response back to Responses API format
6. Returns to Codex

Streaming and non-streaming responses are both supported.

## Project Structure

```
codex-mimo-bridge/
├── index.js      # Web server + API endpoints
├── proxy.js      # Proxy engine (Responses API ↔ Chat Completions)
├── web/
│   └── index.html  # Web UI (single file, no build step)
├── package.json
└── README.md
```

No dependencies. No build step. Just Node.js.

## Web UI

The built-in web UI provides:

- **Configuration** — Enter your API base URL and key
- **Proxy Control** — Start/stop with one click
- **Live Logs** — See every request in real-time
- **Connection Test** — Verify your API key works

## License

MIT

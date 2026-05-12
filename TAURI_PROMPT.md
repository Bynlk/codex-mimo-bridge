## 任务

创建一个名为 `codex-mimo-bridge` 的 Tauri 桌面应用项目。这是一个本地代理工具，将 OpenAI Codex CLI 的 Responses API 格式转换为 Chat Completions 格式，使 Codex 能接入mimo的API。

**关键要求：**
- 必须使用superpower这个skill
- Tauri 及其所有依赖（Rust 工具链、cargo 等）必须安装在 D: 盘
- 前端使用 React + TypeScript + Vite + Tailwind CSS v4，ui设计请使用frontend-design这个skill
- 后端使用 Rust（Tauri）实现代理引擎
- 打包产物为 Windows NSIS 安装包 + 便携版 exe
- 完整支持 Tool Use（function calling）

## 一、环境搭建

```powershell
# 1. 安装 Rust 工具链到 D 盘
# 下载 rustup-init.exe: https://rustup.rs
# 安装时设置：
#   - RUSTUP_HOME=D:\rust\rustup
#   - CARGO_HOME=D:\rust\cargo
#   - 默认工具链: stable-x86_64-pc-windows-msvc

# 2. 设置环境变量（永久生效）
[Environment]::SetEnvironmentVariable("RUSTUP_HOME", "D:\rust\rustup", "User")
[Environment]::SetEnvironmentVariable("CARGO_HOME", "D:\rust\cargo", "User")
[Environment]::SetEnvironmentVariable("PATH", "$env:PATH;D:\rust\cargo\bin", "User")

# 3. 安装 Tauri CLI
cargo install tauri-cli

# 4. 创建项目
npm create vite@latest codex-mimo-bridge -- --template react-ts
cd codex-mimo-bridge
npm install
npm install -D @tauri-apps/cli@2
cargo tauri init
```

Tauri init 时选择：
- Window title: `Codex Mimo Bridge`
- Frontend dev URL: `http://localhost:1420`
- Frontend build command: `npm run build`
- Frontend dist: `../dist`
- Dev server command: `npm run dev`

## 核心逻辑说明

代理运行在 `localhost:8742`，Codex CLI 配置为连接此地址：

```toml
# ~/.codex/config.toml
model_provider = "custom"
[model_providers.custom]
base_url = "http://127.0.0.1:8742/v1"
wire_api = "responses"
requires_openai_auth = true
```

请求流程：
```
Codex CLI → localhost:8742/v1/responses (Responses API)
         → 代理转换格式（含 tools/tool_calls）
         → 第三方 API /v1/chat/completions (Chat Completions)
         → 代理转换回 Responses API 格式
         → 返回给 Codex CLI
```

**最重要的一点：** proxy.rs 中的格式转换必须完整处理 `tools`、`tool_choice`、`function_call`、`function_call_output`、`tool_calls` 这些字段，否则 Codex 无法读取文件或执行命令。
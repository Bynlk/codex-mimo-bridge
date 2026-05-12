# Codex Mimo Bridge

> 让 OpenAI Codex CLI 与任意 Chat Completions 兼容 API 无缝协作的桌面代理桥接工具

## 简介

OpenAI Codex CLI 使用 **Responses API** 格式，而大多数第三方 AI 服务（DeepSeek、通义千问、Moonshot 等）仅支持 **Chat Completions API**。Codex Mimo Bridge 在本地运行一个代理服务器，自动完成两种格式之间的双向转换，让 Codex CLI 可以对接任意兼容 API。

```
Codex CLI ──(Responses API)──> Codex Mimo Bridge ──(Chat Completions)──> 目标 API
```

## 功能

- **格式双向转换** — Responses API ↔ Chat Completions API
- **Tool Use 支持** — 完整的 Function Calling 转换
- **SSE 流式传输** — 实时流式响应转发
- **认证透传** — API Key 直接传递到目标 API
- **实时日志** — 请求/响应详情查看
- **配置管理** — 图形化配置目标 API 和模型
- **中英双语** — 支持中文/英文界面切换

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + TypeScript + Tailwind CSS v4 |
| 后端 | Rust + Tauri 2 + axum + reqwest |
| 打包 | NSIS 安装包 / 便携版 exe |

## 快速开始

### 1. 安装应用

从 [Releases](../../releases) 下载安装包，或克隆源码自行构建。

### 2. 配置目标 API

打开应用，在「配置」页面填写：
- **目标 API 地址** — 如 `https://api.deepseek.com`
- **API 密钥** — 目标服务的 Key
- **模型** — 如 `deepseek-chat`

### 3. 配置 Codex CLI

编辑 `~/.codex/config.toml`：

```toml
model_provider = "custom"

[model_providers.custom]
base_url = "http://127.0.0.1:8742/v1"
wire_api = "responses"
requires_openai_auth = true
```

### 4. 启动使用

在应用中点击「启动」，然后正常使用 Codex CLI 即可。

## 开发

```bash
# 环境要求：Node.js 18+，Rust 1.88+

# 安装依赖
npm install

# 开发模式
npx tauri dev

# 构建发布版
npx tauri build
```

## 项目结构

```
src/                        # 前端 (React + TypeScript)
├── App.tsx                 # 入口
├── i18n/                   # 国际化 (中文/英文)
├── components/
│   ├── Dashboard.tsx       # 仪表盘
│   ├── ConfigPanel.tsx     # 配置面板
│   ├── LogViewer.tsx       # 日志查看器
│   ├── StatusBar.tsx       # 状态栏
│   └── Layout.tsx          # 布局 + 语言切换
└── hooks/useProxy.ts       # Tauri IPC 调用

src-tauri/                  # 后端 (Rust)
├── src/
│   ├── proxy.rs            # axum HTTP 代理服务器
│   ├── convert.rs          # API 格式转换引擎
│   ├── commands.rs         # Tauri IPC 命令
│   ├── state.rs            # 应用状态管理
│   └── config.rs           # 配置持久化
└── tauri.conf.json         # 应用配置
```

## API 转换

代理监听 `localhost:8742`，自动完成以下转换：

| Responses API | Chat Completions API |
|---|---|
| `POST /v1/responses` | `POST /v1/chat/completions` |
| `input` (字符串/数组) | `messages` (标准化格式) |
| `output` (output items) | `choices[].message` |
| `function_call` (嵌套) | `tool_calls[]` (扁平) |
| `response.completed` | 非流式完整响应 |
| `response.output_text.delta` | `choices[].delta.content` |

## 许可证

MIT License

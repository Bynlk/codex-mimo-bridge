# Codex Mimo Bridge

> 一行命令，将 OpenAI Codex CLI 接入第三方 API —— 零依赖，零配置文件。

OpenAI Codex CLI 只支持 Responses API 格式，而大多数第三方服务商（mimo、DeepSeek、Moonshot 等）只支持 Chat Completions。本工具通过本地代理自动完成两种格式的双向转换。

```
Codex CLI  →  localhost:8742 (Responses API)  →  代理  →  第三方 API (Chat Completions)
```

## 快速开始

```bash
git clone https://github.com/Bynlk/codex-mimo-bridge.git
cd codex-mimo-bridge
node index.js
```

打开浏览器访问 **http://127.0.0.1:18742**，填入你的 API Key 和 Base URL，点击 **Start Proxy**。

然后配置 Codex 使用代理：

```toml
# ~/.codex/config.toml
model_provider = "custom"

[model_providers.custom]
base_url = "http://127.0.0.1:8742/v1"
wire_api = "responses"
requires_openai_auth = true
```

## 支持的服务商

任何兼容 OpenAI Chat Completions 格式的 API 均可使用：

| 服务商 | Base URL |
|--------|----------|
| mimo (新加坡) | `https://token-plan-sgp.xiaomimimo.com/v1` |
| mimo (国内) | `https://token-plan-cn.xiaomimimo.com/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| Moonshot | `https://api.moonshot.cn/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |

## 工作原理

1. 本地代理运行在 `localhost:8742`
2. Codex 向代理发送 Responses API 请求
3. 代理将请求转换为 Chat Completions 格式
4. 转发至第三方 API
5. 将响应转换回 Responses API 格式
6. 返回给 Codex

支持流式（streaming）和非流式两种响应模式。

## 项目结构

```
codex-mimo-bridge/
├── index.js      # Web 服务 + API 接口
├── proxy.js      # 代理引擎（Responses API ↔ Chat Completions）
├── web/
│   └── index.html  # Web 界面（单文件，无需构建）
├── package.json
└── README.md
```

零依赖，无需构建，只需要 Node.js。

## Web 界面

内置 Web 管理界面提供：

- **配置管理** —— 填写 API Base URL 和 Key
- **代理控制** —— 一键启动/停止
- **实时日志** —— 查看每个请求的详细信息
- **连接测试** —— 验证 API Key 是否可用

## 许可证

MIT

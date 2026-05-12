export const zh = {
  // Layout
  appTitle: "Codex Bridge",
  appSubtitle: "API 代理",
  navigation: "导航",

  // Tabs
  dashboard: "仪表盘",
  configuration: "配置",
  logs: "日志",

  // Dashboard
  dashboardTitle: "仪表盘",
  dashboardDesc: "监控和控制 API 代理",
  totalRequests: "总请求数",
  successful: "成功",
  errors: "错误",
  recentRequests: "最近请求",
  clear: "清除",
  noRequests: "暂无请求",
  noRequestsHint: "启动代理后，从 Codex CLI 发送请求",

  // StatusBar
  proxyActive: "代理运行中",
  proxyStopped: "代理已停止",
  requests: "次请求",
  start: "启动",
  stop: "停止",

  // ConfigPanel
  configTitle: "配置",
  configDesc: "配置代理目标和连接设置",
  targetUrl: "目标 API 地址",
  targetUrlDesc: "Chat Completions API 的基础 URL",
  apiKey: "API 密钥",
  apiKeyDesc: "目标 API 的认证密钥",
  model: "模型",
  modelDesc: "覆盖模型名称",
  proxyPort: "代理端口",
  proxyPortDesc: "代理服务器的本地端口",
  saved: "已保存",
  saveConfig: "保存配置",
  codexConfig: "Codex CLI 配置",
  codexConfigDesc: "将以下内容添加到",

  // LogViewer
  logTitle: "请求日志",
  logDesc: "查看代理请求和响应详情",
  clearAll: "全部清除",
  noLogs: "暂无日志",
  selectRequest: "选择一条请求查看详情",
  request: "请求",
  response: "响应",
  empty: "（空）",

  // Common
  version: "版本",
} as const;

export type Locale = typeof zh;

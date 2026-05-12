import type { Locale } from "./zh";

export const en: Locale = {
  // Layout
  appTitle: "Codex Bridge",
  appSubtitle: "API Proxy",
  navigation: "Navigation",

  // Tabs
  dashboard: "Dashboard",
  configuration: "Configuration",
  logs: "Logs",

  // Dashboard
  dashboardTitle: "Dashboard",
  dashboardDesc: "Monitor and control the API proxy",
  totalRequests: "Total Requests",
  successful: "Successful",
  errors: "Errors",
  recentRequests: "Recent Requests",
  clear: "Clear",
  noRequests: "No requests yet",
  noRequestsHint: "Start the proxy and send a request from Codex CLI",

  // StatusBar
  proxyActive: "Proxy Active",
  proxyStopped: "Proxy Stopped",
  requests: "requests",
  start: "Start",
  stop: "Stop",

  // ConfigPanel
  configTitle: "Configuration",
  configDesc: "Configure the proxy target and connection settings",
  targetUrl: "Target API URL",
  targetUrlDesc: "The base URL of the Chat Completions API",
  apiKey: "API Key",
  apiKeyDesc: "Authentication key for the target API",
  model: "Model",
  modelDesc: "Override the model name",
  proxyPort: "Proxy Port",
  proxyPortDesc: "Local port for the proxy server",
  saved: "Saved",
  saveConfig: "Save Configuration",
  codexConfig: "Codex CLI Configuration",
  codexConfigDesc: "Add this to your",

  // LogViewer
  logTitle: "Request Logs",
  logDesc: "View proxied request and response details",
  clearAll: "Clear All",
  noLogs: "No logs",
  selectRequest: "Select a request to view details",
  request: "Request",
  response: "Response",
  empty: "(empty)",

  // Common
  version: "v",
} as const;

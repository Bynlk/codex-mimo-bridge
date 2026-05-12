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

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            Request Logs
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            View proxied request and response details
          </p>
        </div>
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            borderColor: "var(--color-border-default)",
            color: "var(--color-text-secondary)",
            background: "var(--color-surface-2)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-3)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-surface-2)"; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          Clear All
        </button>
      </div>

      {/* Content */}
      <div className="flex gap-4" style={{ height: "calc(100vh - 220px)" }}>
        {/* Log list */}
        <div
          className="w-80 flex-shrink-0 overflow-y-auto rounded-xl border"
          style={{
            borderColor: "var(--color-border-default)",
            background: "var(--color-surface-1)",
          }}
        >
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
              <p className="mt-3 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                No logs
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
              {[...logs].reverse().map((log) => {
                const isSelected = selected === log.id;
                return (
                  <button
                    key={log.id}
                    onClick={() => setSelected(log.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{
                      background: isSelected ? "var(--color-surface-3)" : "transparent",
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--color-surface-2)"; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
                      style={{
                        background: log.status < 400 ? "var(--color-accent-dim)" : "var(--color-danger-dim)",
                        color: log.status < 400 ? "var(--color-accent)" : "var(--color-danger)",
                      }}
                    >
                      {log.status}
                    </span>
                    <span className="flex-1 truncate font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {log.path}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div
          className="flex-1 overflow-y-auto rounded-xl border"
          style={{
            borderColor: "var(--color-border-default)",
            background: "var(--color-surface-1)",
          }}
        >
          {!selectedLog ? (
            <div className="flex h-full flex-col items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              <p className="mt-3 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                Select a request to view details
              </p>
            </div>
          ) : (
            <div className="space-y-4 p-5">
              {/* Meta */}
              <div className="flex items-center gap-3">
                <span
                  className="rounded-md px-2 py-1 font-mono text-xs font-medium"
                  style={{
                    background: selectedLog.status < 400 ? "var(--color-accent-dim)" : "var(--color-danger-dim)",
                    color: selectedLog.status < 400 ? "var(--color-accent)" : "var(--color-danger)",
                  }}
                >
                  {selectedLog.status}
                </span>
                <span className="font-mono text-xs font-medium uppercase" style={{ color: "var(--color-text-tertiary)" }}>
                  {selectedLog.method}
                </span>
                <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {selectedLog.path}
                </span>
                <span className="ml-auto font-mono text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                  {selectedLog.duration_ms}ms
                </span>
              </div>

              {/* Request */}
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                  Request
                </h3>
                <pre
                  className="overflow-x-auto rounded-lg border p-4 font-mono text-[11px] leading-relaxed"
                  style={{
                    borderColor: "var(--color-border-subtle)",
                    background: "var(--color-surface-0)",
                    color: "var(--color-text-secondary)",
                    maxHeight: "200px",
                  }}
                >
                  {formatJson(selectedLog.request_body)}
                </pre>
              </div>

              {/* Response */}
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  Response
                </h3>
                <pre
                  className="overflow-x-auto rounded-lg border p-4 font-mono text-[11px] leading-relaxed"
                  style={{
                    borderColor: "var(--color-border-subtle)",
                    background: "var(--color-surface-0)",
                    color: "var(--color-text-secondary)",
                    maxHeight: "400px",
                  }}
                >
                  {formatJson(selectedLog.response_body)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str || "(empty)";
  }
}

import { useEffect, useState, useCallback } from "react";
import { StatusBar } from "./StatusBar";
import type { ProxyStatus, LogEntry } from "../types";
import { getProxyStatus, getLogs, startProxy, stopProxy, clearLogs } from "../hooks/useProxy";
import { useI18n } from "../i18n";

export function Dashboard() {
  const { t } = useI18n();
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

  const recentLogs = [...logs].reverse().slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          {t.dashboardTitle}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
          {t.dashboardDesc}
        </p>
      </div>

      <StatusBar status={status} onStart={handleStart} onStop={handleStop} />

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label={t.totalRequests}
          value={status.request_count.toString()}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          }
        />
        <StatCard
          label={t.successful}
          value={logs.filter((l) => l.status < 400).length.toString()}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          }
          accent
        />
        <StatCard
          label={t.errors}
          value={logs.filter((l) => l.status >= 400).length.toString()}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
          }
          danger
        />
      </div>

      <div
        className="rounded-xl border"
        style={{
          borderColor: "var(--color-border-default)",
          background: "var(--color-surface-1)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-3.5"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          <h2 className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            {t.recentRequests}
          </h2>
          <button
            onClick={handleClear}
            className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            style={{ color: "var(--color-text-tertiary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; e.currentTarget.style.background = "var(--color-surface-3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-tertiary)"; e.currentTarget.style.background = "transparent"; }}
          >
            {t.clear}
          </button>
        </div>

        <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
          {recentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              <p className="mt-3 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                {t.noRequests}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-tertiary)", opacity: 0.6 }}>
                {t.noRequestsHint}
              </p>
            </div>
          ) : (
            recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-4 px-5 py-3 transition-colors"
                style={{ borderColor: "var(--color-border-subtle)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <span
                  className="rounded-md px-2 py-0.5 font-mono text-[11px] font-medium"
                  style={{
                    background: log.status < 400 ? "var(--color-accent-dim)" : "var(--color-danger-dim)",
                    color: log.status < 400 ? "var(--color-accent)" : "var(--color-danger)",
                  }}
                >
                  {log.status}
                </span>
                <span
                  className="font-mono text-[11px] font-medium uppercase"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {log.method}
                </span>
                <span
                  className="flex-1 truncate font-mono text-xs"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {log.path}
                </span>
                <span
                  className="font-mono text-[11px]"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {log.duration_ms}ms
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent, danger }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
  danger?: boolean;
}) {
  const color = danger ? "var(--color-danger)" : accent ? "var(--color-accent)" : "var(--color-text-secondary)";
  const dimColor = danger ? "var(--color-danger-dim)" : accent ? "var(--color-accent-dim)" : "var(--color-surface-3)";

  return (
    <div
      className="rounded-xl border px-4 py-3.5"
      style={{
        borderColor: "var(--color-border-default)",
        background: "var(--color-surface-1)",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: dimColor, color }}
        >
          {icon}
        </div>
        <span className="text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>
          {label}
        </span>
      </div>
      <p
        className="mt-2.5 font-mono text-2xl font-semibold tracking-tight"
        style={{ color: "var(--color-text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}

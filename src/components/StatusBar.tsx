import type { ProxyStatus } from "../types";
import { useI18n } from "../i18n";

interface Props {
  status: ProxyStatus;
  onStart: () => void;
  onStop: () => void;
}

export function StatusBar({ status, onStart, onStop }: Props) {
  const { t } = useI18n();

  return (
    <div
      className="flex items-center justify-between rounded-xl border px-5 py-4"
      style={{
        borderColor: "var(--color-border-default)",
        background: "var(--color-surface-1)",
      }}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{
                background: status.running ? "var(--color-accent)" : "var(--color-text-tertiary)",
              }}
            />
            {status.running && (
              <div
                className="absolute inset-0 h-2.5 w-2.5 animate-ping rounded-full opacity-40"
                style={{ background: "var(--color-accent)" }}
              />
            )}
          </div>
          <span
            className="text-sm font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            {status.running ? t.proxyActive : t.proxyStopped}
          </span>
        </div>

        <div className="h-4 w-px" style={{ background: "var(--color-border-default)" }} />

        <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
          :{status.port}
        </span>

        <div className="h-4 w-px" style={{ background: "var(--color-border-default)" }} />

        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {status.request_count} {t.requests}
          </span>
        </div>
      </div>

      <button
        onClick={status.running ? onStop : onStart}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
        style={{
          background: status.running ? "var(--color-danger-dim)" : "var(--color-accent-dim)",
          color: status.running ? "var(--color-danger)" : "var(--color-accent)",
          border: `1px solid ${status.running ? "rgba(248,113,113,0.2)" : "rgba(52,211,153,0.2)"}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = status.running ? "rgba(248,113,113,0.18)" : "rgba(52,211,153,0.18)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = status.running ? "var(--color-danger-dim)" : "var(--color-accent-dim)";
        }}
      >
        {status.running ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
        )}
        {status.running ? t.stop : t.start}
      </button>
    </div>
  );
}

import { useEffect, useState } from "react";
import type { AppConfig } from "../types";
import { getConfig, saveConfig } from "../hooks/useProxy";
import { useI18n } from "../i18n";

export function ConfigPanel() {
  const { t } = useI18n();
  const [config, setConfig] = useState<AppConfig>({
    api_key: "",
    target_url: "https://api.openai.com",
    model: "gpt-4",
    proxy_port: 8742,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getConfig().then(setConfig).catch(console.error);
  }, []);

  const handleSave = async () => {
    await saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          {t.configTitle}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
          {t.configDesc}
        </p>
      </div>

      <div
        className="rounded-xl border p-5"
        style={{
          borderColor: "var(--color-border-default)",
          background: "var(--color-surface-1)",
        }}
      >
        <div className="space-y-5">
          <FormField label={t.targetUrl} description={t.targetUrlDesc}>
            <input
              type="text"
              value={config.target_url}
              onChange={(e) => setConfig({ ...config, target_url: e.target.value })}
              placeholder="https://api.example.com"
            />
          </FormField>

          <FormField label={t.apiKey} description={t.apiKeyDesc}>
            <input
              type="password"
              value={config.api_key}
              onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
              placeholder="sk-..."
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t.model} description={t.modelDesc}>
              <input
                type="text"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                placeholder="gpt-4"
              />
            </FormField>

            <FormField label={t.proxyPort} description={t.proxyPortDesc}>
              <input
                type="number"
                value={config.proxy_port}
                onChange={(e) => setConfig({ ...config, proxy_port: parseInt(e.target.value) || 8742 })}
              />
            </FormField>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-150"
              style={{
                background: saved ? "var(--color-accent-dim)" : "var(--color-accent)",
                color: saved ? "var(--color-accent)" : "var(--color-surface-0)",
                border: `1px solid ${saved ? "rgba(52,211,153,0.3)" : "var(--color-accent)"}`,
              }}
            >
              {saved ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {t.saved}
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <path d="M17 21v-8H7v8M7 3v5h8" />
                  </svg>
                  {t.saveConfig}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div
        className="rounded-xl border p-5"
        style={{
          borderColor: "var(--color-border-default)",
          background: "var(--color-surface-1)",
        }}
      >
        <div className="mb-3 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
          </svg>
          <h2 className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            {t.codexConfig}
          </h2>
        </div>
        <p className="mb-3 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          {t.codexConfigDesc} <code className="rounded px-1.5 py-0.5" style={{ background: "var(--color-surface-3)", color: "var(--color-text-secondary)" }}>~/.codex/config.toml</code>
        </p>
        <pre
          className="overflow-x-auto rounded-lg border p-4 font-mono text-[13px] leading-relaxed"
          style={{
            borderColor: "var(--color-border-subtle)",
            background: "var(--color-surface-0)",
            color: "var(--color-accent)",
          }}
        >
{`model_provider = "custom"

[model_providers.custom]
base_url = "http://127.0.0.1:${config.proxy_port}/v1"
wire_api = "responses"
requires_openai_auth = true`}
        </pre>
      </div>
    </div>
  );
}

function FormField({ label, description, children }: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[13px] font-medium" style={{ color: "var(--color-text-primary)" }}>
        {label}
      </label>
      <p className="mb-2 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
        {description}
      </p>
      <div
        className="rounded-lg border transition-colors focus-within:border-[var(--color-border-strong)]"
        style={{ borderColor: "var(--color-border-default)" }}
      >
        <div className="[&_input]:w-full [&_input]:bg-transparent [&_input]:px-3.5 [&_input]:py-2.5 [&_input]:font-mono [&_input]:text-sm [&_input]:text-[var(--color-text-primary)] [&_input]:outline-none [&_input::placeholder]:text-[var(--color-text-tertiary)]">
          {children}
        </div>
      </div>
    </div>
  );
}

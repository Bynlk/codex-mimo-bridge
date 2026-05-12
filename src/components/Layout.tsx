import type { ReactNode } from "react";
import { useI18n } from "../i18n";

interface Props {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Layout({ children, activeTab, onTabChange }: Props) {
  const { t, locale, setLocale } = useI18n();

  const tabs = [
    {
      id: "dashboard",
      label: t.dashboard,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      id: "config",
      label: t.configuration,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ),
    },
    {
      id: "logs",
      label: t.logs,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M16 13H8M16 17H8M10 9H8" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex h-screen" style={{ background: "var(--color-surface-0)" }}>
      {/* Sidebar */}
      <aside
        className="flex w-56 flex-col border-r"
        style={{
          borderColor: "var(--color-border-subtle)",
          background: "var(--color-surface-1)",
        }}
      >
        {/* Logo area */}
        <div className="px-5 pt-6 pb-8">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "var(--color-accent-dim)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <h1
                className="text-sm font-semibold tracking-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                {t.appTitle}
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
                {t.appSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3">
          <div className="mb-2 px-2">
            <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
              {t.navigation}
            </span>
          </div>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="group mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-all duration-150"
                style={{
                  color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  background: isActive ? "var(--color-surface-3)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "var(--color-surface-2)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-tertiary)" }}>
                  {tab.icon}
                </span>
                {tab.label}
                {isActive && (
                  <div
                    className="ml-auto h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--color-accent)" }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Language switcher + Footer */}
        <div
          className="border-t px-5 py-4 space-y-3"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLocale("zh")}
              className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
              style={{
                background: locale === "zh" ? "var(--color-accent-dim)" : "transparent",
                color: locale === "zh" ? "var(--color-accent)" : "var(--color-text-tertiary)",
              }}
            >
              中文
            </button>
            <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>/</span>
            <button
              onClick={() => setLocale("en")}
              className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
              style={{
                background: locale === "en" ? "var(--color-accent-dim)" : "transparent",
                color: locale === "en" ? "var(--color-accent)" : "var(--color-text-tertiary)",
              }}
            >
              EN
            </button>
          </div>
          <p className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
            v0.1.0
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}

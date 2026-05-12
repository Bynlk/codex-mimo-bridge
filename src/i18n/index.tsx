import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { zh, type Locale } from "./zh";
import { en } from "./en";

const locales: Record<string, Locale> = { zh, en };

interface I18nContextValue {
  locale: string;
  t: Locale;
  setLocale: (locale: string) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "zh",
  t: zh,
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem("locale") || "zh";
  });

  useEffect(() => {
    localStorage.setItem("locale", locale);
  }, [locale]);

  const t = locales[locale] || zh;

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

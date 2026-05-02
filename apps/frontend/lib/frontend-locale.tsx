"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type FrontendLocale = "en" | "ja";

export const FRONTEND_LOCALE_STORAGE_KEY = "flovia:frontend-locale";

const isToggleEnabled = process.env.NEXT_PUBLIC_DEBUG_LOCALE_TOGGLE_ENABLED === "true";

type FrontendLocaleContextValue = {
  locale: FrontendLocale;
  enabled: boolean;
  setLocale: (locale: FrontendLocale) => void;
  toggleLocale: () => void;
  text: (english: string, japanese: string) => string;
};

const FrontendLocaleContext = createContext<FrontendLocaleContextValue | null>(null);

const normalizeLocale = (value: string | null | undefined): FrontendLocale =>
  value === "ja" ? "ja" : "en";

export function FrontendLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<FrontendLocale>("en");

  useEffect(() => {
    if (!isToggleEnabled) return;
    setLocaleState(normalizeLocale(window.localStorage.getItem(FRONTEND_LOCALE_STORAGE_KEY)));
  }, []);

  const setLocale = useCallback((nextLocale: FrontendLocale) => {
    if (!isToggleEnabled) return;
    setLocaleState(nextLocale);
    window.localStorage.setItem(FRONTEND_LOCALE_STORAGE_KEY, nextLocale);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((current) => {
      if (!isToggleEnabled) return "en";
      const nextLocale = current === "en" ? "ja" : "en";
      window.localStorage.setItem(FRONTEND_LOCALE_STORAGE_KEY, nextLocale);
      return nextLocale;
    });
  }, []);

  const value = useMemo<FrontendLocaleContextValue>(
    () => ({
      locale: isToggleEnabled ? locale : "en",
      enabled: isToggleEnabled,
      setLocale,
      toggleLocale,
      text: (english, japanese) => (isToggleEnabled && locale === "ja" ? japanese : english),
    }),
    [locale, setLocale, toggleLocale],
  );

  return <FrontendLocaleContext.Provider value={value}>{children}</FrontendLocaleContext.Provider>;
}

export function useFrontendLocale() {
  const context = useContext(FrontendLocaleContext);
  return (
    context ?? {
      locale: "en",
      enabled: false,
      setLocale: () => undefined,
      toggleLocale: () => undefined,
      text: (english: string) => english,
    }
  );
}

export function UiText({ en, ja }: { en: string; ja: string }) {
  const { text } = useFrontendLocale();
  return <>{text(en, ja)}</>;
}

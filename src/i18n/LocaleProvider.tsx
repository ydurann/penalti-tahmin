"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, detectLocale, isLocale, LOCALE_KEY, translator, type Locale, type Translate } from "./index";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t: translator(DEFAULT_LOCALE),
});

/**
 * Dil, tarayıcıda saklanır (`penalti-tahmin:dil`); ilk çizim Türkçe olur (sunucuyla aynı),
 * ardından kayıtlı ya da tarayıcı dili uygulanır. `<html lang>` buna göre güncellenir.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const timer = setTimeout(() => {
      let saved: string | null = null;
      try {
        saved = window.localStorage.getItem(LOCALE_KEY);
      } catch {
        // depolama kapalı
      }
      setLocaleState(isLocale(saved) ? saved : detectLocale(navigator.languages ?? [navigator.language]));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_KEY, next);
    } catch {
      // depolama kapalı
    }
  }, []);

  const value = useMemo(() => ({ locale, setLocale, t: translator(locale) }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);
export const useT = () => useContext(LocaleContext).t;

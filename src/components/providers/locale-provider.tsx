"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { i18n, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n/client";

type Locale = SupportedLocale;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (value: Locale) => void;
  t: (key: string, fallback?: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { t: i18nT } = useTranslation();
  const [locale, setLocaleState] = useState<Locale>("pl");

  const setLocale = (value: Locale) => {
    void i18n.changeLanguage(value);
    setLocaleState(value);

    if (typeof window !== "undefined") {
      window.localStorage.setItem("militia-locale", value);
      document.documentElement.lang = value;
    }
  };

  useEffect(() => {
    const onLanguageChanged = (lang: string) => {
      if (SUPPORTED_LOCALES.includes(lang as Locale)) {
        setLocaleState(lang as Locale);
      }
    };

    i18n.on("languageChanged", onLanguageChanged);

    const storedLocale = window.localStorage.getItem("militia-locale");
    if (storedLocale && SUPPORTED_LOCALES.includes(storedLocale as Locale)) {
      void i18n.changeLanguage(storedLocale);
    }

    return () => {
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => {
    return {
      locale,
      setLocale,
      t: (key, fallback) => i18nT(key, { defaultValue: fallback ?? key }),
    };
  }, [locale, i18nT]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);

  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider.");
  }

  return ctx;
}

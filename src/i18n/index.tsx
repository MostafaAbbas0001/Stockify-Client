import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { en } from "./en";
import { ar } from "./ar";

export type Locale = "en" | "ar";
export type Direction = "ltr" | "rtl";

const DICTIONARIES = { en, ar } as const;
const STORAGE_KEY = "stockify.locale";

type TranslateParams = Record<string, string | number>;

type I18nValue = {
  locale: Locale;
  dir: Direction;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TranslateParams) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function lookup(dictionary: unknown, key: string): string | undefined {
  const segments = key.split(".");
  let current: unknown = dictionary;
  for (const segment of segments) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] === undefined ? match : String(params[name]),
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Server render is always the default locale; the stored preference is applied
  // after hydration so the markup matches on both sides.
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") setLocaleState(stored);
  }, []);

  const dir: Direction = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string, params?: TranslateParams) => {
      const value = lookup(DICTIONARIES[locale], key) ?? lookup(DICTIONARIES.en, key);
      return value ? interpolate(value, params) : key;
    },
    [locale],
  );

  const value = useMemo<I18nValue>(
    () => ({ locale, dir, setLocale, t }),
    [locale, dir, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}

/** Convenience hook for components that only need the translate function. */
export function useT() {
  return useI18n().t;
}

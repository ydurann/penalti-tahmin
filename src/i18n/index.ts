import { de } from "./de";
import { en } from "./en";
import { tr, type Dictionary, type MessageKey } from "./tr";

export type Locale = "tr" | "en" | "de";
export const LOCALES: Locale[] = ["tr", "en", "de"];
export const DEFAULT_LOCALE: Locale = "tr";
export const LOCALE_KEY = "penalti-tahmin:dil";

const DICTIONARIES: Record<Locale, Dictionary> = { tr, en, de };

export const isLocale = (value: unknown): value is Locale =>
  LOCALES.includes(value as Locale);

export const hasMessage = (key: string): key is MessageKey => key in tr;

export type Params = Record<string, string | number>;

/** Sözlükten metin; `{ad}` yer tutucuları doldurulur, eksik anahtar Türkçeye düşer. */
export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  const text = DICTIONARIES[locale][key] ?? tr[key] ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Çeviri işlevi; `locale` alanı büyük/küçük harf ve sözcük sırası kuralları için taşınır. */
export interface Translate {
  (key: MessageKey, params?: Params): string;
  readonly locale: Locale;
}

export function translator(locale: Locale): Translate {
  const t = ((key, params) => translate(locale, key, params)) as Translate;
  Object.defineProperty(t, "locale", { value: locale, enumerable: true });
  return t;
}

/** Tarayıcı dilinden ilk eşleşen desteklenen dil; yoksa Türkçe. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const lang of languages) {
    const short = lang.slice(0, 2).toLowerCase();
    if (isLocale(short)) return short;
  }
  return DEFAULT_LOCALE;
}

export type { Dictionary, MessageKey };

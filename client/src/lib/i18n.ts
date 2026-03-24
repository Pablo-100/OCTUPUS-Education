import enTranslations from "../locales/en.json";
import frTranslations from "../locales/fr.json";

export type Language = "en" | "fr";

export const translations = {
  en: enTranslations,
  fr: frTranslations,
} as const;

export function t(key: string, lang: Language = "en"): string {
  const keys = key.split(".");
  let value: any = translations[lang];

  for (const k of keys) {
    value = value?.[k];
  }

  return typeof value === "string" ? value : key;
}

export function getLanguageLabel(lang: Language): string {
  return lang === "en" ? "English" : "Français";
}

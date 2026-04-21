import { LOCALE_SETTING_KEY, THEME_SETTING_KEY } from "consts";
import darkTheme from "ui/theme/darkTheme";
import lightTheme from "ui/theme/lightTheme";
import type { ThemeInterface } from "ui/theme/ThemeInterface";
import en from "lang/en.json";
import type { L10NLookup } from "shared/lib/lang/l10n";

const settingsPrefix = "gbsMusicWeb:";

const webThemeOptions = [
  { id: "light", label: "Light", theme: lightTheme },
  { id: "dark", label: "Dark", theme: darkTheme },
] as const;

const webLocaleLookup = {
  en: { label: "English" },
  de: { label: "Deutsch" },
  es: { label: "Español" },
  fr: { label: "Français" },
  id: { label: "Bahasa Indonesia" },
  it: { label: "Italiano" },
  ja: { label: "日本語" },
  pl: { label: "Polski" },
  "pt-BR": { label: "Português (Brasil)" },
  "pt-PT": { label: "Português (Portugal)" },
  ru: { label: "Русский" },
  "uk-UA": { label: "Українська" },
  "zh-CN": { label: "中文（简体）" },
} as const;

const localeLoaders: Record<
  keyof typeof webLocaleLookup,
  () => Promise<L10NLookup>
> = {
  en: async () => en,
  de: async () => (await import("lang/de.json")).default as L10NLookup,
  es: async () => (await import("lang/es.json")).default as L10NLookup,
  fr: async () => (await import("lang/fr.json")).default as L10NLookup,
  id: async () => (await import("lang/id.json")).default as L10NLookup,
  it: async () => (await import("lang/it.json")).default as L10NLookup,
  ja: async () => (await import("lang/ja.json")).default as L10NLookup,
  pl: async () => (await import("lang/pl.json")).default as L10NLookup,
  "pt-BR": async () => (await import("lang/pt-BR.json")).default as L10NLookup,
  "pt-PT": async () => (await import("lang/pt-PT.json")).default as L10NLookup,
  ru: async () => (await import("lang/ru.json")).default as L10NLookup,
  "uk-UA": async () => (await import("lang/uk-UA.json")).default as L10NLookup,
  "zh-CN": async () => (await import("lang/zh-CN.json")).default as L10NLookup,
};

const localeCache = new Map<string, L10NLookup>([["en", en as L10NLookup]]);

export const webLocaleOptions = Object.entries(webLocaleLookup).map(
  ([id, locale]) => ({
    id,
    label: locale.label,
  }),
);

const getStorageKey = (key: string) => `${settingsPrefix}${key}`;

const readLocalStorage = (key: string) => {
  if (typeof window === "undefined") {
    return undefined;
  }
  const value = window.localStorage.getItem(getStorageKey(key));
  if (value === null) {
    return undefined;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

export const getStoredSetting = (key: string) => readLocalStorage(key);

export const setStoredSetting = (key: string, value: unknown) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(getStorageKey(key), JSON.stringify(value));
};

export const deleteStoredSetting = (key: string) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(getStorageKey(key));
};

export const getStoredThemeId = () => {
  const themeId = getStoredSetting(THEME_SETTING_KEY);
  return typeof themeId === "string" && themeId.length > 0 ? themeId : "light";
};

export const getStoredLocaleId = () => {
  const locale = getStoredSetting(LOCALE_SETTING_KEY);
  return typeof locale === "string" && locale in webLocaleLookup
    ? locale
    : "en";
};

export const getThemeById = (themeId: string): ThemeInterface => {
  return (
    webThemeOptions.find((option) => option.id === themeId)?.theme ?? lightTheme
  );
};

export const defaultLocaleData: L10NLookup = en;

export const loadLocaleData = async (localeId: string): Promise<L10NLookup> => {
  const cacheKey = localeId in webLocaleLookup ? localeId : "en";
  const cached = localeCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const loader =
    localeLoaders[cacheKey as keyof typeof localeLoaders] ?? localeLoaders.en;
  const localeData = await loader();
  localeCache.set(cacheKey, localeData);
  return localeData;
};

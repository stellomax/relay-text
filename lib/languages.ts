// Languages common among ESL families in U.S. schools, shown first in every language menu.
// Every other language Google Translate supports is listed after these (see /api/languages).
// Codes are Google Translate codes.
export const LANGUAGES: { code: string; name: string; native: string }[] = [
  { code: "es", name: "Spanish", native: "Español" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "zh-CN", name: "Chinese (Simplified)", native: "中文" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "so", name: "Somali", native: "Soomaali" },
  { code: "my", name: "Burmese", native: "မြန်မာ" },
  { code: "fa-AF", name: "Dari", native: "دری" },
  { code: "ps", name: "Pashto", native: "پښتو" },
  { code: "fa", name: "Persian (Farsi)", native: "فارسی" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "fr", name: "French", native: "Français" },
  { code: "ht", name: "Haitian Creole", native: "Kreyòl ayisyen" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "rw", name: "Kinyarwanda", native: "Ikinyarwanda" },
  { code: "am", name: "Amharic", native: "አማርኛ" },
  { code: "ti", name: "Tigrinya", native: "ትግርኛ" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "hmn", name: "Hmong", native: "Hmoob" },
  { code: "km", name: "Khmer", native: "ខ្មែរ" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "tl", name: "Tagalog", native: "Tagalog" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "ckb", name: "Kurdish (Sorani)", native: "کوردی" },
  { code: "uz", name: "Uzbek", native: "Oʻzbek" },
  { code: "en", name: "English", native: "English" },
];

export type Language = { code: string; name: string; native?: string };

// Names for any language code, using the browser's / server's built-in language names.
function intlName(code: string, inLang: string): string | null {
  try {
    const n = new Intl.DisplayNames([inLang], { type: "language" }).of(code);
    return n && n.toLowerCase() !== code.toLowerCase() ? n : null;
  } catch {
    return null;
  }
}

// Names learned from Google's full list (filled in by the language menu).
const extraNames = new Map<string, string>();
export function rememberLanguages(list: Language[]) {
  for (const l of list) extraNames.set(l.code.toLowerCase(), l.name);
}

export function languageName(code: string | null | undefined): string {
  if (!code) return "Unknown";
  const hit = LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase());
  if (hit) return hit.name;
  const known = extraNames.get(code.toLowerCase());
  if (known) return known;
  const intl = intlName(code, "en");
  if (intl) return intl;
  const base = LANGUAGES.find((l) => l.code.split("-")[0] === code.split("-")[0]);
  return base ? base.name : code;
}

// The language's name in itself, e.g. "fr" → "français".
export function nativeName(code: string): string | null {
  const hit = LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase());
  if (hit) return hit.native;
  const n = intlName(code, code);
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : null;
}

// Looks like a Google Translate language code (e.g. "es", "zh-CN", "hmn", "fa-AF").
export const isLanguageCode = (code: unknown): code is string =>
  typeof code === "string" && /^[a-z]{2,3}(-[A-Za-z0-9]{2,4})?$/.test(code);

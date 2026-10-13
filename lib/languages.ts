// Languages common among ESL families in U.S. schools. Codes are Google Translate codes.
// Add more any time: https://cloud.google.com/translate/docs/languages
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

export function languageName(code: string | null | undefined): string {
  if (!code) return "Unknown";
  const hit = LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase());
  if (hit) return hit.name;
  const base = LANGUAGES.find((l) => l.code.split("-")[0] === code.split("-")[0]);
  return base ? base.name : code;
}

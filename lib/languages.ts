// Languages common among ESL families in U.S. schools, shown first in every language menu.
// Every other language Google Translate supports is listed after these (see /api/languages).
// Codes are Google Translate codes.
export const LANGUAGES: { code: string; name: string; native: string }[] = [
  // English first, so it is easy to find (no translation for these parents)
  { code: "en", name: "English", native: "English" },
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

// Read a language from a spreadsheet cell: a code ("es"), an English name ("Spanish") or the native name ("Español").
// `extra` is Google's full list when it's been loaded.
const ALIASES: Record<string, string> = {
  chinese: "zh-CN", mandarin: "zh-CN", cantonese: "zh-TW", farsi: "fa", persian: "fa", creole: "ht",
  "haitian": "ht", kurdish: "ckb", filipino: "tl", burmese: "my", dari: "fa-AF", "spanish (mexico)": "es",
  "chinese mandarin": "zh-CN", "mandarin chinese": "zh-CN", "chinese cantonese": "zh-TW", "cantonese chinese": "zh-TW",
  "haitian creole": "ht", "creole haitian": "ht", "kurdish sorani": "ckb", "sorani kurdish": "ckb", sorani: "ckb",
  "kurdish kurmanji": "ku", kurmanji: "ku", "persian dari": "fa-AF", "dari persian": "fa-AF", "afghan persian": "fa-AF",
  pashto: "ps", pushto: "ps", castilian: "es", espanol: "es", "español": "es", "portuguese brazil": "pt",
  "brazilian portuguese": "pt", "cape verdean": "pt", tigrinya: "ti", tigrigna: "ti", kirundi: "rw", rundi: "rw",
  "sign language": "", "american sign language": "", asl: "",
};
// Three-letter codes many student information systems use (ISO 639-2/3), mapped to Google codes.
const ISO3: Record<string, string> = {
  eng: "en", spa: "es", ara: "ar", zho: "zh-CN", chi: "zh-CN", cmn: "zh-CN", yue: "zh-TW", vie: "vi", som: "so",
  mya: "my", bur: "my", prs: "fa-AF", pus: "ps", pbt: "ps", fas: "fa", per: "fa", ukr: "uk", rus: "ru", fra: "fr",
  fre: "fr", hat: "ht", por: "pt", swa: "sw", swh: "sw", kin: "rw", amh: "am", tir: "ti", nep: "ne", npi: "ne",
  hmn: "hmn", khm: "km", kor: "ko", tgl: "tl", fil: "tl", hin: "hi", urd: "ur", ben: "bn", jpn: "ja", deu: "de",
  ger: "de", ckb: "ckb", kur: "ckb", kmr: "ku", uzb: "uz", tel: "te", tam: "ta", guj: "gu", pan: "pa", mar: "mr",
  pol: "pl", ita: "it", tur: "tr", ron: "ro", rum: "ro", srp: "sr", bos: "bs", hrv: "hr", sqi: "sq", alb: "sq",
  ell: "el", gre: "el", heb: "iw", msa: "ms", may: "ms", ind: "id", tha: "th", lao: "lo", mon: "mn", hun: "hu",
  ces: "cs", cze: "cs", slk: "sk", slo: "sk", bul: "bg", mkd: "mk", mac: "mk", kaz: "kk", kir: "ky", tgk: "tg",
  tuk: "tk", aze: "az", hye: "hy", arm: "hy", kat: "ka", geo: "ka", lit: "lt", lav: "lv", est: "et", fin: "fi",
  swe: "sv", nor: "no", nob: "no", dan: "da", nld: "nl", dut: "nl", cat: "ca", glg: "gl", eus: "eu", baq: "eu",
  orm: "om", yor: "yo", ibo: "ig", hau: "ha", wol: "wo", lin: "ln", lug: "lg", zul: "zu", xho: "xh", sna: "sn",
  nya: "ny", mlg: "mg", pap: "pap", haw: "haw", smo: "sm", ton: "to", mri: "mi", mao: "mi", ilo: "ilo",
  ceb: "ceb", sin: "si", mal: "ml", kan: "kn", ori: "or", asm: "as", snd: "sd", bod: "bo", tib: "bo", uig: "ug",
  tat: "tt", bel: "be", slv: "sl", mlt: "mt", isl: "is", ice: "is", gle: "ga", cym: "cy", wel: "cy", lat: "la",
  epo: "eo", yid: "yi",
};

export function parseLanguage(input: string, extra: Language[] = []): string | null {
  const raw = (input || "").trim();
  if (!raw) return null;
  const once = parseOne(raw, extra);
  if (once) return once;
  // SIS exports often say "Spanish; Castilian", "Chinese, Mandarin", "Arabic (Egypt)" or "SPA - Spanish".
  const parts = raw.split(/\s*[;,\/()|–-]\s*/).map((x) => x.trim()).filter(Boolean);
  if (parts.length > 1) {
    const joined = parts.slice(0, 2).join(" ").toLowerCase();
    if (ALIASES[joined]) return ALIASES[joined];
    const swapped = parts.slice(0, 2).reverse().join(" ").toLowerCase();
    if (ALIASES[swapped]) return ALIASES[swapped];
    for (const part of parts) {
      const hit = parseOne(part, extra);
      if (hit) return hit;
    }
  }
  return null;
}

function parseOne(raw: string, extra: Language[]): string | null {
  const v = raw.toLowerCase();
  if (v.length === 3 && v in ISO3) return ISO3[v] || null;
  const all = [...LANGUAGES, ...extra];
  const byCode = all.find((l) => l.code.toLowerCase() === v);
  if (byCode) return byCode.code;
  const byName = all.find((l) => l.name.toLowerCase() === v || (l.native || "").toLowerCase() === v);
  if (byName) return byName.code;
  if (ALIASES[v]) return ALIASES[v];
  const starts = all.find((l) => l.name.toLowerCase().startsWith(v + " ") || l.name.toLowerCase().startsWith(v + " ("));
  if (starts) return starts.code;
  // An unknown two-letter code is probably still a real one; anything else gets asked about in the upload.
  return isLanguageCode(raw) && raw.length === 2 ? v : null;
}

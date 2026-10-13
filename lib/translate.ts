import { env } from "./config";

type GoogleResult = { translatedText: string; detectedSourceLanguage?: string };

function decodeEntities(s: string): string {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

const sameLang = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.toLowerCase().split("-")[0] === b.toLowerCase().split("-")[0];

// Translate text with Google Cloud Translation (v2 REST).
// Leave `source` empty to let Google detect the language.
export async function translate(
  text: string,
  target: string,
  source?: string
): Promise<{ text: string; detected: string | null }> {
  if (!text.trim()) return { text, detected: source || null };
  if (source && sameLang(source, target)) return { text, detected: source };
  if (!env.googleKey) {
    throw new Error("Google Translate is not configured. Set GOOGLE_TRANSLATE_API_KEY in Vercel.");
  }
  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(env.googleKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q: text, target, format: "text", ...(source ? { source } : {}) }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Google Translate error: ${msg}`);
  }
  const r: GoogleResult | undefined = data?.data?.translations?.[0];
  if (!r) throw new Error("Google Translate returned no translation.");
  return { text: decodeEntities(r.translatedText), detected: r.detectedSourceLanguage || source || null };
}

// Incoming reply → English. Uses detection, so an English reply is left as-is (the "English safety net").
export async function toEnglish(text: string, expectedLang?: string | null) {
  try {
    const r = await translate(text, "en");
    if (sameLang(r.detected, "en")) return { english: text, original: text, language: "en" };
    return { english: r.text, original: text, language: r.detected || expectedLang || null };
  } catch (e) {
    // Fall back to the contact's language if detection fails for very short texts.
    if (expectedLang && !sameLang(expectedLang, "en")) {
      const r = await translate(text, "en", expectedLang);
      return { english: r.text, original: text, language: expectedLang };
    }
    throw e;
  }
}

export { sameLang };

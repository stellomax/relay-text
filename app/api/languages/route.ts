import { env } from "@/lib/config";
import { json } from "@/lib/http";
import { LANGUAGES, type Language } from "@/lib/languages";

export const dynamic = "force-dynamic";

// Public: every language Google Translate supports, with English names. Cached for a day.
let cache: { at: number; list: Language[] } | null = null;
const DAY = 24 * 60 * 60 * 1000;

export async function GET() {
  if (!cache || Date.now() - cache.at > DAY) {
    try {
      if (!env.googleKey) throw new Error("no key");
      const res = await fetch(
        `https://translation.googleapis.com/language/translate/v2/languages?target=en&key=${encodeURIComponent(env.googleKey)}`
      );
      const data = await res.json();
      const list: Language[] = (data?.data?.languages || [])
        .map((l: { language: string; name?: string }) => ({ code: l.language, name: l.name || l.language }))
        .filter((l: Language) => l.code);
      if (!list.length) throw new Error("empty list");
      cache = { at: Date.now(), list };
    } catch (e) {
      console.error("Couldn't load Google's language list:", e instanceof Error ? e.message : e);
      return json({ languages: LANGUAGES.map(({ code, name }) => ({ code, name })), fallback: true });
    }
  }
  return new Response(JSON.stringify({ languages: cache.list }), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=3600, s-maxage=86400" },
  });
}

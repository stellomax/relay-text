import { json, withAuth } from "@/lib/http";
import { translate, toEnglish } from "@/lib/translate";

export const dynamic = "force-dynamic";

// Preview: English → several languages (before sending), or text → English (for a simulated reply).
export const POST = withAuth(async (req) => {
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "").trim();
  if (!text) return json({ error: "Nothing to translate." }, 400);

  if (body.toEnglish) {
    const r = await toEnglish(text, body.from || null);
    return json({ english: r.english, language: r.language });
  }

  const languages: string[] = Array.from(new Set(Array.isArray(body.languages) ? body.languages : []));
  const previews: Record<string, string> = {};
  for (const lang of languages.slice(0, 40)) {
    previews[lang] = lang === "en" ? text : (await translate(text, lang, "en")).text;
  }
  return json({ previews });
});

import { db } from "@/lib/db";
import { json, withSuper } from "@/lib/http";
import { loadDemo, wipeDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Super admins only. GET: is demo data loaded? POST { action: "load", schoolId } or { action: "wipe" }.
export const GET = withSuper(async () => {
  const supa = db();
  const count = async (table: string) => {
    const { count, error } = await supa.from(table).select("id", { count: "exact", head: true }).eq("demo", true);
    if (error) return null;
    return count ?? 0;
  };
  const [teachers, parents, conversations] = await Promise.all([count("staff"), count("parents"), count("contacts")]);
  return json({ ready: teachers !== null && parents !== null && conversations !== null, teachers, parents, conversations });
});

export const POST = withSuper(async (req) => {
  const body = await req.json().catch(() => ({}));
  if (body.action === "wipe") return json({ ok: true, removed: await wipeDemo() });
  if (body.action === "load") {
    if (!body.schoolId) return json({ error: "Choose a school." }, 400);
    return json({ ok: true, loaded: await loadDemo(String(body.schoolId)) });
  }
  return json({ error: "Unknown action." }, 400);
});

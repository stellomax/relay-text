import { db } from "@/lib/db";
import { json, withSuper } from "@/lib/http";
import { loadDemo, wipeDemo } from "@/lib/demo";
import { logAudit } from "@/lib/audit";

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

export const POST = withSuper(async (req, me) => {
  const body = await req.json().catch(() => ({}));
  if (body.action === "wipe") {
    const removed = await wipeDemo();
    await logAudit(me, { action: "demo.remove", targetType: "school", schoolId: null, detail: removed });
    return json({ ok: true, removed });
  }
  if (body.action === "load") {
    if (!body.schoolId) return json({ error: "Choose a school." }, 400);
    const loaded = await loadDemo(String(body.schoolId));
    await logAudit(me, { action: "demo.load", targetType: "school", targetId: String(body.schoolId), targetLabel: loaded.school, schoolId: String(body.schoolId) });
    return json({ ok: true, loaded });
  }
  return json({ error: "Unknown action." }, 400);
});

import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { json, withAdmin, withSuper } from "@/lib/http";

export const dynamic = "force-dynamic";

// School districts: the top of the hierarchy (district → school → teachers and parents).
// Everyone with admin access can list them (for grouping school dropdowns); only super admins change them.

const NEEDS_SQL = "Districts aren't set up in the database yet. Run supabase/schema.sql in Supabase (SQL Editor), then reload.";
const missing = (m: string) => /districts|district_id|does not exist|schema cache/i.test(m);

export const GET = withAdmin(async () => {
  const supa = db();
  const [{ data, error }, { data: schools }] = await Promise.all([
    supa.from("districts").select("id, name, created_at").order("name"),
    supa.from("schools").select("id, district_id"),
  ]);
  if (error) return json({ districts: [], needsSetup: missing(error.message), error: missing(error.message) ? NEEDS_SQL : error.message });
  const counts = new Map<string, number>();
  (schools || []).forEach((s: { district_id?: string | null }) => s.district_id && counts.set(s.district_id, (counts.get(s.district_id) || 0) + 1));
  return json({ districts: (data || []).map((d) => ({ ...d, schools: counts.get(d.id) || 0 })) });
});

function cleanName(v: unknown) {
  return String(v || "").replace(/\s+/g, " ").trim().slice(0, 120);
}

export const POST = withSuper(async (req, me) => {
  const b = await req.json().catch(() => ({}));
  const name = cleanName(b.name);
  if (!name) return json({ error: "Enter the district's name." }, 400);
  const { data, error } = await db().from("districts").insert({ name }).select("id, name").single();
  if (error) {
    if (missing(error.message)) return json({ error: NEEDS_SQL }, 400);
    return json({ error: /duplicate|unique/i.test(error.message) ? "A district with that name already exists." : error.message }, 400);
  }
  await logAudit(me, { action: "district.create", targetType: "district", targetId: data.id, targetLabel: name });
  return json({ district: data });
});

// Rename a district; its schools' copy of the name follows.
export const PATCH = withSuper(async (req, me) => {
  const b = await req.json().catch(() => ({}));
  const id = String(b.id || "");
  const name = cleanName(b.name);
  if (!id) return json({ error: "id is required" }, 400);
  if (!name) return json({ error: "Enter the district's name." }, 400);
  const supa = db();
  const { error } = await supa.from("districts").update({ name }).eq("id", id);
  if (error) return json({ error: /duplicate|unique/i.test(error.message) ? "A district with that name already exists." : error.message }, 400);
  await supa.from("schools").update({ district: name }).eq("district_id", id);
  await logAudit(me, { action: "district.rename", targetType: "district", targetId: id, targetLabel: name });
  return json({ ok: true });
});

// Delete a district (only when it has no schools).
export const DELETE = withSuper(async (req, me) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ error: "id is required" }, 400);
  const supa = db();
  const { count } = await supa.from("schools").select("id", { count: "exact", head: true }).eq("district_id", id);
  if (count) return json({ error: "This district still has schools. Move them to another district first." }, 400);
  const { data: d } = await supa.from("districts").select("name").eq("id", id).maybeSingle();
  const { error } = await supa.from("districts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAudit(me, { action: "district.delete", targetType: "district", targetId: id, targetLabel: d?.name || null });
  return json({ ok: true });
});

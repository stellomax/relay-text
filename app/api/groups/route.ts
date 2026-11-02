import { db, Staff } from "@/lib/db";
import { json, withAuth } from "@/lib/http";
import { canSeeParent, type Parent } from "@/lib/parents";

export const dynamic = "force-dynamic";

// Groups ("Period 2", "6th graders") belong to the signed-in teacher or admin and aren't shared.
export type Group = { id: string; name: string; parentIds: string[] };

const cleanName = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, 60);

async function mine(me: Staff): Promise<Group[]> {
  const supa = db();
  const { data: groups, error } = await supa.from("parent_groups").select("id, name").eq("staff_id", me.id).order("name");
  if (error) {
    if (/parent_groups/.test(error.message)) throw new Error("Groups need a database update: run the latest supabase/schema.sql in Supabase.");
    throw new Error(error.message);
  }
  const ids = (groups || []).map((g) => g.id);
  const members = new Map<string, string[]>();
  if (ids.length) {
    const { data: rows } = await supa.from("parent_group_members").select("group_id, parent_id").in("group_id", ids);
    for (const r of rows || []) members.set(r.group_id, [...(members.get(r.group_id) || []), r.parent_id]);
  }
  return (groups || [])
    .map((g) => ({ id: g.id, name: g.name, parentIds: members.get(g.id) || [] }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

async function own(me: Staff, id: unknown) {
  const { data } = await db().from("parent_groups").select("id, name").eq("id", String(id || "")).eq("staff_id", me.id).maybeSingle();
  return data;
}

// Only parents this person can see on the Parents list can be put in their groups.
async function allowed(me: Staff, raw: unknown): Promise<string[]> {
  const ids = (Array.isArray(raw) ? raw : []).map(String).filter(Boolean);
  if (!ids.length) return [];
  const ok: string[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db().from("parents").select("id, school_id").in("id", ids.slice(i, i + 200));
    for (const p of (data || []) as Pick<Parent, "id" | "school_id">[]) if (canSeeParent(me, p)) ok.push(p.id);
  }
  return ok;
}

async function setMembers(groupId: string, parentIds: string[]) {
  const supa = db();
  const { error } = await supa.from("parent_group_members").delete().eq("group_id", groupId);
  if (error) throw new Error(error.message);
  for (let i = 0; i < parentIds.length; i += 500) {
    const rows = parentIds.slice(i, i + 500).map((parent_id) => ({ group_id: groupId, parent_id }));
    const { error: e } = await supa.from("parent_group_members").insert(rows);
    if (e) throw new Error(e.message);
  }
}

export const GET = withAuth(async (_req, me) => json({ groups: await mine(me) }));

export const POST = withAuth(async (req, me) => {
  const b = await req.json().catch(() => ({}));
  const name = cleanName(b.name);
  if (!name) return json({ error: "Give the group a name, like “Period 2”." }, 400);
  const { data, error } = await db().from("parent_groups").insert({ staff_id: me.id, name }).select("id").single();
  if (error) return json({ error: /duplicate/.test(error.message) ? `You already have a group called “${name}”.` : error.message }, 400);
  if (b.parentIds) await setMembers(data.id, await allowed(me, b.parentIds));
  return json({ id: data.id, groups: await mine(me) });
});

// Rename and/or set who's in the group.
export const PATCH = withAuth(async (req, me) => {
  const b = await req.json().catch(() => ({}));
  const g = await own(me, b.id);
  if (!g) return json({ error: "Group not found." }, 404);
  if (b.name !== undefined) {
    const name = cleanName(b.name);
    if (!name) return json({ error: "Give the group a name." }, 400);
    const { error } = await db().from("parent_groups").update({ name }).eq("id", g.id);
    if (error) return json({ error: /duplicate/.test(error.message) ? `You already have a group called “${name}”.` : error.message }, 400);
  }
  if (b.parentIds !== undefined) await setMembers(g.id, await allowed(me, b.parentIds));
  return json({ groups: await mine(me) });
});

export const DELETE = withAuth(async (req, me) => {
  const g = await own(me, new URL(req.url).searchParams.get("id"));
  if (!g) return json({ error: "Group not found." }, 404);
  const { error } = await db().from("parent_groups").delete().eq("id", g.id);
  if (error) throw new Error(error.message);
  return json({ groups: await mine(me) });
});

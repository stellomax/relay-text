import { db } from "@/lib/db";
import { json, withAuth } from "@/lib/http";

export const dynamic = "force-dynamic";

async function setMembers(listId: string, contactIds: string[]) {
  const supa = db();
  const del = await supa.from("list_members").delete().eq("list_id", listId);
  if (del.error) throw new Error(del.error.message);
  if (contactIds.length) {
    const ins = await supa
      .from("list_members")
      .insert(contactIds.map((contact_id) => ({ list_id: listId, contact_id })));
    if (ins.error) throw new Error(ins.error.message);
  }
}

export const GET = withAuth(async () => {
  const supa = db();
  const [{ data: lists, error: e1 }, { data: members, error: e2 }] = await Promise.all([
    supa.from("lists").select("*").order("name"),
    supa.from("list_members").select("list_id, contact_id"),
  ]);
  if (e1 || e2) throw new Error((e1 || e2)!.message);
  return json({
    lists: (lists || []).map((l) => ({
      ...l,
      contact_ids: (members || []).filter((m) => m.list_id === l.id).map((m) => m.contact_id),
    })),
  });
});

export const POST = withAuth(async (req) => {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return json({ error: "Give the list a name." }, 400);
  const { data, error } = await db().from("lists").insert({ name }).select("*").single();
  if (error) return json({ error: error.message.includes("duplicate") ? "A list with that name exists." : error.message }, 400);
  await setMembers(data.id, Array.isArray(body.contact_ids) ? body.contact_ids : []);
  return json({ list: data });
});

export const PATCH = withAuth(async (req) => {
  const body = await req.json().catch(() => ({}));
  if (!body.id) return json({ error: "id is required" }, 400);
  if (body.name) {
    const { error } = await db().from("lists").update({ name: String(body.name).trim() }).eq("id", body.id);
    if (error) return json({ error: error.message }, 400);
  }
  if (Array.isArray(body.contact_ids)) await setMembers(body.id, body.contact_ids);
  return json({ ok: true });
});

export const DELETE = withAuth(async (req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ error: "id is required" }, 400);
  const { error } = await db().from("lists").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return json({ ok: true });
});

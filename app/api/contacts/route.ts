import { db } from "@/lib/db";
import { json, withAuth } from "@/lib/http";
import { toE164 } from "@/lib/phone";

export const dynamic = "force-dynamic";

function clean(body: Record<string, unknown>) {
  const parent_name = String(body.parent_name || "").trim();
  const child_name = String(body.child_name || "").trim() || null;
  const language = String(body.language || "").trim();
  const phone = toE164(String(body.phone || ""));
  if (!parent_name) return { error: "Parent name is required." };
  if (!phone) return { error: "Enter a valid phone number, e.g. (303) 555-1234." };
  if (!language) return { error: "Choose a language." };
  return { row: { parent_name, child_name, language, phone } };
}

function friendly(msg: string) {
  return msg.includes("duplicate") ? "A contact with that phone number already exists." : msg;
}

export const GET = withAuth(async () => {
  const { data, error } = await db().from("contacts").select("*").order("parent_name");
  if (error) throw new Error(error.message);
  return json({ contacts: data || [] });
});

export const POST = withAuth(async (req) => {
  const c = clean(await req.json().catch(() => ({})));
  if ("error" in c) return json({ error: c.error }, 400);
  const { data, error } = await db().from("contacts").insert(c.row).select("*").single();
  if (error) return json({ error: friendly(error.message) }, 400);
  return json({ contact: data });
});

export const PATCH = withAuth(async (req) => {
  const body = await req.json().catch(() => ({}));
  if (!body.id) return json({ error: "id is required" }, 400);
  const c = clean(body);
  if ("error" in c) return json({ error: c.error }, 400);
  const update: Record<string, unknown> = { ...c.row };
  if (typeof body.opted_out === "boolean") update.opted_out = body.opted_out;
  const { data, error } = await db().from("contacts").update(update).eq("id", body.id).select("*").single();
  if (error) return json({ error: friendly(error.message) }, 400);
  return json({ contact: data });
});

export const DELETE = withAuth(async (req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ error: "id is required" }, 400);
  const { error } = await db().from("contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return json({ ok: true });
});

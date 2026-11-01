import { db, Contact } from "@/lib/db";
import { json, withAuth } from "@/lib/http";
import { toE164 } from "@/lib/phone";
import { canWrite, resolveScope, scoped } from "@/lib/staff";

export const dynamic = "force-dynamic";

function clean(body: Record<string, unknown>) {
  const parent_name = String(body.parent_name || "").trim();
  const child_name = String(body.child_name || "").trim() || null;
  const language = String(body.language || "").trim();
  const phone = toE164(String(body.phone || ""));
  if (!parent_name) return { error: "Parent name is required." };
  if (!phone) return { error: "Enter a valid phone number, e.g. (303) 555-1234." };
  if (!language) return { error: "Choose a language." };
  return { row: { parent_name, child_name, language, phone }, groups: cleanGroups(body.groups) };
}

// Groups arrive as a list or a comma-separated string ("Period 2, Soccer").
function cleanGroups(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  const list = Array.isArray(raw) ? raw.map(String) : String(raw).split(",");
  const out: string[] = [];
  for (const g of list) {
    const t = g.trim().replace(/\s+/g, " ").slice(0, 40);
    if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
  }
  return out.slice(0, 12);
}

// Save, and if the database hasn't been updated for groups yet, save without them.
async function withGroups<T>(
  groups: string[] | undefined,
  run: (extra: Record<string, unknown>) => PromiseLike<{ data: T | null; error: { message: string } | null }>
) {
  const first = await run(groups === undefined ? {} : { groups });
  if (first.error && groups !== undefined && /groups/.test(first.error.message)) {
    const second = await run({});
    if (!second.error && groups.length) {
      return { data: second.data, error: null, warning: "Saved, but groups need a database update: run the latest supabase/schema.sql in Supabase." };
    }
    return { ...second, warning: undefined };
  }
  return { ...first, warning: undefined };
}

async function duplicate(staffId: string | null, phone: string, exceptId?: string) {
  let q = db().from("contacts").select("id").eq("phone", phone);
  q = staffId ? q.eq("staff_id", staffId) : q.is("staff_id", null);
  const { data } = await q;
  return (data || []).some((r) => r.id !== exceptId);
}

async function load(id: string): Promise<Contact | null> {
  const { data } = await db().from("contacts").select("*").eq("id", id).maybeSingle();
  return (data as Contact) || null;
}

export const GET = withAuth(async (req, me) => {
  const { data, error } = await scoped(db().from("contacts").select("*"), resolveScope(req, me)).order("parent_name");
  if (error) throw new Error(error.message);
  return json({ contacts: data || [] });
});

// New families go into the inbox being viewed: your own, or (admins) the shared main number.
export const POST = withAuth(async (req, me) => {
  const scope = resolveScope(req, me);
  if (scope.readOnly) return json({ error: "You can only add families to your own inbox." }, 403);
  const body = await req.json().catch(() => ({}));
  const c = clean(body);
  if ("error" in c) return json({ error: c.error }, 400);
  if (body.consent !== true) {
    return json({ error: "Please confirm this parent gave their number to the school and agreed to receive texts." }, 400);
  }
  if (await duplicate(scope.staffId, c.row.phone)) return json({ error: "A family with that phone number is already in this inbox." }, 400);
  const { data, error, warning } = await withGroups(c.groups, (extra) =>
    db()
      .from("contacts")
      .insert({
        ...c.row,
        ...extra,
        staff_id: scope.staffId,
        consent_at: new Date().toISOString(),
        consent_source: `confirmed by ${me.email} when adding (parent gave number to school)`,
      })
      .select("*")
      .single()
  );
  if (error) {
    console.error("Add family failed:", error.message);
    if (/contacts_phone_key/.test(error.message)) {
      return json({ error: "This phone number is already saved in another inbox. To let more than one teacher text the same family, run the latest supabase/schema.sql in Supabase." }, 400);
    }
    if (/duplicate key/.test(error.message)) return json({ error: "A family with that phone number is already in this inbox." }, 400);
    return json({ error: `Couldn't add the family: ${error.message}` }, 400);
  }
  return json({ contact: data, warning });
});

export const PATCH = withAuth(async (req, me) => {
  const body = await req.json().catch(() => ({}));
  const existing = body.id ? await load(String(body.id)) : null;
  if (!existing || !canWrite(me, existing)) return json({ error: "Family not found." }, 404);
  const c = clean(body);
  if ("error" in c) return json({ error: c.error }, 400);
  if (await duplicate(existing.staff_id, c.row.phone, existing.id)) {
    return json({ error: "A family with that phone number is already in this inbox." }, 400);
  }
  const update: Record<string, unknown> = { ...c.row };
  if (typeof body.opted_out === "boolean") update.opted_out = body.opted_out;
  if (body.consent === true && !existing.consent_at) {
    update.consent_at = new Date().toISOString();
    update.consent_source = `confirmed by ${me.email} (parent gave number to school)`;
  }
  const { data, error, warning } = await withGroups(c.groups, (extra) =>
    db().from("contacts").update({ ...update, ...extra }).eq("id", existing.id).select("*").single()
  );
  if (error) return json({ error: error.message }, 400);
  return json({ contact: data, warning });
});

export const DELETE = withAuth(async (req, me) => {
  const id = new URL(req.url).searchParams.get("id");
  const existing = id ? await load(id) : null;
  if (!existing || !canWrite(me, existing)) return json({ error: "Family not found." }, 404);
  const { error } = await db().from("contacts").delete().eq("id", existing.id);
  if (error) throw new Error(error.message);
  return json({ ok: true });
});

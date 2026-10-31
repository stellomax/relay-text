import { baseUrlFromRequest } from "@/lib/config";
import { db } from "@/lib/db";
import { json, withAdmin, withSuper } from "@/lib/http";
import { codeIsFree, newFreeCode, School } from "@/lib/schools";
import { cleanAreaCode } from "@/lib/staff";

export const dynamic = "force-dynamic";

// All schools with teacher counts. Admins use this for school dropdowns; super admins manage it.
export const GET = withAdmin(async (req) => {
  const supa = db();
  const [{ data: schools, error }, { data: staff }] = await Promise.all([
    supa.from("schools").select("*").order("name"),
    supa.from("staff").select("school_id, status"),
  ]);
  if (error) throw new Error(error.message);
  const counts = new Map<string, number>();
  (staff || []).forEach((s) => s.school_id && s.status !== "disabled" && counts.set(s.school_id, (counts.get(s.school_id) || 0) + 1));
  return json({
    signupUrl: `${baseUrlFromRequest(req)}/signup`,
    schools: ((schools || []) as School[]).map((s) => ({ ...s, teachers: counts.get(s.id) || 0 })),
  });
});

async function clean(b: Record<string, unknown>, id?: string) {
  const name = String(b.name || "").trim().slice(0, 120);
  const district = String(b.district || "").trim().slice(0, 120) || null;
  const area_code = cleanAreaCode(b.area_code);
  if (!name) return { error: "Enter the school's name." };
  if (b.area_code && !area_code) return { error: "Enter a 3-digit area code, like 303." };
  let signup_code: string | null | undefined = undefined;
  if (b.signup_code !== undefined) {
    const c = String(b.signup_code || "").replace(/\D/g, "");
    if (!c) signup_code = null;
    else if (!/^\d{5}$/.test(c)) return { error: "The sign-up code must be 5 digits." };
    else if (!(await codeIsFree(c, id))) return { error: `Code ${c} is already in use. Pick another.` };
    else signup_code = c;
  }
  return { row: { name, district, area_code, ...(signup_code !== undefined ? { signup_code } : {}) } };
}

// Create a school. Leave the code blank to generate one.
export const POST = withSuper(async (req) => {
  const b = await req.json().catch(() => ({}));
  const c = await clean({ ...b, signup_code: b.signup_code || (await newFreeCode()) });
  if ("error" in c) return json({ error: c.error }, 400);
  const { data, error } = await db().from("schools").insert({ ...c.row, active: true }).select("*").single();
  if (error) return json({ error: /duplicate|unique/i.test(error.message) ? "A school with that name already exists." : error.message }, 400);
  return json({ school: data });
});

// Edit a school, turn its code on/off, or generate a new code (action: "new_code").
export const PATCH = withSuper(async (req) => {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return json({ error: "id is required" }, 400);
  const supa = db();
  if (b.action === "new_code") {
    const code = await newFreeCode(String(b.id));
    const { error } = await supa.from("schools").update({ signup_code: code, active: true }).eq("id", b.id);
    if (error) throw new Error(error.message);
    return json({ ok: true, code });
  }
  if (typeof b.active === "boolean" && Object.keys(b).length === 2) {
    const { error } = await supa.from("schools").update({ active: b.active }).eq("id", b.id);
    if (error) throw new Error(error.message);
    return json({ ok: true });
  }
  const c = await clean(b, String(b.id));
  if ("error" in c) return json({ error: c.error }, 400);
  const update: Record<string, unknown> = { ...c.row };
  if (typeof b.active === "boolean") update.active = b.active;
  const { error } = await supa.from("schools").update(update).eq("id", b.id);
  if (error) return json({ error: /duplicate|unique/i.test(error.message) ? "A school with that name already exists." : error.message }, 400);
  // Keep teachers' school name in step with the school.
  await supa.from("staff").update({ school: c.row.name }).eq("school_id", b.id);
  return json({ ok: true });
});

// Delete a school (only if no teachers are in it).
export const DELETE = withSuper(async (req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ error: "id is required" }, 400);
  const { count } = await db().from("staff").select("id", { count: "exact", head: true }).eq("school_id", id);
  if (count) return json({ error: "This school still has teachers. Move them to another school first, or turn off its code instead." }, 400);
  const { error } = await db().from("schools").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return json({ ok: true });
});

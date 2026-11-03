import { baseUrlFromRequest } from "@/lib/config";
import { allRows, db, Staff } from "@/lib/db";
import { json, withAdmin, errorMessage } from "@/lib/http";
import { autoBuyEnabled, assignNumber, unassignNumber, type AssignResult } from "@/lib/numbers";
import { cleanAreaCode, isBuiltInAdmin, isSuperAdmin, newJoinCode, staffByEmail, staffById, tempPassword } from "@/lib/staff";
import { newFreeCode, schoolById } from "@/lib/schools";
import { authClient, findAuthUserId, setPassword, upsertAuthUser } from "@/lib/supabaseAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// List everyone, with simple activity numbers, plus sign-up codes that haven't been used yet.
export const GET = withAdmin(async (req, me) => {
  const supa = db();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: staff, error }, contacts, msgs, { data: invites }, { data: schools }] = await Promise.all([
    supa.from("staff").select("*").order("created_at", { ascending: true }),
    allRows<{ staff_id: string | null }>((a, b) => supa.from("contacts").select("id, staff_id").order("id").range(a, b)),
    allRows<{ staff_id: string | null }>((a, b) => supa.from("messages").select("id, staff_id").gte("created_at", since).order("id").range(a, b)),
    supa
      .from("invites")
      .select("id, code, name, school, area_code, role, expires_at, created_at")
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
    supa.from("schools").select("id, name, district, area_code, active").order("name"),
  ]);
  if (error) throw new Error(error.message);
  const families = new Map<string, number>();
  const recent = new Map<string, number>();
  (contacts || []).forEach((c) => c.staff_id && families.set(c.staff_id, (families.get(c.staff_id) || 0) + 1));
  (msgs || []).forEach((m) => m.staff_id && recent.set(m.staff_id, (recent.get(m.staff_id) || 0) + 1));
  const unassigned = (contacts || []).filter((c) => !c.staff_id).length;
  const base = baseUrlFromRequest(req);
  return json({
    autoBuy: autoBuyEnabled(),
    unassignedFamilies: unassigned,
    signupUrl: `${base}/signup`,
    schools: schools || [],
    viewerIsSuper: isSuperAdmin(me.email),
    invites: invites || [],
    staff: ((staff || []) as Staff[]).map((s) => ({
      ...s,
      builtInAdmin: isBuiltInAdmin(s.email),
      superAdmin: isSuperAdmin(s.email),
      families: families.get(s.id) || 0,
      messages30d: recent.get(s.id) || 0,
      join_link: s.join_code ? `${base}/join?t=${s.join_code}` : null,
    })),
  });
});

// Add someone. mode "direct": create the account now with a temporary password (shown once).
// Otherwise: create a 5-digit sign-up code for them to use at /signup (good for 30 days, one use).
export const POST = withAdmin(async (req, me) => {
  const b = await req.json().catch(() => ({}));
  if (b.mode === "direct") return addDirectly(req, b);
  const name = String(b.name || "").trim().slice(0, 100);
  const sch = await schoolById(b.school_id ? String(b.school_id) : null);
  const school = sch?.name || null;
  const area_code = sch?.area_code || null; // every teacher uses their school's area code
  const role = b.role === "admin" ? "admin" : "teacher";
  if (!name) return json({ error: "Enter the teacher's name." }, 400);

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = await newFreeCode();
    const { data, error } = await db()
      .from("invites")
      .insert({ code, name, school, school_id: sch?.id || null, area_code, role, created_by: me.id })
      .select("id, code, name, expires_at")
      .single();
    if (!error) return json({ ok: true, invite: data, signupUrl: `${baseUrlFromRequest(req)}/signup` });
    if (!/duplicate|unique/i.test(error.message)) throw new Error(error.message);
  }
  return json({ error: "Couldn't create a unique code. Try again." }, 500);
});

// Cancel an unused sign-up code.
export const DELETE = withAdmin(async (req) => {
  const id = new URL(req.url).searchParams.get("invite");
  if (!id) return json({ error: "invite is required" }, 400);
  const { error } = await db().from("invites").delete().eq("id", id).is("used_at", null);
  if (error) throw new Error(error.message);
  return json({ ok: true });
});

// Actions on one person: approve, disable, enable, update, assign_number, release_number, reset_password.
export const PATCH = withAdmin(async (req, me) => {
  const b = await req.json().catch(() => ({}));
  const s = b.id ? await staffById(String(b.id)) : null;
  if (!s) return json({ error: "Person not found." }, 404);
  const supa = db();
  const base = baseUrlFromRequest(req);

  switch (b.action) {
    case "approve": {
      await supa.from("staff").update({ status: "active" }).eq("id", s.id);
      try {
        const number = await assignNumber({ ...s, status: "active" }, base);
        return json({ ok: true, number });
      } catch (e) {
        return json({ ok: true, numberError: errorMessage(e) });
      }
    }
    case "disable": {
      if (s.id === me.id) return json({ error: "You can't turn off your own account." }, 400);
      if (isBuiltInAdmin(s.email)) return json({ error: "Built-in admins can't be turned off." }, 400);
      await supa.from("staff").update({ status: "disabled" }).eq("id", s.id);
      return json({ ok: true });
    }
    case "enable": {
      await supa.from("staff").update({ status: "active" }).eq("id", s.id);
      return json({ ok: true });
    }
    case "update": {
      const update: Record<string, unknown> = {};
      if (typeof b.name === "string" && b.name.trim()) update.name = b.name.trim().slice(0, 100);
      if (b.school_id !== undefined) {
        const sch = await schoolById(b.school_id ? String(b.school_id) : null);
        update.school_id = sch?.id || null;
        update.school = sch?.name || null;
        // Teachers use their school's area code.
        if (sch?.id !== s.school_id || !s.area_code) update.area_code = sch?.area_code || null;
      }
      if (typeof b.email === "string" && b.email.trim().toLowerCase() !== s.email) {
        if (!isSuperAdmin(me.email)) return json({ error: "Only super admins can change a teacher's email." }, 403);
        const email = b.email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
        if (isBuiltInAdmin(s.email)) return json({ error: "Built-in admin emails can't be changed here." }, 400);
        if (await staffByEmail(email)) return json({ error: "Someone already has a Relay account with that email." }, 400);
        // Move their login to the new email too, so they sign in with it.
        const uid = s.user_id || (await findAuthUserId(s.email));
        if (uid) {
          const { error: authErr } = await authClient().auth.admin.updateUserById(uid, { email, email_confirm: true });
          if (authErr) return json({ error: `Couldn't change the login email: ${authErr.message}` }, 400);
        }
        update.email = email;
      }
      if (b.role === "admin" || b.role === "teacher") {
        if (b.role === "teacher" && isBuiltInAdmin(s.email)) return json({ error: "Built-in admins stay admins." }, 400);
        if (b.role === "teacher" && s.id === me.id) return json({ error: "You can't remove your own admin access." }, 400);
        update.role = b.role;
      }
      const { error } = await supa.from("staff").update(update).eq("id", s.id);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }
    case "delete": {
      if (!isSuperAdmin(me.email)) return json({ error: "Only super admins can delete teachers." }, 403);
      if (s.id === me.id) return json({ error: "You can't delete your own account." }, 400);
      if (isBuiltInAdmin(s.email)) return json({ error: "Built-in admins can't be deleted." }, 400);
      // Their families and conversations move to the main number (admins can see them under "Main number").
      await unassignNumber(s).catch((e) => console.error("release number", e));
      const { error } = await supa.from("staff").delete().eq("id", s.id);
      if (error) throw new Error(error.message);
      const uid = s.user_id || (await findAuthUserId(s.email).catch(() => null));
      if (uid) await authClient().auth.admin.deleteUser(uid).catch((e: unknown) => console.error("delete login", e));
      return json({ ok: true });
    }
    case "assign_number": {
      const number = await assignNumber(s, base);
      return json({ ok: true, number });
    }
    case "release_number": {
      await unassignNumber(s);
      return json({ ok: true });
    }
    case "reset_password": {
      const password = tempPassword();
      const uid = s.user_id || (await findAuthUserId(s.email));
      if (uid) await setPassword(uid, password);
      else {
        const created = await upsertAuthUser(s.email, password);
        await supa.from("staff").update({ user_id: created }).eq("id", s.id);
      }
      return json({ ok: true, tempPassword: password });
    }
    default:
      return json({ error: "Unknown action." }, 400);
  }
});

async function addDirectly(req: Request, b: Record<string, unknown>) {
  const name = String(b.name || "").trim().slice(0, 100);
  const email = String(b.email || "").trim().toLowerCase();
  const sch = await schoolById(b.school_id ? String(b.school_id) : null);
  const school = sch?.name || null;
  const area_code = sch?.area_code || null;
  const role = b.role === "admin" || isBuiltInAdmin(email) ? "admin" : "teacher";
  if (!name) return json({ error: "Enter the teacher's name." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
  if (await staffByEmail(email)) return json({ error: "Someone with this email already has an account." }, 400);

  const password = tempPassword();
  const userId = await upsertAuthUser(email, password);
  const ins = await db()
    .from("staff")
    .insert({ email, name, school, school_id: sch?.id || null, area_code, role, status: "active", user_id: userId, join_code: newJoinCode() })
    .select("*")
    .single();
  if (ins.error) throw new Error(ins.error.message);
  let number: AssignResult | null = null;
  let numberError: string | null = null;
  try {
    number = await assignNumber(ins.data as Staff, baseUrlFromRequest(req));
  } catch (e) {
    numberError = errorMessage(e);
  }
  return json({ ok: true, tempPassword: password, email, number, numberError });
}

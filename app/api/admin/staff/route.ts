import { baseUrlFromRequest } from "@/lib/config";
import { db, Staff } from "@/lib/db";
import { json, withAdmin, errorMessage } from "@/lib/http";
import { autoBuyEnabled, assignNumber, unassignNumber, type AssignResult } from "@/lib/numbers";
import { cleanAreaCode, isBuiltInAdmin, newJoinCode, staffById, staffByEmail, tempPassword } from "@/lib/staff";
import { findAuthUserId, setPassword, upsertAuthUser } from "@/lib/supabaseAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// List everyone, with simple activity numbers.
export const GET = withAdmin(async (req) => {
  const supa = db();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: staff, error }, { data: contacts }, { data: msgs }] = await Promise.all([
    supa.from("staff").select("*").order("created_at", { ascending: true }),
    supa.from("contacts").select("staff_id"),
    supa.from("messages").select("staff_id").gte("created_at", since).limit(20000),
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
    staff: ((staff || []) as Staff[]).map((s) => ({
      ...s,
      builtInAdmin: isBuiltInAdmin(s.email),
      families: families.get(s.id) || 0,
      messages30d: recent.get(s.id) || 0,
      join_link: s.join_code ? `${base}/join?t=${s.join_code}` : null,
    })),
  });
});

// Add a teacher or admin directly. They're active right away; a temporary password is returned once.
export const POST = withAdmin(async (req) => {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim().slice(0, 100);
  const email = String(b.email || "").trim().toLowerCase();
  const school = String(b.school || "").trim().slice(0, 120) || null;
  const area_code = cleanAreaCode(b.area_code);
  const role = b.role === "admin" || isBuiltInAdmin(email) ? "admin" : "teacher";
  if (!name) return json({ error: "Enter a name." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
  if (b.area_code && !area_code) return json({ error: "Enter a 3-digit area code, like 303." }, 400);
  if (await staffByEmail(email)) return json({ error: "Someone with this email already has an account." }, 400);

  const password = tempPassword();
  const userId = await upsertAuthUser(email, password);
  const ins = await db()
    .from("staff")
    .insert({ email, name, school, area_code, role, status: "active", user_id: userId, join_code: newJoinCode() })
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
  return json({ ok: true, tempPassword: password, number, numberError });
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
      if (typeof b.school === "string") update.school = b.school.trim().slice(0, 120) || null;
      if (b.area_code !== undefined) {
        const ac = cleanAreaCode(b.area_code);
        if (b.area_code && !ac) return json({ error: "Enter a 3-digit area code, like 303." }, 400);
        update.area_code = ac;
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

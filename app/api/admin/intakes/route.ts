import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { json, withSuper } from "@/lib/http";
import { BUCKET, missingTable, NEEDS_SQL, newToken, removeFiles, type Intake } from "@/lib/intakeStore";

export const dynamic = "force-dynamic";

// Super admins: district onboarding intake links (relaytext.io/intake/<token>).
// GET            → every intake (list)
// GET ?id=       → one intake with download links for its files (valid 1 hour)
export const GET = withSuper(async (req) => {
  const id = new URL(req.url).searchParams.get("id");
  const supa = db();
  if (id) {
    const { data, error } = await supa.from("district_intakes").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return json({ error: "Not found." }, 404);
    const intake = data as Intake;
    const files = await Promise.all(
      (intake.files || []).map(async (f) => {
        const { data: s } = await supa.storage.from(BUCKET).createSignedUrl(f.path, 3600, { download: f.name });
        return { ...f, url: s?.signedUrl || null };
      })
    );
    return json({ intake: { ...intake, files } });
  }
  const { data, error } = await supa
    .from("district_intakes")
    .select("id, token, district_id, district_name, answers, files, status, submitted_at, created_by, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return json({ intakes: [], needsSetup: missingTable(error.message), error: missingTable(error.message) ? NEEDS_SQL : error.message });
  return json({ intakes: data || [] });
});

// Create a link for a district: { district_id }
export const POST = withSuper(async (req, me) => {
  const b = await req.json().catch(() => ({}));
  const supa = db();
  const { data: d } = await supa.from("districts").select("id, name").eq("id", String(b.district_id || "")).maybeSingle();
  if (!d) return json({ error: "Pick a district." }, 400);
  const { data, error } = await supa
    .from("district_intakes")
    .insert({ token: newToken(), district_id: d.id, district_name: d.name, created_by: me.email })
    .select("*")
    .single();
  if (error) {
    if (missingTable(error.message)) return json({ error: NEEDS_SQL }, 400);
    throw new Error(error.message);
  }
  await logAudit(me, { action: "intake.create", targetType: "district", targetId: d.id, targetLabel: d.name, schoolId: null });
  return json({ intake: data });
});

// Change status: { id, status: "draft" (reopen for edits) | "submitted" | "reviewed" }
export const PATCH = withSuper(async (req, me) => {
  const b = await req.json().catch(() => ({}));
  const status = String(b.status || "");
  if (!["draft", "submitted", "reviewed"].includes(status)) return json({ error: "Unknown status." }, 400);
  const supa = db();
  const { data: row } = await supa.from("district_intakes").select("id, district_name").eq("id", String(b.id || "")).maybeSingle();
  if (!row) return json({ error: "Not found." }, 404);
  const { error } = await supa.from("district_intakes").update({ status, updated_at: new Date().toISOString() }).eq("id", row.id);
  if (error) throw new Error(error.message);
  await logAudit(me, { action: `intake.${status === "draft" ? "reopen" : status}`, targetType: "intake", targetId: row.id, targetLabel: row.district_name, schoolId: null });
  return json({ ok: true });
});

// Delete an intake and its files: ?id=
export const DELETE = withSuper(async (req, me) => {
  const id = new URL(req.url).searchParams.get("id") || "";
  const supa = db();
  const { data: row } = await supa.from("district_intakes").select("id, district_name, files").eq("id", id).maybeSingle();
  if (!row) return json({ ok: true });
  await removeFiles(((row.files as { path: string }[]) || []).map((f) => f.path));
  const { error } = await supa.from("district_intakes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAudit(me, { action: "intake.delete", targetType: "intake", targetId: id, targetLabel: row.district_name, schoolId: null });
  return json({ ok: true });
});

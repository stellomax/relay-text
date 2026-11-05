import { db } from "@/lib/db";
import { json, withSuper } from "@/lib/http";
import { deleteSchoolData, previewSchoolData } from "@/lib/schoolData";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Super admins only. GET ?id=… : what deleting this school's data would remove.
export const GET = withSuper(async (req, me) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ error: "id is required" }, 400);
  return json({ preview: await previewSchoolData(id, me) });
});

// POST { id, confirmName } : permanently delete all of the school's data. The typed name must match exactly.
export const POST = withSuper(async (req, me) => {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return json({ error: "id is required" }, 400);
  const { data: school } = await db().from("schools").select("name").eq("id", b.id).maybeSingle();
  if (!school) return json({ error: "School not found." }, 404);
  if (String(b.confirmName || "").trim() !== school.name.trim()) {
    return json({ error: `Type the school's name exactly (${school.name}) to confirm.` }, 400);
  }
  return json({ ok: true, deleted: await deleteSchoolData(String(b.id), me) });
});

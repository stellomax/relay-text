import { db } from "@/lib/db";
import { json } from "@/lib/http";
import { FILE_TYPES, MAX_FILE_MB, UPLOAD_LABELS, type IntakeFile, type UploadKind } from "@/lib/intake";
import { BUCKET, ensureBucket, intakeByToken, removeFiles } from "@/lib/intakeStore";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };
const MAX_FILES = 30;

const safeName = (n: string) =>
  String(n || "file")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "_")
    .slice(-80) || "file";

// Attachments. Files go straight from the browser to private storage with a one-time signed upload link
// (Vercel can't take request bodies over ~4.5 MB), then the form records them here.
//   { action: "start", name, type, size, kind } → { uploadUrl, path }
//   { action: "done", path, name, kind }         → { files }
export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;
  const r = await intakeByToken(req, token);
  if (!r.intake) return json({ error: r.error }, r.status);
  const intake = r.intake;
  if (intake.status !== "draft") return json({ error: "This form has been submitted. Contact Relay to add files." }, 409);
  const b = await req.json().catch(() => ({}));
  const kind = String(b.kind || "") as UploadKind;
  if (!(kind in UPLOAD_LABELS)) return json({ error: "Unknown attachment type." }, 400);
  const files: IntakeFile[] = intake.files || [];

  if (b.action === "start") {
    if (files.length >= MAX_FILES) return json({ error: `Up to ${MAX_FILES} files can be attached. Email any others to relay@stellomark.com.` }, 400);
    const size = Number(b.size) || 0;
    if (size > MAX_FILE_MB * 1024 * 1024) return json({ error: `Files can be up to ${MAX_FILE_MB} MB.` }, 400);
    const type = String(b.type || "");
    if (type && !FILE_TYPES.includes(type)) return json({ error: "Please attach a PDF, image, Word, Excel or CSV file." }, 400);
    await ensureBucket();
    const path = `${intake.id}/${Date.now()}-${safeName(b.name)}`;
    const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error("intake upload url", error?.message);
      return json({ error: "Couldn't start the upload. Please try again." }, 500);
    }
    return json({ uploadUrl: data.signedUrl, path });
  }

  if (b.action === "done") {
    const path = String(b.path || "");
    if (!path.startsWith(`${intake.id}/`) || path.includes("..")) return json({ error: "Unknown file." }, 400);
    const [folder, fname] = [intake.id, path.slice(intake.id.length + 1)];
    const { data: listed } = await db().storage.from(BUCKET).list(folder, { search: fname, limit: 5 });
    const found = (listed || []).find((f) => f.name === fname);
    if (!found) return json({ error: "The upload didn't finish. Please try again." }, 400);
    if (files.some((f) => f.path === path)) return json({ files });
    const entry: IntakeFile = {
      path,
      name: String(b.name || fname).slice(0, 160),
      kind,
      size: Number((found.metadata as { size?: number } | null)?.size) || 0,
      uploaded_at: new Date().toISOString(),
    };
    const next = [...files, entry];
    const { error } = await db().from("district_intakes").update({ files: next, updated_at: entry.uploaded_at }).eq("id", intake.id);
    if (error) throw new Error(error.message);
    return json({ files: next });
  }

  return json({ error: "Unknown action." }, 400);
}

// Remove an attachment: ?path=
export async function DELETE(req: Request, { params }: Ctx) {
  const { token } = await params;
  const r = await intakeByToken(req, token);
  if (!r.intake) return json({ error: r.error }, r.status);
  if (r.intake.status !== "draft") return json({ error: "This form has been submitted. Contact Relay to remove files." }, 409);
  const path = new URL(req.url).searchParams.get("path") || "";
  const files = r.intake.files || [];
  if (!files.some((f) => f.path === path)) return json({ files });
  const next = files.filter((f) => f.path !== path);
  const { error } = await db().from("district_intakes").update({ files: next, updated_at: new Date().toISOString() }).eq("id", r.intake.id);
  if (error) throw new Error(error.message);
  await removeFiles([path]);
  return json({ files: next });
}

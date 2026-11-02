import { db } from "@/lib/db";
import { json, withSuper } from "@/lib/http";

export const dynamic = "force-dynamic";

const clip = (v: unknown, n: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, n);

// Public: the "Bring Relay to your school" form.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (b.website) return json({ ok: true }); // hidden field: only bots fill it in
  const row = {
    first_name: clip(b.first_name, 80),
    last_name: clip(b.last_name, 80),
    email: clip(b.email, 160).toLowerCase(),
    phone: clip(b.phone, 40) || null,
    role: clip(b.role, 80) || null,
    organization: clip(b.organization, 160),
    location: clip(b.location, 120) || null,
    students: clip(b.students, 40) || null,
    message: String(b.message ?? "").trim().slice(0, 3000) || null,
  };
  if (!row.first_name || !row.last_name) return json({ error: "Please enter your first and last name." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) return json({ error: "Please enter a valid email address." }, 400);
  if (!row.organization) return json({ error: "Please enter your school or district." }, 400);
  const { error } = await db().from("school_requests").insert(row);
  if (error) {
    console.error("School request failed:", error.message);
    return json({ error: "Sorry, the form isn't working right now. Please email relay@stellomark.com." }, 500);
  }
  return json({ ok: true });
}

// Super admins: list requests.
export const GET = withSuper(async () => {
  const { data, error } = await db().from("school_requests").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  return json({ requests: data || [] });
});

// Super admins: mark handled / not handled.
export const PATCH = withSuper(async (req) => {
  const b = await req.json().catch(() => ({}));
  const { error } = await db().from("school_requests").update({ handled: !!b.handled }).eq("id", String(b.id || ""));
  if (error) throw new Error(error.message);
  return json({ ok: true });
});

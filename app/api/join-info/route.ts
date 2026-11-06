import { db } from "@/lib/db";
import { json } from "@/lib/http";
import { districtForSchool } from "@/lib/schools";

export const dynamic = "force-dynamic";

// Public: who a parent sign-up link (relaytext.io/join?t=CODE) belongs to. Shows only name, school and district.
export async function GET(req: Request) {
  const code = (new URL(req.url).searchParams.get("t") || "").trim().toLowerCase();
  if (!code) return json({ teacher: null });
  const { data } = await db().from("staff").select("name, school, school_id, status").eq("join_code", code).maybeSingle();
  if (!data || data.status !== "active") return json({ teacher: null });
  return json({ teacher: { name: data.name, school: data.school, district: await districtForSchool(data.school_id) } });
}

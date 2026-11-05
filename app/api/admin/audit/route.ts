import { db } from "@/lib/db";
import { json, withAdmin } from "@/lib/http";
import { schoolLimit } from "@/lib/staff";

export const dynamic = "force-dynamic";

// Activity log, newest first. Super admins see everything; school admins see their school and their own actions.
export const GET = withAdmin(async (req, me) => {
  const url = new URL(req.url);
  const before = url.searchParams.get("before");
  let q = db().from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
  if (before) q = q.lt("created_at", before);
  const lim = schoolLimit(me);
  if (lim !== undefined) q = lim ? q.or(`school_id.eq.${lim},actor_email.eq.${me.email}`) : q.eq("actor_email", me.email);
  const { data, error } = await q;
  if (error) {
    if (/audit_log/.test(error.message)) return json({ error: "The Activity Log needs a database update: run the latest supabase/schema.sql in Supabase." }, 500);
    throw new Error(error.message);
  }
  return json({ entries: data || [] });
});

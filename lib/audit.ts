import { db, type Staff } from "./db";

// Activity log (audit_log table, see supabase/schema.sql). Never blocks the action it records:
// if the table is missing or the insert fails, it logs a warning and carries on.

export type AuditEntry = {
  action: string;
  targetType?: string;
  targetId?: string | null;
  targetLabel?: string | null;
  schoolId?: string | null;
  detail?: Record<string, unknown>;
};

let warned = false;

export async function logAudit(me: Pick<Staff, "id" | "email" | "school_id">, e: AuditEntry, opts: { dedupeMinutes?: number } = {}) {
  try {
    const supa = db();
    if (opts.dedupeMinutes) {
      // e.g. don't record every refresh of an inbox someone is viewing
      const since = new Date(Date.now() - opts.dedupeMinutes * 60_000).toISOString();
      let q = supa.from("audit_log").select("id", { count: "exact", head: true }).eq("actor_email", me.email).eq("action", e.action).gte("created_at", since);
      q = e.targetId ? q.eq("target_id", e.targetId) : q.is("target_id", null);
      const { count, error } = await q;
      if (!error && (count ?? 0) > 0) return;
    }
    const { error } = await supa.from("audit_log").insert({
      actor_id: me.id,
      actor_email: me.email,
      action: e.action,
      target_type: e.targetType || null,
      target_id: e.targetId || null,
      target_label: e.targetLabel || null,
      school_id: e.schoolId === undefined ? me.school_id || null : e.schoolId,
      detail: e.detail || null,
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (/audit_log/.test(m) && /exist|schema cache|relation/i.test(m)) {
      if (!warned) console.warn("Activity log is off: run the latest supabase/schema.sql to create audit_log.");
      warned = true;
    } else console.error("audit log", m);
  }
}

// Wrap an API handler: work out what it's about to do (before it runs, so names survive a delete),
// run it, and record it only if it succeeded.
export function withAudit(
  handler: (req: Request, me: Staff) => Promise<Response>,
  describe: (body: any, me: Staff, req: Request) => Promise<AuditEntry | null> | AuditEntry | null,
) {
  return async (req: Request, me: Staff): Promise<Response> => {
    const body = req.method === "GET" ? {} : await req.clone().json().catch(() => ({}));
    const entry = await Promise.resolve(describe(body, me, req)).catch(() => null);
    const res = await handler(req, me);
    if (entry && res.ok) {
      const result = await res.clone().json().catch(() => ({}));
      const keep: Record<string, unknown> = {};
      for (const k of ["added", "updated", "deleted", "moved", "number", "to"]) if (result?.[k] !== undefined) keep[k] = result[k];
      await logAudit(me, { ...entry, detail: { ...(entry.detail || {}), ...keep } });
    }
    return res;
  };
}

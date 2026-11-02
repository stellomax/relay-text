import { db, Contact } from "@/lib/db";
import { baseUrlFromRequest } from "@/lib/config";
import { json, withAuth } from "@/lib/http";
import { sendToContacts } from "@/lib/messaging";
import { canSeeParent, conversationFor, type Parent } from "@/lib/parents";
import { canWrite } from "@/lib/staff";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Send one English message. Recipients are parents chosen from the Parents list (parentIds),
// or an existing conversation (contactIds, when replying in a thread).
// Each parent gets a separate private text, in their language, from the sender's number.
export const POST = withAuth(async (req, me) => {
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "").trim();
  if (!text) return json({ error: "Write a message first." }, 400);
  if (text.length > 1000) return json({ error: "Keep messages under 1,000 characters." }, 400);

  const parentIds: string[] = Array.isArray(body.parentIds) ? body.parentIds.map(String) : [];
  const contactIds: string[] = Array.isArray(body.contactIds) ? body.contactIds.map(String) : [];
  if (!parentIds.length && !contactIds.length) return json({ error: "Choose at least one parent." }, 400);
  if (parentIds.length + contactIds.length > 500) return json({ error: "You can message up to 500 parents at a time." }, 400);

  let mine: Contact[] = [];
  const skipped: string[] = [];

  if (contactIds.length) {
    const { data, error } = await db().from("contacts").select("*").in("id", contactIds);
    if (error) throw new Error(error.message);
    mine = ((data || []) as Contact[]).filter((c) => canWrite(me, c));
    if (!mine.length) return json({ error: "You can only text parents in your own Messages." }, 403);
  }

  if (parentIds.length) {
    const parents: Parent[] = [];
    for (let i = 0; i < parentIds.length; i += 200) {
      const { data, error } = await db().from("parents").select("*").in("id", parentIds.slice(i, i + 200));
      if (error) throw new Error(error.message);
      parents.push(...((data || []) as Parent[]).filter((p) => canSeeParent(me, p)));
    }
    if (!parents.length) return json({ error: "Those parents aren't on your Parents list." }, 403);
    for (const p of parents) {
      if (p.opted_out || !p.consent_at) {
        skipped.push(p.parent_name);
        continue;
      }
      mine.push(await conversationFor(me.id, p));
    }
  }

  // Only text parents whose consent is on record and who haven't opted out.
  const contacts = mine.filter((c) => c.consent_at && !c.opted_out);
  const noConsent = [...skipped, ...mine.filter((c) => !c.consent_at || c.opted_out).map((c) => c.parent_name)];
  if (!contacts.length) {
    return json(
      {
        error:
          noConsent.length === 1
            ? `${noConsent[0]} can't be texted: they opted out or don't have consent on record. Ask your admin to check the Parents list.`
            : "None of these parents can be texted: they opted out or don't have consent on record.",
      },
      400
    );
  }

  const summary = await sendToContacts(contacts, text, {
    statusCallback: `${baseUrlFromRequest(req)}/api/sms/status`,
    sentBy: me.email,
  });
  return json({ summary, noConsent, contactIds: contacts.map((c) => c.id) });
});

import { db, Contact, Message, Staff } from "./db";
import { env, twilioConfigured } from "./config";
import { sendSms } from "./twilio";
import { translate, toEnglish, sameLang } from "./translate";
import { errorMessage } from "./http";
import { senderNumber } from "./numbers";

const STOP_WORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "REVOKE", "OPTOUT"];
const START_WORDS = ["START", "UNSTOP", "YES", "OPTIN"];

export type SendSummary = {
  sent: number;
  simulated: number;
  failed: number;
  skipped: number;
  errors: { contact: string; error: string }[];
};

// Translate once per language, then send a separate one-to-one text to every contact,
// from the number of the teacher each family belongs to.
export async function sendToContacts(
  contacts: Contact[],
  textEn: string,
  opts: { statusCallback?: string; sentBy?: string }
): Promise<SendSummary> {
  const summary: SendSummary = { sent: 0, simulated: 0, failed: 0, skipped: 0, errors: [] };
  const live = twilioConfigured();
  const translations = new Map<string, string>();
  const staffCache = new Map<string, Staff | null>();

  async function staffFor(id: string | null): Promise<Staff | null> {
    if (!id) return null;
    if (!staffCache.has(id)) {
      const { data } = await db().from("staff").select("*").eq("id", id).maybeSingle();
      staffCache.set(id, (data as Staff) || null);
    }
    return staffCache.get(id) || null;
  }

  for (const c of contacts) {
    if (c.opted_out) {
      summary.skipped++;
      continue;
    }
    const staff = await staffFor(c.staff_id);
    const from = senderNumber(staff);
    const row: Partial<Message> = {
      contact_id: c.id,
      staff_id: c.staff_id,
      direction: "outbound",
      body_en: textEn,
      language: c.language,
      sent_by: opts.sentBy || null,
      to_number: c.phone,
      from_number: from || staff?.phone_number || env.twilioFrom || null,
      is_read: true,
    };
    try {
      let translated = translations.get(c.language);
      if (translated === undefined) {
        translated = sameLang(c.language, "en") ? textEn : (await translate(textEn, c.language, "en")).text;
        translations.set(c.language, translated);
      }
      row.body_translated = translated;

      if (live) {
        const r = await sendSms(c.phone, translated, opts.statusCallback, from);
        row.twilio_sid = r.sid;
        row.status = r.status;
        row.from_number = r.from || row.from_number;
        summary.sent++;
      } else {
        row.status = "simulated";
        row.simulated = true;
        summary.simulated++;
      }
    } catch (e) {
      row.status = "failed";
      row.error = errorMessage(e);
      summary.failed++;
      summary.errors.push({ contact: c.parent_name, error: row.error });
    }
    const { error } = await db().from("messages").insert(row);
    if (error) throw new Error(error.message);
  }
  return summary;
}

// Which teacher a reply belongs to: the teacher whose number it was sent to; for the shared main number,
// the teacher who last texted this parent from it.
async function routeInbound(from: string, to: string | null): Promise<string | null> {
  const supa = db();
  if (to) {
    const { data: owner } = await supa
      .from("staff")
      .select("id")
      .eq("phone_number", to)
      .eq("phone_placeholder", false)
      .maybeSingle();
    if (owner) return owner.id;
  }
  const { data: last } = await supa
    .from("messages")
    .select("staff_id, from_number")
    .eq("direction", "outbound")
    .eq("to_number", from)
    .order("created_at", { ascending: false })
    .limit(10);
  const hit = (last || []).find((m) => !to || !m.from_number || m.from_number === to);
  return hit?.staff_id || null;
}

// A reply from a parent: real (Twilio webhook) or simulated from the admin screen (pass the contact).
export async function receiveInbound(params: {
  from: string;
  to?: string | null;
  body: string;
  twilioSid?: string | null;
  simulated?: boolean;
  contact?: Contact;
}) {
  const supa = db();
  const text = (params.body || "").trim();
  let contact = params.contact || null;

  if (!contact) {
    const staffId = await routeInbound(params.from, params.to || null);
    let q = supa.from("contacts").select("*").eq("phone", params.from);
    q = staffId ? q.eq("staff_id", staffId) : q.is("staff_id", null);
    const { data } = await q.maybeSingle();
    contact = (data as Contact) || null;

    // Unknown number: create a contact so the reply is never lost.
    if (!contact) {
      let lang = "es";
      try {
        const probe = await translate(text || "hello", "en");
        if (probe.detected && !sameLang(probe.detected, "en")) lang = probe.detected;
      } catch {}
      const ins = await supa
        .from("contacts")
        .insert({ parent_name: `Unknown ${params.from}`, phone: params.from, language: lang, staff_id: staffId })
        .select("*")
        .single();
      if (ins.error) throw new Error(ins.error.message);
      contact = ins.data as Contact;
    }
  }
  const c = contact;

  // STOP applies to every number in the Messaging Service, so mark the parent opted out everywhere.
  const keyword = text.toUpperCase().replace(/[^A-Z]/g, "");
  if (STOP_WORDS.includes(keyword)) {
    await supa.from("contacts").update({ opted_out: true }).eq("phone", c.phone);
  } else if (START_WORDS.includes(keyword)) {
    await supa.from("contacts").update({ opted_out: false }).eq("phone", c.phone);
  }

  let english = text;
  let language: string | null = c.language;
  let error: string | null = null;
  try {
    const r = await toEnglish(text, c.language);
    english = r.english;
    language = r.language;
  } catch (e) {
    error = errorMessage(e);
  }

  const { error: insErr } = await supa.from("messages").insert({
    contact_id: c.id,
    staff_id: c.staff_id,
    direction: "inbound",
    body_en: english,
    body_translated: text,
    language,
    status: params.simulated ? "simulated" : "received",
    error,
    twilio_sid: params.twilioSid || null,
    from_number: params.from,
    to_number: params.to || null,
    is_read: false,
    simulated: !!params.simulated,
  });
  if (insErr) throw new Error(insErr.message);
  return c;
}

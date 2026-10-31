import { db, Contact, Message } from "./db";
import { twilioConfigured } from "./config";
import { sendSms } from "./twilio";
import { translate, toEnglish, sameLang } from "./translate";
import { errorMessage } from "./http";

const STOP_WORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "REVOKE", "OPTOUT"];
const START_WORDS = ["START", "UNSTOP", "YES", "OPTIN"];

export type SendSummary = {
  sent: number;
  simulated: number;
  failed: number;
  skipped: number;
  errors: { contact: string; error: string }[];
};

// Fan-out: translate once per language, then send a separate one-to-one text to every contact.
export async function sendToContacts(
  contacts: Contact[],
  textEn: string,
  opts: { statusCallback?: string; sentBy?: string }
): Promise<SendSummary> {
  const summary: SendSummary = { sent: 0, simulated: 0, failed: 0, skipped: 0, errors: [] };
  const live = twilioConfigured();
  const translations = new Map<string, string>();

  for (const c of contacts) {
    if (c.opted_out) {
      summary.skipped++;
      continue;
    }
    const row: Partial<Message> = {
      contact_id: c.id,
      direction: "outbound",
      body_en: textEn,
      language: c.language,
      sent_by: opts.sentBy || null,
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
        const r = await sendSms(c.phone, translated, opts.statusCallback);
        row.twilio_sid = r.sid;
        row.status = r.status;
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

// A reply from a parent (real via Twilio webhook, or simulated from the admin screen).
export async function receiveInbound(params: {
  from: string;
  body: string;
  twilioSid?: string | null;
  simulated?: boolean;
}) {
  const supa = db();
  const text = (params.body || "").trim();
  let { data: contact } = await supa.from("contacts").select("*").eq("phone", params.from).maybeSingle();

  const keyword = text.toUpperCase().replace(/[^A-Z]/g, "");

  // Unknown number: create a contact so the reply is never lost.
  if (!contact) {
    let lang = "es";
    try {
      const probe = await translate(text || "hello", "en");
      if (probe.detected) lang = probe.detected;
    } catch {}
    const ins = await supa
      .from("contacts")
      .insert({ parent_name: `Unknown ${params.from}`, phone: params.from, language: lang })
      .select("*")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    contact = ins.data;
  }
  const c = contact as Contact;

  if (STOP_WORDS.includes(keyword)) {
    await supa.from("contacts").update({ opted_out: true }).eq("id", c.id);
  } else if (START_WORDS.includes(keyword) && c.opted_out) {
    await supa.from("contacts").update({ opted_out: false }).eq("id", c.id);
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
    direction: "inbound",
    body_en: english,
    body_translated: text,
    language,
    status: params.simulated ? "simulated" : "received",
    error,
    twilio_sid: params.twilioSid || null,
    is_read: false,
    simulated: !!params.simulated,
  });
  if (insErr) throw new Error(insErr.message);
  return c;
}

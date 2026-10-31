import { db } from "@/lib/db";
import { baseUrlFromRequest, twilioConfigured } from "@/lib/config";
import { json, errorMessage } from "@/lib/http";
import { toE164 } from "@/lib/phone";
import { LANGUAGES } from "@/lib/languages";
import { OPT_IN_CONFIRMATION } from "@/lib/brand";
import { sendSms } from "@/lib/twilio";

export const dynamic = "force-dynamic";

// Public: a parent signs up for texts at /join. Records consent, then sends one confirmation text.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parent_name = String(body.parent_name || "").trim().slice(0, 120);
  const child_name = String(body.child_name || "").trim().slice(0, 120) || null;
  const phone = toE164(String(body.phone || ""));
  const language = LANGUAGES.some((l) => l.code === body.language) ? String(body.language) : "es";

  if (body.consent !== true) return json({ error: "Please check the box to agree to receive text messages." }, 400);
  if (!parent_name) return json({ error: "Please enter your name." }, 400);
  if (!phone) return json({ error: "Please enter a valid mobile number, like (303) 555-1234." }, 400);

  try {
    const supa = db();
    const consent = { opted_out: false, consent_at: new Date().toISOString(), consent_source: "web form: /join" };
    const { data: existing } = await supa.from("contacts").select("id").eq("phone", phone).maybeSingle();
    let contactId: string;
    if (existing) {
      const { error } = await supa
        .from("contacts")
        .update({ parent_name, language, ...(child_name ? { child_name } : {}), ...consent })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      contactId = existing.id;
    } else {
      const { data, error } = await supa
        .from("contacts")
        .insert({ parent_name, child_name, phone, language, ...consent })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      contactId = data.id;
    }

    // Confirmation text with the required disclosures (in English, so STOP/HELP are unambiguous).
    const row: Record<string, unknown> = {
      contact_id: contactId,
      direction: "outbound",
      body_en: OPT_IN_CONFIRMATION,
      body_translated: OPT_IN_CONFIRMATION,
      language: "en",
      sent_by: "opt-in confirmation",
    };
    if (twilioConfigured()) {
      try {
        const r = await sendSms(phone, OPT_IN_CONFIRMATION, `${baseUrlFromRequest(req)}/api/sms/status`);
        row.twilio_sid = r.sid;
        row.status = r.status;
      } catch (e) {
        row.status = "failed";
        row.error = errorMessage(e);
      }
    } else {
      row.status = "simulated";
      row.simulated = true;
    }
    await supa.from("messages").insert(row);
    return json({ ok: true });
  } catch (e) {
    console.error("opt-in failed", e);
    return json({ error: "Sign-up isn't available right now. Please try again later." }, 500);
  }
}

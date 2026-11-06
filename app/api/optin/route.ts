import { db } from "@/lib/db";
import { baseUrlFromRequest, env, twilioConfigured } from "@/lib/config";
import { json, errorMessage } from "@/lib/http";
import { toE164 } from "@/lib/phone";
import { isLanguageCode } from "@/lib/languages";
import { OPT_IN_CONFIRMATION } from "@/lib/brand";
import { sendSms } from "@/lib/twilio";
import type { Staff } from "@/lib/db";
import { senderNumber } from "@/lib/numbers";
import { findParentByPhone } from "@/lib/parents";
import { prettyPhone } from "@/lib/phone";
import { districtForSchool } from "@/lib/schools";
import { clientIp, limited, record, TOO_MANY } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// Public: a parent signs up for texts at /join (or a teacher's link, /join?t=CODE).
// Records consent, then sends one confirmation text from that teacher's number.
// Abuse limits: per IP and per phone number, plus an hourly cap on confirmation texts. A number that replied STOP
// is never turned back on from this form (only a START reply does that), and an existing parent's name and language
// on the Parents list are never overwritten from here (admins edit those).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parent_name = String(body.parent_name || "").trim().slice(0, 120);
  const child_name = String(body.child_name || "").trim().slice(0, 120) || null;
  const phone = toE164(String(body.phone || ""));
  const language = isLanguageCode(body.language) ? body.language : "es";

  if (body.consent !== true) return json({ error: "Please check the box to agree to receive text messages." }, 400);
  if (!parent_name) return json({ error: "Please enter your name." }, 400);
  if (!phone) return json({ error: "Please enter a valid mobile number, like (303) 555-1234." }, 400);

  const ip = `ip:${clientIp(req)}`;
  if (
    await limited([
      { kind: "optin", key: ip, max: 5, minutes: 10 },
      { kind: "optin", key: ip, max: 20, minutes: 24 * 60 },
      { kind: "optin", key: `phone:${phone}`, max: 3, minutes: 24 * 60 },
    ])
  ) {
    return json({ error: TOO_MANY }, 429);
  }
  await record("optin", ip, `phone:${phone}`);

  try {
    const supa = db();
    const { count: lastHour } = await supa
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sent_by", "opt-in confirmation")
      .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
    if ((lastHour ?? 0) >= 200) {
      console.warn("Opt-in hourly cap reached");
      return json({ error: "Sign-up is very busy right now. Please try again in an hour." }, 429);
    }
    const consent: Record<string, unknown> = { opted_out: false, consent_at: new Date().toISOString(), consent_source: "web form: /join" };
    // Which teacher's link was used (if any).
    let teacher: Staff | null = null;
    const code = String(body.t || "").trim().toLowerCase();
    if (code) {
      const { data: t } = await supa.from("staff").select("*").eq("join_code", code).eq("status", "active").maybeSingle();
      teacher = (t as Staff) || null;
    }
    // Parents sign up only through a teacher's link or code.
    if (!teacher) {
      return json({ error: "Please use the sign-up link or code from your child’s teacher." }, 400);
    }
    const staffId = teacher.id;

    // A number that replied STOP stays opted out until the parent texts START.
    const listedFirst = await findParentByPhone(teacher.school_id || null, phone);
    const { data: optedOut } = await supa.from("contacts").select("id").eq("phone", phone).eq("opted_out", true).limit(1);
    if (listedFirst?.opted_out || (optedOut || []).length) {
      const num = senderNumber(teacher) || env.twilioFrom || "";
      return json(
        { error: `This number asked not to get texts (it replied STOP). To turn texts back on, text START${num ? ` to ${prettyPhone(num)}` : ""}.` },
        409,
      );
    }
    // Record exactly who the parent agreed to hear from (their school district), as evidence of consent.
    const district = await districtForSchool(teacher.school_id);
    const source = `web form: /join?t=${code} (agreed to texts from ${district})`;
    consent.consent_source = source;

    // Parents who sign up through a teacher's link join that school's Parents list (or update their entry).
    const listed = listedFirst;
    const parentFields = { parent_name, language, opted_out: false, consent_at: consent.consent_at, consent_source: source };
    let parentId: string | null = listed?.id || null;
    if (listed) {
      // Already on the list: keep the admin's name and language; add a new student and record consent if missing.
      const students = child_name && !listed.students.some((s) => s.toLowerCase() === child_name.toLowerCase()) ? [...listed.students, child_name] : listed.students;
      await supa
        .from("parents")
        .update({ students, ...(listed.consent_at ? {} : { consent_at: consent.consent_at, consent_source: source }), updated_at: new Date().toISOString() })
        .eq("id", listed.id);
    } else {
      const { data: p } = await supa
        .from("parents")
        .insert({ ...parentFields, phone, students: child_name ? [child_name] : [], school_id: teacher.school_id || null })
        .select("id")
        .single();
      parentId = p?.id || null;
    }
    if (parentId) consent.parent_id = parentId;

    let lookup = supa.from("contacts").select("id").eq("phone", phone);
    lookup = staffId ? lookup.eq("staff_id", staffId) : lookup.is("staff_id", null);
    const { data: existing } = await lookup.maybeSingle();
    let contactId: string;
    if (existing) {
      // Existing conversation: don't rename it or change its language from a public form; just record consent.
      const { error } = await supa.from("contacts").update(consent).eq("id", existing.id);
      if (error) throw new Error(error.message);
      contactId = existing.id;
    } else {
      const { data, error } = await supa
        .from("contacts")
        .insert({ parent_name, child_name, phone, language, staff_id: staffId, ...consent })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      contactId = data.id;
    }

    // Confirmation text with the required disclosures (in English, so STOP/HELP are unambiguous).
    const row: Record<string, unknown> = {
      contact_id: contactId,
      staff_id: staffId,
      to_number: phone,
      from_number: senderNumber(teacher) || teacher?.phone_number || null,
      direction: "outbound",
      body_en: OPT_IN_CONFIRMATION,
      body_translated: OPT_IN_CONFIRMATION,
      language: "en",
      sent_by: "opt-in confirmation",
    };
    if (twilioConfigured()) {
      try {
        const r = await sendSms(phone, OPT_IN_CONFIRMATION, `${baseUrlFromRequest(req)}/api/sms/status`, senderNumber(teacher));
        row.from_number = r.from || row.from_number;
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

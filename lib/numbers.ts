import { db, Staff } from "./db";
import { env, twilioConfigured } from "./config";
import { buyNumber, releaseNumber } from "./twilio";
import { BRAND } from "./brand";

// Real numbers are bought only when this is switched on in Vercel (TWILIO_AUTO_BUY_NUMBERS=true),
// so nothing is charged before the A2P campaign is approved.
export function autoBuyEnabled(): boolean {
  return twilioConfigured() && /^(1|true|yes|on)$/i.test((process.env.TWILIO_AUTO_BUY_NUMBERS || "").trim());
}

const DEFAULT_AREA = () => (process.env.DEFAULT_AREA_CODE || "303").replace(/\D/g, "").slice(0, 3) || "303";

// Demo numbers use the 555-01xx range, which is reserved for fiction and never reaches a real phone.
async function placeholderNumber(areaCode: string): Promise<string> {
  const { data } = await db().from("staff").select("phone_number").like("phone_number", `+1${areaCode}55501%`);
  const used = new Set((data || []).map((r) => r.phone_number));
  for (let i = 0; i < 100; i++) {
    const n = `+1${areaCode}55501${String((i * 37) % 100).padStart(2, "0")}`;
    if (!used.has(n)) return n;
  }
  throw new Error(`No demo numbers left in area code ${areaCode}.`);
}

export type AssignResult = { phone: string; placeholder: boolean; note?: string };

// Give a staff member a number: a real Twilio number when buying is on, otherwise a demo placeholder.
// Replaces an existing placeholder; leaves an existing real number alone.
export async function assignNumber(staff: Staff, baseUrl: string): Promise<AssignResult> {
  if (staff.phone_number && !staff.phone_placeholder) return { phone: staff.phone_number, placeholder: false };
  const area = staff.area_code || DEFAULT_AREA();

  if (autoBuyEnabled()) {
    const r = await buyNumber({
      areaCode: area,
      friendlyName: `${BRAND} – ${staff.name || staff.email}`,
      smsUrl: `${env.appUrl || baseUrl}/api/sms/incoming`,
    });
    const { error } = await db()
      .from("staff")
      .update({ phone_number: r.phone, phone_sid: r.sid, phone_placeholder: false })
      .eq("id", staff.id);
    if (error) throw new Error(error.message);
    return { phone: r.phone, placeholder: false, note: r.note || undefined };
  }

  if (staff.phone_number) return { phone: staff.phone_number, placeholder: true };
  const phone = await placeholderNumber(area);
  const { error } = await db().from("staff").update({ phone_number: phone, phone_sid: null, phone_placeholder: true }).eq("id", staff.id);
  if (error) throw new Error(error.message);
  return {
    phone,
    placeholder: true,
    note: "Demo number. A real number is bought automatically once TWILIO_AUTO_BUY_NUMBERS is turned on.",
  };
}

// Give up a staff member's number (stops the monthly charge for a real one).
export async function unassignNumber(staff: Staff): Promise<void> {
  if (staff.phone_sid && !staff.phone_placeholder && twilioConfigured()) await releaseNumber(staff.phone_sid);
  const { error } = await db().from("staff").update({ phone_number: null, phone_sid: null, phone_placeholder: false }).eq("id", staff.id);
  if (error) throw new Error(error.message);
}

// The number a staff member's texts go out from, or null to use the shared main number.
export function senderNumber(staff: Pick<Staff, "phone_number" | "phone_placeholder"> | null): string | null {
  return staff && staff.phone_number && !staff.phone_placeholder ? staff.phone_number : null;
}

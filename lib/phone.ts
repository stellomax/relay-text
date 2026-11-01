// Normalize a typed phone number to E.164 (assumes U.S. when no country code is given).
export function toE164(input: string): string | null {
  const trimmed = (input || "").trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return digits.length >= 8 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function prettyPhone(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164 || "");
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

// Format a U.S. number as it's typed: "3035551234" → "(303) 555-1234".
// International numbers (starting with +) are left alone.
// `prev` lets backspace work across the ")", " " and "-" instead of getting stuck.
export function formatPhoneInput(value: string, prev = ""): string {
  if (value.trim().startsWith("+")) return value;
  let digits = value.replace(/\D/g, "");
  const prevDigits = prev.replace(/\D/g, "");
  if (value.length < prev.length && digits === prevDigits) digits = digits.slice(0, -1);
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (!digits) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

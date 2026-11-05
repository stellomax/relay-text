import { db } from "./db";

export type School = {
  id: string;
  name: string;
  district: string | null;
  area_code: string | null;
  signup_code: string | null;
  active: boolean;
  retention_months?: number;
  created_at: string;
};

export async function schoolById(id: string | null | undefined): Promise<School | null> {
  if (!id) return null;
  const { data } = await db().from("schools").select("*").eq("id", id).maybeSingle();
  return (data as School) || null;
}

// The school whose reusable sign-up code this is (only while the school's code is turned on).
export async function schoolByCode(code: string): Promise<School | null> {
  if (!/^\d{5}$/.test(code)) return null;
  const { data } = await db().from("schools").select("*").eq("signup_code", code).eq("active", true).maybeSingle();
  return (data as School) || null;
}

// Is this 5-digit code free (not a school code and not an unused one-time code)?
export async function codeIsFree(code: string, exceptSchoolId?: string): Promise<boolean> {
  const supa = db();
  const [{ data: s }, { data: i }] = await Promise.all([
    supa.from("schools").select("id").eq("signup_code", code),
    supa.from("invites").select("id").eq("code", code).is("used_at", null),
  ]);
  return !(s || []).some((r) => r.id !== exceptSchoolId) && !(i || []).length;
}

export async function newFreeCode(exceptSchoolId?: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = String(10000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 90000));
    if (await codeIsFree(code, exceptSchoolId)) return code;
  }
  throw new Error("Couldn't find a free code. Try again.");
}

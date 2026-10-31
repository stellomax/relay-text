import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./config";

// A separate client for Supabase Auth calls (sign-in, creating users, setting passwords).
export function authClient(): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Create a login, or set the password of an existing one with the same email. Returns the user id.
export async function upsertAuthUser(email: string, password: string): Promise<string> {
  const admin = authClient().auth.admin;
  const created = await admin.createUser({ email, password, email_confirm: true });
  if (!created.error && created.data.user) return created.data.user.id;

  const msg = (created.error?.message || "").toLowerCase();
  if (!msg.includes("already") && !msg.includes("exists") && !msg.includes("registered")) {
    throw new Error(created.error?.message || "Couldn't create the login.");
  }
  const existing = await findAuthUserId(email);
  if (!existing) throw new Error("A login with this email exists but couldn't be found.");
  const upd = await admin.updateUserById(existing, { password, email_confirm: true });
  if (upd.error) throw new Error(upd.error.message);
  return existing;
}

export async function findAuthUserId(email: string): Promise<string | null> {
  const admin = authClient().auth.admin;
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u: { email?: string }) => (u.email || "").toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

export async function setPassword(userId: string, password: string) {
  const { error } = await authClient().auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(error.message);
}

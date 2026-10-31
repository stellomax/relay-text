import { baseUrlFromRequest, env, supabaseConfigured, translateConfigured, twilioConfigured } from "@/lib/config";
import { db } from "@/lib/db";
import { json, withAdmin, errorMessage } from "@/lib/http";
import { autoBuyEnabled } from "@/lib/numbers";
import { translate } from "@/lib/translate";

export const dynamic = "force-dynamic";

// Health check for the Setup page. Never returns secret values.
export const GET = withAdmin(async (req, me) => {
  const base = baseUrlFromRequest(req);

  let database = { ok: false, detail: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" };
  if (supabaseConfigured()) {
    const { error } = await db().from("contacts").select("id", { count: "exact", head: true });
    database = error
      ? { ok: false, detail: error.message.includes("does not exist") || error.code === "42P01" ? "Connected, but tables are missing. Run supabase/schema.sql." : error.message }
      : { ok: true, detail: "Connected, tables found" };
  }

  let translation = { ok: false, detail: "Missing GOOGLE_TRANSLATE_API_KEY" };
  if (translateConfigured()) {
    try {
      const r = await translate("Hello", "es", "en");
      translation = { ok: true, detail: `Working ("Hello" → "${r.text}")` };
    } catch (e) {
      translation = { ok: false, detail: errorMessage(e) };
    }
  }

  const sms = twilioConfigured()
    ? {
        ok: true,
        detail: `Live texting from ${env.twilioMessagingService ? "Messaging Service " + env.twilioMessagingService : env.twilioFrom}`,
      }
    : { ok: false, detail: "Demo mode: texts are simulated. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER to go live." };

  return json({
    user: me.email,
    autoBuy: autoBuyEnabled(),
    database,
    translation,
    sms,
    webhooks: {
      incoming: `${base}/api/sms/incoming`,
      status: `${base}/api/sms/status`,
    },
  });
});

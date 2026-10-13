# Text Connect

Text families in their own language. No app required on their phone.

Staff write in English. Each family gets a normal SMS in their home language, and their replies come back translated into English. Broadcasts fan out into separate private one-to-one texts, never a group chat.

**Stack:** Next.js on Vercel · Supabase (database + staff logins) · Twilio (SMS) · Google Cloud Translation

## Go live

### 1. Supabase
1. SQL Editor → New query → paste `supabase/schema.sql` → **Run**.
2. Authentication → Users → **Add user** → create a login (email + password) for each staff member. Tick "Auto confirm".
3. Project Settings → API: copy the **Project URL** and the **service_role** key.

### 2. Vercel
1. Add New → Project → import this GitHub repo → Deploy (framework is detected automatically).
2. Settings → Environment Variables, add:

| Name | Value |
|---|---|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
| `GOOGLE_TRANSLATE_API_KEY` | Google Cloud API key with Cloud Translation API enabled |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Your Twilio number, e.g. `+13035551234` |

3. Deployments → ⋯ → **Redeploy** so the variables take effect.

Leave the three Twilio variables out to run in **demo mode**: texts are simulated, translation is real, and you can use "Simulate a reply from this parent" in any thread.

### 3. Twilio
1. Phone Numbers → Manage → Active numbers → your number → Messaging configuration.
2. "A message comes in" → **Webhook**, **HTTP POST**, URL: `https://YOUR-APP.vercel.app/api/sms/incoming` (also shown on the app's Setup page).
3. Save. Text the number from your phone to test.

US carriers require **toll-free verification** or **A2P 10DLC registration** before texting real families at scale. A trial account can text only verified numbers.

### 4. Check
Sign in, open **Setup**. All three lights should be green (amber for Twilio means demo mode).

## Privacy
Parent phone numbers and student names are student records. The database has row-level security on with no public policies, so only the app's server can read it, and every page and API requires a staff login. Confirm district FERPA and vendor requirements before a real pilot.

## Optional settings
- `APP_URL`: set to your public address if you add a custom domain (keeps Twilio signature checks working).
- `TWILIO_MESSAGING_SERVICE_SID`: send from a Messaging Service instead of a single number.
- `SESSION_SECRET`: separate secret for staff login sessions (defaults to the service key).

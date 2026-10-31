# Relay Text

Text families in their own language. No app required on their phone.

Staff write in English. Each family gets a normal text message in their home language, and their replies come back translated into English. The screens are modeled on the iPhone Messages app.

**Phase 1:** one-to-one conversations, adding and editing families, live translation both ways, and a demo reply button.

**Stack:** Next.js on Vercel · Supabase (database + staff logins) · Twilio (SMS) · Google Cloud Translation

## Setup

### 1. Supabase
1. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
2. **Authentication → Users → Add user → Create new user**: an email and password for each staff member. Tick **Auto Confirm User**.
3. **Project Settings → API**: copy the **Project URL** and the **service_role** secret key.

### 2. Vercel
1. **Add New → Project** → import the `relay-text` GitHub repo → **Deploy**.
2. **Settings → Environment Variables**:

| Name | Value |
|---|---|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
| `GOOGLE_TRANSLATE_API_KEY` | Google Cloud API key (Cloud Translation API enabled) |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Twilio number, e.g. `+13035551234` |
| `APP_URL` | `https://relaytext.io` |

3. **Settings → Domains → Add** `relaytext.io` (and `www.relaytext.io`, redirected to it). Add the DNS records Vercel shows at your domain registrar.
4. **Deployments → ⋯ → Redeploy** so the variables take effect.

Every push to the `main` branch on GitHub deploys to relaytext.io automatically.

Leave the three Twilio variables out to run in **demo mode**: translation is real, texts are simulated, and the **+** button in a conversation lets you play the parent's reply.

### 3. Twilio
1. **Phone Numbers → Manage → Active numbers** → your number → **Messaging configuration**.
2. **A message comes in** → **Webhook**, **HTTP POST**: `https://relaytext.io/api/sms/incoming`
3. Save. US carriers require **toll-free verification** (toll-free number) or **A2P 10DLC registration** (local number) before texting families. A trial account can text only verified numbers.

### 4. Check
Sign in at relaytext.io, tap the gear. All three lights should be green (orange for Twilio means demo mode).

## Privacy
Parent phone numbers and student names are student records. Row-level security is on with no public policies, so only the app's server can read the database, and every page requires a staff login. Confirm district FERPA and vendor requirements before a real pilot.

## Teachers, admins and numbers
- **Admins:** hamilton33@gmail.com and dave@84roots.com are always admins (add more with `ADMIN_EMAILS`, comma-separated). An admin account is created the first time they sign in with a Supabase login.
- **Teachers** sign up at `/signup` with a 5-digit code an admin creates under Manage Teachers → + (optionally with school, area code and admin access). Codes work once and expire after 30 days. The account is active immediately and gets its own number.
- **Numbers:** each approved teacher gets their own texting number. Until `TWILIO_AUTO_BUY_NUMBERS=true`, these are demo numbers (555-01xx, never real). With it on, approving a teacher buys a local number in their area code, points it at `/api/sms/incoming`, and adds it to `TWILIO_MESSAGING_SERVICE_SID`. Releasing a number in the admin screen stops its monthly charge.
- **Routing:** replies are matched to a teacher by the number they were sent to. Each teacher has a parent sign-up link (`/join?t=CODE`) that puts families in their inbox.

## Optional settings
- `TWILIO_AUTO_BUY_NUMBERS`: `true` to buy real numbers for approved teachers (only after the A2P campaign is approved).
- `DEFAULT_AREA_CODE`: area code used when a teacher didn't give one (default 303).
- `ADMIN_EMAILS`: extra admin emails, comma-separated.
- `TWILIO_MESSAGING_SERVICE_SID`: send from a Messaging Service instead of a single number.
- `SESSION_SECRET`: separate secret for staff login sessions (defaults to the service key).
- Outgoing bubble color: `--bubble-out` in `app/globals.css` (Relay Text purple by default).

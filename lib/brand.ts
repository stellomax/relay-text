// Names and addresses shown on the public sign-up, Privacy Policy and Terms pages.
export const BRAND = "Relay";
// Legal name of the Brand registered with Twilio (A2P 10DLC). Shown on the public pages so they match.
export const COMPANY = "StelloMark, LLC"; // company name on Terms, Privacy and the opt-in (Nov 2026: StelloMark everywhere)
export const COMPANY_DISPLAY = "StelloMark, LLC"; // shown in marketing footers and the About page
export const SITE = "relaytext.io";
// Parents consent to texts from their school district (the sender), with Relay as the district's texting service.
// Used when a school has no district set. Temporary default for the first district (Nov 2026).
export const DEFAULT_DISTRICT = "Douglas County School District";
export const CONTACT_EMAIL = "relay@stellomark.com";
export const LAST_UPDATED = "October 31, 2026";

// Sent once, right after a parent signs up on relaytext.io/join.
export const OPT_IN_CONFIRMATION =
  `${BRAND}: You're signed up for text messages from your child's school, translated into your language. ` +
  `Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to opt out. ` +
  `Terms: ${SITE}/terms Privacy: ${SITE}/privacy`;

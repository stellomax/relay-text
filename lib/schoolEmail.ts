// Teachers sign up with a school email, not a personal one.
// Turned off during testing. Set to true to require school emails again on teacher sign-up.
export const REQUIRE_SCHOOL_EMAIL = false;

const PERSONAL_DOMAINS = [
  "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "rocketmail.com", "hotmail.com", "outlook.com", "live.com",
  "msn.com", "icloud.com", "me.com", "mac.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "gmx.us",
  "mail.com", "zoho.com", "yandex.com", "comcast.net", "att.net", "sbcglobal.net", "verizon.net", "cox.net",
  "charter.net", "earthlink.net", "hey.com", "fastmail.com", "tutanota.com",
];

export function isPersonalEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] || "";
  return PERSONAL_DOMAINS.includes(domain) || /^yahoo\.|^hotmail\.|^outlook\.|^live\./.test(domain);
}

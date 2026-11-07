// How many SMS segments a text uses, the way carriers (and Twilio's bill) count them.
// Plain GSM-7 text: 160 characters in one segment, 153 per segment once it's split.
// Anything outside GSM-7 (Arabic, Chinese, Burmese, emoji, many accented letters): 70, then 67 per segment.

const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\u001bÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€\f"; // these take two characters' room
const BASIC = new Set(GSM_BASIC);
const EXT = new Set(GSM_EXT);

export function segmentsOf(text: string | null | undefined): number {
  const t = text || "";
  if (!t) return 0;
  let gsmLen = 0;
  let gsm = true;
  for (const ch of t) {
    if (BASIC.has(ch)) gsmLen += 1;
    else if (EXT.has(ch)) gsmLen += 2;
    else {
      gsm = false;
      break;
    }
  }
  if (gsm) return gsmLen <= 160 ? 1 : Math.ceil(gsmLen / 153);
  const units = t.length; // UTF-16 code units, as carriers count them (an emoji is 2)
  return units <= 70 ? 1 : Math.ceil(units / 67);
}

// Letters and punctuation that aren't in GSM-7 but have a plain stand-in that keeps the meaning.
// Spanish is the main case: á í ó ú aren't in GSM-7 (é ñ ü ¿ ¡ are), so one "í" turns a 1-segment
// text into 3. Translations also bring curly quotes, dashes and ellipses.
const PLAIN: Record<string, string> = {
  á: "a", í: "i", ó: "o", ú: "u", Á: "A", Í: "I", Ó: "O", Ú: "U",
  "\u2018": "'", "\u2019": "'", "\u201C": '"', "\u201D": '"', "\u00AB": '"', "\u00BB": '"', // curly quotes, « »
  "\u2013": "-", "\u2014": "-", "\u2026": "...", "\u00A0": " ", // dashes, ellipsis, non-breaking space
};
const PLAIN_CHARS = `[${Object.keys(PLAIN).join("")}]`;
const HAS_PLAIN = new RegExp(PLAIN_CHARS);
const PLAIN_RE = new RegExp(PLAIN_CHARS, "g");

// The text to send: the same text with those characters swapped, but only when that makes it use
// fewer segments (for example Spanish going from 3 segments to 1). Otherwise the text is unchanged,
// so accents are only dropped when it saves money and room under the daily texting limits.
// Languages with other non-GSM letters (Vietnamese, Arabic, Chinese...) never qualify and keep every mark.
export function fitSegments(text: string): string {
  if (!text || !HAS_PLAIN.test(text)) return text;
  const plain = text.replace(PLAIN_RE, (ch) => PLAIN[ch]);
  return segmentsOf(plain) < segmentsOf(text) ? plain : text;
}

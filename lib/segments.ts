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

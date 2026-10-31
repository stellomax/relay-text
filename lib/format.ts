// Date labels that match the iPhone Messages app.

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function dayDiff(d: Date, now = new Date()) {
  return Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
}
const time = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

// Inbox row: "9:41 AM", "Yesterday", "Tuesday", "10/12/26"
export function listTime(iso: string): string {
  const d = new Date(iso);
  const diff = dayDiff(d);
  if (diff <= 0) return time(d);
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });
}

// Centered separator in a thread: "Today 9:41 AM", "Yesterday 4:12 PM", "Tuesday 4:12 PM", "Sat, Oct 12 at 4:12 PM"
export function threadTime(iso: string): { day: string; time: string } {
  const d = new Date(iso);
  const diff = dayDiff(d);
  let day: string;
  if (diff <= 0) day = "Today";
  else if (diff === 1) day = "Yesterday";
  else if (diff < 7) day = d.toLocaleDateString("en-US", { weekday: "long" });
  else {
    day = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      ...(d.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}),
    });
    return { day, time: `at ${time(d)}` };
  }
  return { day, time: time(d) };
}

export function initials(name: string): string {
  const parts = name.replace(/^Unknown\s+/, "").trim().split(/\s+/).filter((p) => /[A-Za-zÀ-ɏ]/.test(p));
  if (!parts.length) return "";
  return ((parts[0][0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function displayName(name: string, phone: string, pretty: (p: string) => string): string {
  return name.startsWith("Unknown ") ? pretty(phone) : name;
}

// Sample parent replies, used by the demo "Simulate reply" sheet.
export const SAMPLE_REPLIES: Record<string, string[]> = {
  es: ["Gracias por avisar. Estaremos allí el jueves.", "¿A qué hora termina la escuela mañana?", "Mi hija está enferma hoy y no irá a la escuela."],
  ar: ["شكراً لك، سنكون هناك يوم الخميس.", "ابني مريض اليوم ولن يذهب إلى المدرسة."],
  vi: ["Cảm ơn cô. Chúng tôi sẽ đến vào thứ Năm.", "Con tôi bị ốm hôm nay nên không đi học được."],
  so: ["Mahadsanid, waan iman doonaa Khamiista.", "Wiilkaygu wuu xanuunsan yahay maanta."],
  "zh-CN": ["谢谢老师，我们星期四会到。", "我的孩子今天生病了，不能去上学。"],
  fr: ["Merci, nous serons là jeudi.", "Mon fils est malade aujourd'hui."],
  uk: ["Дякую, ми прийдемо в четвер.", "Моя донька сьогодні захворіла."],
  ru: ["Спасибо, мы придём в четверг.", "Мой сын сегодня заболел."],
  pt: ["Obrigado, estaremos lá na quinta-feira.", "Meu filho está doente hoje."],
  ht: ["Mèsi, n ap la jedi a.", "Pitit mwen malad jodi a."],
  "fa-AF": ["تشکر، ما روز پنجشنبه می‌آییم."],
  fa: ["ممنون، ما پنجشنبه می‌آییم."],
  ko: ["감사합니다. 목요일에 갈게요.", "아이가 오늘 아파서 학교에 못 가요."],
  tl: ["Salamat po, pupunta kami sa Huwebes."],
  sw: ["Asante, tutakuja Alhamisi."],
  hi: ["धन्यवाद, हम गुरुवार को आएंगे।"],
  ne: ["धन्यवाद, हामी बिहीबार आउनेछौं।"],
  de: ["Danke, wir kommen am Donnerstag."],
};

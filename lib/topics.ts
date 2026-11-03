// Simple, rule-based topic and tone tagging for the admin dashboard.
// Works on the English text of each message (body_en), so it covers every language.
// No AI service involved: each topic is a list of word patterns. Tune the patterns here.

export type TopicKey = "academics" | "attendance" | "praise" | "events" | "meetings" | "wellbeing";

export const TOPICS: { key: TopicKey; label: string; re: RegExp }[] = [
  {
    key: "academics",
    label: "Grades & schoolwork",
    re: /\b(grade|grades|assignment|assignments|homework|test|quiz|project|study|studying|tutoring|reading|read|vocabulary|report cards?|missing work|poster|class work|math|science|english)\b/i,
  },
  {
    key: "attendance",
    label: "Attendance & absences",
    re: /\b(absent|absence|sick|late|tardy|doctor|appointment|not come|stay home|stayed home|won't be|will not be|attendance|on time)\b/i,
  },
  {
    key: "praise",
    label: "Praise & good news",
    re: /\b(great job|good job|proud|great news|went up|favorite|a joy|wonderful|so kind|fluently|paying off|improv\w*|great start|helped a new)\b/i,
  },
  {
    key: "events",
    label: "Events & reminders",
    re: /\b(reminder|field trip|form|forms|permission|photo day|no school|early release|cultural night|volunteer\w*|food drive|library|day off|bus|schedule|is there school)\b/i,
  },
  {
    key: "meetings",
    label: "Meetings & calls",
    re: /\b(meet|meeting|talk with you|call you|call me|come to the school|front office|conference|conferences)\b/i,
  },
  {
    key: "wellbeing",
    label: "Wellbeing & support",
    re: /\b(hard time|focus\w*|tired|worried|upset|sad|bully\w*|moved|new apartment|nurse|emergency|breakfast|lunch|borrow|lend|counselor|help with|anything i should know)\b/i,
  },
];

const CONCERN = /\b(worried|worry|concern\w*|upset|sad|problem|bully\w*|hurt|scared|afraid|angry|unfair|sick|hard time|struggl\w*|can't|cannot|don't have|sorry|help me|not happy|missing)\b/i;
const POSITIVE = /(\b(thank\w*|happy|proud|great|wonderful|love|glad|perfect|kind|appreciate\w*|good)\b|❤️|👍|😊)/i;

export type Tone = "positive" | "neutral" | "concern";

// Tone of one parent message: a concern word wins over a thank-you.
export function toneOf(text: string): Tone {
  if (CONCERN.test(text)) return "concern";
  if (POSITIVE.test(text)) return "positive";
  return "neutral";
}

// Each message gets at most one topic: the first match in PRIORITY order (the more specific topics win).
// Short replies like "Thank you" match nothing and aren't counted.
const PRIORITY: TopicKey[] = ["wellbeing", "attendance", "meetings", "praise", "academics", "events"];
export function topicOf(text: string): TopicKey | null {
  for (const k of PRIORITY) if (TOPICS.find((t) => t.key === k)!.re.test(text)) return k;
  return null;
}

import { initials } from "@/lib/format";
import { Person } from "./icons";

// Gray iOS-style contact circle with initials (or a person glyph for unknown numbers).
export default function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const text = initials(name);
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }} aria-hidden>
      {text || <Person size={Math.round(size * 0.62)} />}
    </span>
  );
}

// Simple illustrated placeholder portraits for the About page team section.
// Swap for real headshots later (an <img> in the same spot).

type Hair = "short" | "long" | "bun" | "curly";

export default function TeamAvatar({
  skin,
  hair,
  hairColor,
  shirt,
  bg,
}: {
  skin: string;
  hair: Hair;
  hairColor: string;
  shirt: string;
  bg: string;
}) {
  return (
    <svg viewBox="0 0 120 120" className="team-avatar" aria-hidden>
      <defs>
        <clipPath id={`c-${hair}-${shirt.slice(1)}`}>
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath={`url(#c-${hair}-${shirt.slice(1)})`}>
        <rect width="120" height="120" fill={bg} />
        {/* hair behind the head */}
        {hair === "long" && <path d="M33 52 C31 22 89 22 87 52 L90 96 C76 102 44 102 30 96 Z" fill={hairColor} />}
        {hair === "curly" && (
          <g fill={hairColor}>
            <circle cx="38" cy="44" r="13" />
            <circle cx="82" cy="44" r="13" />
            <circle cx="36" cy="62" r="12" />
            <circle cx="84" cy="62" r="12" />
            <circle cx="40" cy="78" r="10" />
            <circle cx="80" cy="78" r="10" />
          </g>
        )}
        {/* shoulders and neck */}
        <path d="M14 124 C14 96 36 84 60 84 C84 84 106 96 106 124 Z" fill={shirt} />
        <path d="M50 70 h20 v16 c0 6 -20 6 -20 0 Z" fill={skin} style={{ filter: "brightness(0.9)" }} />
        {/* face */}
        <ellipse cx="60" cy="52" rx="20" ry="24" fill={skin} />
        <circle cx="52.5" cy="53" r="2.1" fill="#2b1d33" />
        <circle cx="67.5" cy="53" r="2.1" fill="#2b1d33" />
        <path d="M53 63 Q60 68.5 67 63" stroke="#2b1d33" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* hair on top */}
        {hair === "short" && <path d="M39 50 C37 26 83 24 81 50 C78 40 70 34 58 35 C49 36 42 41 39 50 Z" fill={hairColor} />}
        {hair === "long" && <path d="M39 52 C38 26 82 26 81 52 C74 40 64 33 50 36 C45 40 41 45 39 52 Z" fill={hairColor} />}
        {hair === "bun" && (
          <g fill={hairColor}>
            <circle cx="60" cy="22" r="10" />
            <path d="M39 50 C37 27 83 27 81 50 C76 39 68 34 60 34 C52 34 44 39 39 50 Z" />
          </g>
        )}
        {hair === "curly" && (
          <g fill={hairColor}>
            <circle cx="46" cy="32" r="11" />
            <circle cx="60" cy="27" r="12" />
            <circle cx="74" cy="32" r="11" />
            <circle cx="42" cy="43" r="8" />
            <circle cx="78" cy="43" r="8" />
          </g>
        )}
      </g>
    </svg>
  );
}

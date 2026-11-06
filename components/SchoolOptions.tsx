// <option>s for a school dropdown, grouped under each school's district (district → school).
// Schools without a district are listed last under "No district".
type S = { id: string; name: string; district?: string | null };

export default function SchoolOptions({ schools, suffix }: { schools: S[]; suffix?: (s: S) => string }) {
  const groups = new Map<string, S[]>();
  for (const s of schools) {
    const d = (s.district || "").trim() || "No district";
    groups.set(d, [...(groups.get(d) || []), s]);
  }
  const names = [...groups.keys()].sort((a, b) => (a === "No district" ? 1 : b === "No district" ? -1 : a.localeCompare(b)));
  const opts = (list: S[]) =>
    list
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
          {suffix ? suffix(s) : ""}
        </option>
      ));
  // One district (or none set): a plain list, no group heading.
  if (names.length <= 1) return <>{opts(schools.slice())}</>;
  return (
    <>
      {names.map((d) => (
        <optgroup key={d} label={d}>
          {opts(groups.get(d)!)}
        </optgroup>
      ))}
    </>
  );
}

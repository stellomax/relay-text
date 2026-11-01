"use client";

import { useEffect, useMemo, useState } from "react";
import { LANGUAGES, languageName, nativeName, rememberLanguages, type Language } from "@/lib/languages";

// Load Google's full language list once per page.
let loading: Promise<Language[]> | null = null;
function loadAll(): Promise<Language[]> {
  if (!loading) {
    loading = fetch("/api/languages")
      .then((r) => r.json())
      .then((d) => {
        const list: Language[] = d.languages || [];
        rememberLanguages(list);
        return list;
      })
      .catch(() => {
        loading = null;
        return [];
      });
  }
  return loading;
}

const label = (code: string, name: string, native?: string | null) =>
  native && native.toLowerCase() !== name.toLowerCase() ? `${name} · ${native}` : name;

// Language menu: common school languages first, then every language Google Translate supports.
export default function LanguageSelect({
  value,
  onChange,
  className,
  id,
}: {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  id?: string;
}) {
  const [all, setAll] = useState<Language[]>([]);
  useEffect(() => {
    let live = true;
    loadAll().then((l) => live && setAll(l));
    return () => {
      live = false;
    };
  }, []);

  const common = LANGUAGES;
  const more = useMemo(() => {
    // Google lists a few languages twice under old and new codes (Hebrew iw/he, Javanese jw/jv, Chinese zh/zh-CN).
    const codes = new Set(common.map((l) => l.code.toLowerCase()));
    const names = new Set(common.map((l) => l.name.toLowerCase()));
    const out: Language[] = [];
    for (const l of all) {
      const c = l.code.toLowerCase();
      const n = l.name.toLowerCase();
      if (codes.has(c) || names.has(n)) continue;
      codes.add(c);
      names.add(n);
      out.push(l);
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [all, common]);

  const known = common.some((l) => l.code === value) || more.some((l) => l.code === value);

  return (
    <select id={id} className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      {!known && value && <option value={value}>{languageName(value)}</option>}
      <optgroup label="Common languages">
        {common.map((l) => (
          <option key={l.code} value={l.code}>
            {label(l.code, l.name, l.native)}
          </option>
        ))}
      </optgroup>
      {more.length > 0 && (
        <optgroup label={`All languages (${common.length + more.length})`}>
          {more.map((l) => (
            <option key={l.code} value={l.code}>
              {label(l.code, l.name, nativeName(l.code))}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

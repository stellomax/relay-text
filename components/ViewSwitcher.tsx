"use client";

import { useEffect, useState, type ReactNode } from "react";

// The home page's "Teacher inbox / Administrator dashboard" window.
// The two views take turns on a timer. Clicking a tab shows that view (and restarts the timer);
// hovering over the tabs pauses the switching until the pointer leaves.
const EVERY_MS = 4500;

export default function ViewSwitcher({ a, b }: { a: ReactNode; b: ReactNode }) {
  const [which, setWhich] = useState<0 | 1>(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false); // visitor asked for less motion

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setStill(mq.matches);
    const on = () => setStill(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  useEffect(() => {
    if (paused || still) return;
    const t = window.setTimeout(() => setWhich((w) => (w === 0 ? 1 : 0)), EVERY_MS);
    return () => window.clearTimeout(t);
  }, [which, paused, still]);

  const tabs = ["Teacher inbox", "Administrator dashboard"];

  return (
    <div className="lp-swap">
      <div
        className="lp-swap-labels"
        role="tablist"
        aria-label="Choose a view"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {tabs.map((t, i) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={which === i}
            className={which === i ? "on" : undefined}
            onClick={() => setWhich(i as 0 | 1)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className={`lp-slide${which === 0 ? " on" : ""}`} role="tabpanel" aria-hidden={which !== 0}>
        {a}
      </div>
      <div className={`lp-slide${which === 1 ? " on" : ""}`} role="tabpanel" aria-hidden={which !== 1}>
        {b}
      </div>
    </div>
  );
}

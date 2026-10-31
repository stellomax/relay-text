"use client";

import { useEffect } from "react";

// iOS-style sheet: slides up from the bottom on phones, a centered card on larger screens.
export default function Sheet({
  title,
  onCancel,
  action,
  children,
}: {
  title: string;
  onCancel: () => void;
  action?: { label: string; onClick: () => void; disabled?: boolean; busy?: boolean };
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-bar">
          <button className="bar-btn" onClick={onCancel}>
            Cancel
          </button>
          <div className="sheet-title">{title}</div>
          {action ? (
            <button className="bar-btn strong" onClick={action.onClick} disabled={action.disabled || action.busy}>
              {action.busy ? "…" : action.label}
            </button>
          ) : (
            <span className="bar-btn" />
          )}
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

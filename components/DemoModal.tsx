"use client";

import { useEffect, useState } from "react";
import DemoPlayer from "@/components/DemoPlayer";

/** A button that opens the click-through demo in a large pop-up. relaytext.io/#demo opens it straight away. */
export default function DemoModal({ className, children }: { className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.location.hash === "#demo") setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    if (window.location.hash === "#demo") history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <div className="dm-modal-back" onClick={close}>
          <div className="dm-modal" role="dialog" aria-modal="true" aria-label="Relay demo" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="dm-close" aria-label="Close the demo" onClick={close}>
              ×
            </button>
            <DemoPlayer />
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DemoPlayer from "@/components/DemoPlayer";

/** A button that opens the click-through demo in a large pop-up. relaytext.io/#demo opens it straight away. */
export default function DemoModal({ className, children }: { className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);

  // relaytext.io/#demo (and the View Demo menu link) opens it. A page can have several demo buttons;
  // only the first one on the page answers #demo, so a single pop-up opens.
  useEffect(() => {
    const check = () =>
      window.location.hash === "#demo" && document.querySelector("[data-demo-trigger]") === btn.current && setOpen(true);
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
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
      <button type="button" ref={btn} data-demo-trigger className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {/* The pop-up is drawn at the top of the page (inside .lp for its colors and fonts), not inside the button's
          section, so a dark section like the closing card can't turn its text white. */}
      {open &&
        createPortal(
        <div className="dm-modal-back" onClick={close}>
          <div className="dm-modal" role="dialog" aria-modal="true" aria-label="Relay demo" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="dm-close" aria-label="Close the demo" onClick={close}>
              ×
            </button>
            <DemoPlayer />
          </div>
        </div>,
          btn.current?.closest(".lp") ?? document.body,
        )}
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Ellipsis, Gear, People, SignOut } from "./icons";
import { api } from "@/lib/client";

// The ⋯ menu at the top of the inbox: Settings, Manage Teachers (admins), Sign Out.
export default function AppMenu({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  return (
    <div className="menu-wrap inbox-menu" ref={ref}>
      <button
        className="icon-btn menu-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="More"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Ellipsis />
      </button>
      {open && (
        <div className="menu" role="menu">
          <a role="menuitem" href="/setup">
            Settings <Gear size={20} />
          </a>
          {isAdmin && (
            <a role="menuitem" href="/admin">
              Manage Teachers <People />
            </a>
          )}
          <button role="menuitem" onClick={signOut}>
            Sign Out <SignOut />
          </button>
        </div>
      )}
    </div>
  );
}

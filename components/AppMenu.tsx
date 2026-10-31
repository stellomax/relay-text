"use client";

import { useEffect, useRef, useState } from "react";
import { Gear, People, SignOut } from "./icons";
import Avatar from "./Avatar";
import { api } from "@/lib/client";

// Your avatar at the top of the inbox opens a menu: Settings, Manage Teachers (admins), Sign Out.
export default function AppMenu({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [me, setMe] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    api<{ me: { name: string; email: string } }>("/api/me")
      .then((d) => setMe(d.me))
      .catch(() => {});
  }, []);

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
        className="avatar-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        title={me?.name || "Account"}
      >
        <Avatar name={me?.name || ""} size={34} />
      </button>
      {open && (
        <div className="menu" role="menu">
          {me && (
            <div className="menu-head">
              <span className="menu-head-name">{me.name}</span>
              <span className="menu-head-email">{me.email}</span>
            </div>
          )}
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

"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import { Bubble, Building, Gear, Info, Link, People, PersonAdd, SignOut, Trash } from "./icons";
import { api } from "@/lib/client";

export type Me = {
  id: string;
  name: string;
  email: string;
  school: string | null;
  role: "admin" | "teacher";
  is_super?: boolean;
  phone_number: string | null;
  phone_placeholder: boolean;
  join_link: string | null;
};

export type ConversationActions = {
  name: string;
  readOnly: boolean;
  onInfo: () => void;
  onDemo: () => void;
  onDelete: () => void;
};

// The one menu in Relay Text, opened from your avatar at the top right.
// Shows conversation actions when a conversation is open, then items for your role.
export default function MainMenu({ me, conversation }: { me: Me | null; conversation?: ConversationActions | null }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");
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

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  async function copyLink() {
    setOpen(false);
    if (!me?.join_link) return;
    try {
      await navigator.clipboard.writeText(me.join_link);
      setToast("Parent sign-up link copied");
    } catch {
      setToast(me.join_link);
    }
    setTimeout(() => setToast(""), 2200);
  }

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  const isAdmin = me?.role === "admin";

  return (
    <div className="menu-wrap main-menu" ref={ref}>
      <button
        className="avatar-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        title={me?.name || "Menu"}
      >
        <Avatar name={me?.name || ""} size={34} />
      </button>

      {open && (
        <div className="menu" role="menu">
          {me && (
            <div className="menu-head">
              <span className="menu-head-name">{me.name}</span>
              <span className="menu-head-email">
                {me.is_super ? "Super Admin" : isAdmin ? "Admin" : me.school || "Teacher"} · {me.email}
              </span>
            </div>
          )}

          {conversation && (
            <div className="menu-group">
              <button role="menuitem" onClick={run(conversation.onInfo)}>
                Family Info <Info />
              </button>
              {!conversation.readOnly && (
                <>
                  <button role="menuitem" onClick={run(conversation.onDemo)}>
                    Simulate Parent Reply <Bubble />
                  </button>
                  <button role="menuitem" className="danger" onClick={run(conversation.onDelete)}>
                    Delete Conversation <Trash />
                  </button>
                </>
              )}
            </div>
          )}

          <div className="menu-group">
            {isAdmin && (
              <>
                <a role="menuitem" href="/admin">
                  Manage Teachers <People />
                </a>
                <a role="menuitem" href="/admin?add=1">
                  Add Teacher <PersonAdd />
                </a>
                {me?.is_super && (
                  <a role="menuitem" href="/admin/schools">
                    Schools <Building />
                  </a>
                )}
              </>
            )}
            {me?.join_link && (
              <button role="menuitem" onClick={copyLink}>
                Copy Parent Sign-up Link <Link />
              </button>
            )}
            <a role="menuitem" href="/setup">
              Settings <Gear size={20} />
            </a>
          </div>

          <div className="menu-group">
            <button role="menuitem" onClick={signOut}>
              Sign Out <SignOut />
            </button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

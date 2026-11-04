"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, ChevronDown, ExternalLink, LogOut } from "lucide-react";
import { useAgentStore } from "@/lib/agent-store";
import { useAgentIdentity } from "@/hooks/use-agent-identity";
import { clearAgentDashboardData } from "@/lib/agent-session-data";

type OpenMenu = "notifications" | "user" | null;

export function AgentTopBar() {
  const [open, setOpen] = useState<OpenMenu>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const identity = useAgentIdentity();
  const close = () => setOpen(null);

  useEffect(() => setAvatarFailed(false), [identity.avatarUrl]);

  const handleSignOut = () => {
    clearAgentDashboardData(
      localStorage,
      useAgentStore.getState().clearAccountData,
    );
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    window.dispatchEvent(new Event("estatepro:auth-changed"));
    window.location.assign("/login");
  };

  return (
    <div className="sticky top-0 z-20 hidden h-16 items-center justify-end gap-5 border-b border-[#16243a] bg-[#0a1220]/95 px-8 backdrop-blur lg:flex">
      {/* Click-away layer shared by both menus */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 cursor-default"
          onClick={close}
        />
      )}

      <div className="relative z-40">
        <button
          type="button"
          aria-label="Notifications"
          aria-haspopup="menu"
          aria-expanded={open === "notifications"}
          onClick={() => setOpen(open === "notifications" ? null : "notifications")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Bell className="h-5 w-5" />
        </button>
        {open === "notifications" && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[#1a2a3f] bg-[#0d1828] p-5 text-center shadow-xl shadow-black/40"
          >
            <BellOff className="mx-auto h-6 w-6 text-slate-400" />
            <p className="mt-2 text-sm text-slate-300">
              Agent notifications are not available yet.
            </p>
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative z-40">
        <button
          type="button"
          onClick={() => setOpen(open === "user" ? null : "user")}
          aria-haspopup="menu"
          aria-expanded={open === "user"}
          className="flex items-center gap-3 rounded-xl px-1.5 py-1 transition-colors hover:bg-white/5"
        >
          <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-emerald-500 text-sm font-bold text-white">
            {identity.name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("") || "A"}
            {identity.avatarUrl && !avatarFailed && (
              <img
                src={identity.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setAvatarFailed(true)}
              />
            )}
          </span>
          <span className="text-left leading-tight">
            <span className="block text-sm font-semibold text-white">{identity.name}</span>
            <span className="block text-xs text-slate-400">
              {identity.error ? "Profile unavailable" : identity.email ?? identity.role}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-300" />
        </button>

        {open === "user" && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-xl border border-[#1a2a3f] bg-[#0d1828] py-1 shadow-xl shadow-black/40"
          >
            {identity.error && (
              <p role="alert" className="px-4 py-2 text-xs text-amber-300">
                Could not load your profile: {identity.error}
              </p>
            )}
            {!identity.error && (
              <p className="border-b border-[#16243a] px-4 py-2 text-xs capitalize text-slate-400">
                {identity.role}
              </p>
            )}
            <Link
              href="/"
              target="_blank"
              role="menuitem"
              onClick={close}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-200 transition-colors hover:bg-white/5"
            >
              <ExternalLink className="h-4 w-4 text-slate-400" />
              Public Marketplace
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-200 transition-colors hover:bg-white/5"
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

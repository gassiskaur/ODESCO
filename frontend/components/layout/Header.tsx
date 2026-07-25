"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function Header() {
  const { user, logout } = useAuth();
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-40 border-b-4 border-ink bg-offwhite">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div>
          <h1 className="font-serif text-2xl font-black tracking-tighter sm:text-3xl">
            RESEARCH AGENT
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            Vol. 1 &middot; {today} &middot; OpenAlex Edition
          </p>
        </div>
        {user && (
          <button
            onClick={logout}
            className="flex min-h-[44px] items-center gap-2 border border-ink px-4 font-sans text-xs uppercase tracking-widest hover:bg-ink hover:text-offwhite transition-all"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">{user.email}</span>
          </button>
        )}
      </div>
    </header>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col">
      <Header />
      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <div className="hidden w-72 shrink-0 md:block">
          <Sidebar />
        </div>

        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setMobileNavOpen(true)}
          className="fixed bottom-4 left-4 z-30 flex h-11 w-11 items-center justify-center border border-ink bg-offwhite md:hidden"
          aria-label="Open research sessions"
        >
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        </button>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="w-72 bg-offwhite">
              <div className="flex items-center justify-between border-b border-ink p-4">
                <span className="font-mono text-xs uppercase tracking-widest">Sessions</span>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close"
                  className="flex h-9 w-9 items-center justify-center border border-ink"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
              <Sidebar />
            </div>
            <div className="flex-1 bg-ink/60" onClick={() => setMobileNavOpen(false)} />
          </div>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

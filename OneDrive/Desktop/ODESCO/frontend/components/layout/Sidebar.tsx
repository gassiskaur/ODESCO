"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { researchApi } from "@/lib/api-client";
import type { ResearchSession } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/common/ThemeToggle";

function relativeDay(iso: string): string {
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function Sidebar() {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const activeId = params?.sessionId as string | undefined;

  async function loadSessions() {
    setLoading(true);
    try {
      const data = await researchApi.listSessions();
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  async function handleNewSession() {
    const session = await researchApi.createSession("New research session");
    setSessions((prev) => [session, ...prev]);
    router.push(`/sessions/${session.id}`);
  }

  async function handleDelete(e: React.MouseEvent, sessionId: string) {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("Delete this research session? This cannot be undone.")) return;
    await researchApi.deleteSession(sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeId === sessionId) router.push("/");
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-ink bg-offwhite">
      <div className="border-b border-ink p-4">
        <button
          onClick={handleNewSession}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 border border-ink bg-ink font-sans text-xs uppercase tracking-widest text-offwhite hover:bg-offwhite hover:text-ink transition-all"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New Research
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto" aria-label="Research sessions">
        <p className="border-b border-muted px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          Sessions
        </p>
        {loading && (
          <p className="p-4 font-mono text-xs text-neutral-500">Loading&hellip;</p>
        )}
        {!loading && sessions.length === 0 && (
          <p className="p-4 font-body text-sm text-neutral-600">
            No research sessions yet. Start one above.
          </p>
        )}
        <ul>
          {sessions.map((session) => (
            <li key={session.id} className="border-b border-muted">
              <a
                href={`/sessions/${session.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/sessions/${session.id}`);
                }}
                className={cn(
                  "group flex items-center justify-between gap-2 px-4 py-3 hover:bg-neutral-100 transition-colors",
                  activeId === session.id && "bg-neutral-100"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-body text-sm">{session.title}</span>
                  <span className="block font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                    {relativeDay(session.updated_at)}
                  </span>
                </span>
                <button
                  onClick={(e) => handleDelete(e, session.id)}
                  aria-label={`Delete session ${session.title}`}
                  className="hidden h-8 w-8 shrink-0 items-center justify-center border border-transparent hover:border-ink group-hover:flex"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-ink p-4">
        <ThemeToggle />
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";
import { researchApi } from "@/lib/api-client";
import { useSelection } from "@/lib/selection-context";
import type { Paper, PaperPreview } from "@/lib/types";
import { PaperCard } from "./PaperCard";
import { PaperSelection } from "./PaperSelection";
import { LoadingState } from "@/components/common/LoadingState";
import { cn } from "@/lib/utils";

interface PaperListProps {
  sessionId: string;
  collectionId?: string | null;
}

export function PaperList({ sessionId, collectionId }: PaperListProps) {
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { isSelected, toggle } = useSelection();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!collectionId) return;
      const collection = await researchApi.getCollection(sessionId, collectionId);
      if (!cancelled) setPapers(collection.papers);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, collectionId]);

  if (!collectionId) return null;
  if (!papers) return <LoadingState label="Pulling the results" />;

  const visible = expanded ? papers : papers.slice(0, 5);

  return (
    <div className="mt-3">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        {papers.length} papers found &middot; select any to add to the comparison tray below
      </p>

      <div className="flex flex-col gap-3">
        {visible.map((paper) => {
          const preview: PaperPreview = { openalex_id: paper.openalex_id, title: paper.title };
          const checked = isSelected(paper.openalex_id);
          return (
            <div key={paper.openalex_id} className="flex items-start gap-3">
              <PaperSelection checked={checked} onToggle={() => toggle(preview)} label={paper.title} />
              <div
                className={cn(
                  "min-w-0 flex-1 transition-all",
                  checked && "ring-2 ring-accent ring-offset-2 ring-offset-offwhite"
                )}
              >
                <PaperCard paper={paper} />
              </div>
            </div>
          );
        })}
      </div>

      {papers.length > 5 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 font-sans text-xs uppercase tracking-widest underline-offset-4 decoration-2 decoration-accent hover:underline"
        >
          {expanded ? "Show fewer" : `View all ${papers.length} papers`}
        </button>
      )}
    </div>
  );
}

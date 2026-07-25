"use client";

import { useEffect, useState } from "react";
import { researchApi } from "@/lib/api-client";
import type { Paper, PaperPreview } from "@/lib/types";
import { PaperCard } from "./PaperCard";
import { PaperSelection } from "./PaperSelection";
import { Button } from "@/components/common/Button";
import { LoadingState } from "@/components/common/LoadingState";

interface PaperListProps {
  sessionId: string;
  collectionId?: string | null;
  previews: PaperPreview[];
  onCompareSelected: (paperIds: string[], paperTitles: string[]) => void;
}

export function PaperList({ sessionId, collectionId, previews, onCompareSelected }: PaperListProps) {
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

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

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!collectionId) {
    return null;
  }

  if (!papers) {
    return <LoadingState label="Pulling the results" />;
  }

  const visible = expanded ? papers : papers.slice(0, 5);
  const selectedTitles = papers.filter((p) => selected.has(p.openalex_id)).map((p) => p.title);

  return (
    <div className="mt-3">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        {papers.length} papers found
      </p>

      <div className="flex flex-col gap-3">
        {visible.map((paper) => (
          <div key={paper.openalex_id} className="flex items-start gap-3">
            <PaperSelection
              checked={selected.has(paper.openalex_id)}
              onToggle={() => toggle(paper.openalex_id)}
              label={paper.title}
            />
            <div className="min-w-0 flex-1">
              <PaperCard paper={paper} />
            </div>
          </div>
        ))}
      </div>

      {papers.length > 5 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 font-sans text-xs uppercase tracking-widest underline-offset-4 decoration-2 decoration-accent hover:underline"
        >
          {expanded ? "Show fewer" : `View all ${papers.length} papers`}
        </button>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-muted pt-4">
        <span className="font-mono text-xs text-neutral-500">
          {selected.size} selected
        </span>
        <Button
          variant="secondary"
          disabled={selected.size < 2}
          onClick={() => onCompareSelected(Array.from(selected), selectedTitles)}
        >
          Compare Selected
        </Button>
      </div>
    </div>
  );
}

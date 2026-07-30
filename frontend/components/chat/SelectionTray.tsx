"use client";

import { X, GitCompare } from "lucide-react";
import { useSelection } from "@/lib/selection-context";
import { Button } from "@/components/common/Button";

interface SelectionTrayProps {
  onCompare: (paperIds: string[], paperTitles: string[]) => void;
}

export function SelectionTray({ onCompare }: SelectionTrayProps) {
  const { selected, remove, clear } = useSelection();

  if (selected.length === 0) return null;

  const canCompare = selected.length >= 2;

  function handleCompare() {
    onCompare(
      selected.map((p) => p.openalex_id),
      selected.map((p) => p.title)
    );
    clear();
  }

  return (
    <div className="border-t-4 border-ink bg-neutral-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
            <GitCompare className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            {selected.length} paper{selected.length !== 1 ? "s" : ""} selected for comparison
          </span>
          <button
            onClick={clear}
            className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 underline-offset-4 hover:underline"
          >
            Clear all
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {selected.map((paper) => (
            <span
              key={paper.openalex_id}
              className="flex max-w-xs items-center gap-2 border border-ink bg-offwhite py-1 pl-3 pr-1 font-body text-xs"
            >
              <span className="truncate">{paper.title}</span>
              <button
                onClick={() => remove(paper.openalex_id)}
                aria-label={`Remove "${paper.title}" from selection`}
                className="flex h-6 w-6 shrink-0 items-center justify-center hover:bg-neutral-200 transition-colors"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] text-neutral-500">
            {canCompare
              ? "Ready to compare."
              : "Select at least one more paper to compare."}
          </p>
          <Button variant="primary" disabled={!canCompare} onClick={handleCompare}>
            Compare {selected.length > 0 ? selected.length : ""} Papers
          </Button>
        </div>
      </div>
    </div>
  );
}

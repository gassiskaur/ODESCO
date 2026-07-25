"use client";

import { useCollectionPapers } from "@/lib/hooks";
import type { PaperPreview } from "@/lib/types";

interface AnalysisCardProps {
  sessionId: string;
  collectionId?: string | null;
  previews: PaperPreview[];
}

export function AnalysisCard({ sessionId, collectionId, previews }: AnalysisCardProps) {
  const collectionPapers = useCollectionPapers(sessionId, collectionId);

  if (previews.length === 0) return null;

  const wantedIds = new Set(previews.map((p) => p.openalex_id));
  const papers = collectionPapers?.filter((p) => wantedIds.has(p.openalex_id));

  return (
    <div className="mt-3 border border-ink bg-offwhite p-4">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        Source{previews.length > 1 ? "s" : ""} analyzed &middot; abstract-level
      </p>
      <ul className="flex flex-col gap-2">
        {previews.map((preview) => {
          const full = papers?.find((p) => p.openalex_id === preview.openalex_id);
          return (
            <li key={preview.openalex_id} className="font-body text-sm">
              <span className="font-semibold">{preview.title}</span>
              {full?.publication_year && (
                <span className="ml-2 font-mono text-xs text-neutral-500">
                  ({full.publication_year})
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

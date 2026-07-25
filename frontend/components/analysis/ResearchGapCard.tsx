import { AlertTriangle } from "lucide-react";
import type { PaperPreview } from "@/lib/types";

interface ResearchGapCardProps {
  previews: PaperPreview[];
}

export function ResearchGapCard({ previews }: ResearchGapCardProps) {
  return (
    <div className="mt-3 border border-ink bg-offwhite p-4">
      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-accent">
        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
        Potentially underexplored &mdash; not a definitive claim
      </div>
      {previews.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 font-body text-sm text-neutral-700">
          {previews.map((p) => (
            <li key={p.openalex_id}>&middot; {p.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

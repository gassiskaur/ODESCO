import { ExternalLink, Quote } from "lucide-react";
import type { Paper } from "@/lib/types";

function truncate(text: string | null | undefined, max: number): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

export function PaperCard({ paper }: { paper: Paper }) {
  const authorNames = paper.authors.slice(0, 3).map((a) => a.name).join(", ");
  const extraAuthors = paper.authors.length > 3 ? ` et al.` : "";

  return (
    <article className="hard-shadow-hover border border-ink bg-offwhite p-5 transition-all">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        {paper.publication_year && <span>{paper.publication_year}</span>}
        {paper.source?.display_name && (
          <>
            <span aria-hidden="true">&middot;</span>
            <span className="truncate">{paper.source.display_name}</span>
          </>
        )}
        {paper.open_access && (
          <>
            <span aria-hidden="true">&middot;</span>
            <span className="border border-accent px-1 text-accent">Open Access</span>
          </>
        )}
      </div>

      <h3 className="font-serif text-lg font-bold leading-snug">{paper.title}</h3>

      {authorNames && (
        <p className="mt-1 font-body text-sm italic text-neutral-700">
          {authorNames}
          {extraAuthors}
        </p>
      )}

      {paper.abstract && (
        <p className="mt-3 font-body text-sm leading-relaxed text-neutral-700">
          {truncate(paper.abstract, 260)}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-muted pt-3">
        <span className="flex items-center gap-1 font-mono text-xs text-neutral-500">
          <Quote className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          {paper.citation_count} citations
        </span>
        {(paper.oa_url || paper.doi) && (
          <a
            href={paper.oa_url || `https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-sans text-xs uppercase tracking-widest underline-offset-4 decoration-2 decoration-accent hover:underline"
          >
            View Paper
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}

"use client";

import { useCollectionPapers } from "@/lib/hooks";
import type { PaperPreview } from "@/lib/types";
import { LoadingState } from "@/components/common/LoadingState";

interface ComparisonTableProps {
  sessionId: string;
  collectionId?: string | null;
  previews: PaperPreview[];
}

export function ComparisonTable({ sessionId, collectionId, previews }: ComparisonTableProps) {
  const collectionPapers = useCollectionPapers(sessionId, collectionId);

  if (!collectionId) return null;
  if (!collectionPapers) return <LoadingState label="Laying out the comparison" />;

  const wantedIds = new Set(previews.map((p) => p.openalex_id));
  const papers = collectionPapers.filter((p) => wantedIds.has(p.openalex_id));
  if (papers.length === 0) return null;

  const rows: { label: string; values: string[] }[] = [
    { label: "Year", values: papers.map((p) => String(p.publication_year ?? "—")) },
    { label: "Journal", values: papers.map((p) => p.source?.display_name ?? "—") },
    { label: "Citations", values: papers.map((p) => String(p.citation_count)) },
    { label: "Open Access", values: papers.map((p) => (p.open_access ? "Yes" : "No")) },
    {
      label: "Primary Topic",
      values: papers.map((p) => p.primary_topic?.topic ?? p.topics[0]?.display_name ?? "—"),
    },
  ];

  return (
    <div className="mt-3 overflow-x-auto border border-ink">
      <table className="w-full min-w-[600px] border-collapse font-sans text-sm">
        <thead>
          <tr>
            <th className="border-b-4 border-r border-ink bg-neutral-100 p-3 text-left font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              Paper
            </th>
            {papers.map((p, i) => (
              <th
                key={p.openalex_id}
                className={`border-b-4 border-ink bg-neutral-100 p-3 text-left font-serif text-sm font-bold leading-snug ${
                  i < papers.length - 1 ? "border-r" : ""
                }`}
              >
                {p.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th className="border-b border-r border-ink p-3 text-left font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                {row.label}
              </th>
              {row.values.map((value, i) => (
                <td
                  key={i}
                  className={`border-b border-ink p-3 ${i < row.values.length - 1 ? "border-r" : ""}`}
                >
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import type { ResearchMessage } from "@/lib/types";
import { PaperList } from "@/components/papers/PaperList";
import { ComparisonTable } from "@/components/analysis/ComparisonTable";
import { AnalysisCard } from "@/components/analysis/AnalysisCard";
import { ResearchGapCard } from "@/components/analysis/ResearchGapCard";

interface AgentMessageProps {
  message: ResearchMessage;
  sessionId: string;
  onCompareSelected: (paperIds: string[], paperTitles: string[]) => void;
}

export function AgentMessage({ message, sessionId, onCompareSelected }: AgentMessageProps) {
  const previews = message.data?.papers ?? [];
  const collectionId = message.data?.collection_id ?? null;

  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] border border-ink bg-offwhite px-4 py-3 sm:max-w-[85%]">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          Research Agent
        </p>
        <p className="whitespace-pre-wrap font-body text-sm leading-relaxed">{message.content}</p>

        {message.message_type === "search_results" && (
          <PaperList
            sessionId={sessionId}
            collectionId={collectionId}
            previews={previews}
            onCompareSelected={onCompareSelected}
          />
        )}

        {message.message_type === "comparison" && (
          <ComparisonTable sessionId={sessionId} collectionId={collectionId} previews={previews} />
        )}

        {message.message_type === "analysis" && (
          <AnalysisCard sessionId={sessionId} collectionId={collectionId} previews={previews} />
        )}

        {message.message_type === "paper_details" && previews.length > 0 && (
          <AnalysisCard sessionId={sessionId} collectionId={collectionId} previews={previews} />
        )}

        {message.message_type === "research_gaps" && <ResearchGapCard previews={previews} />}

        {message.message_type === "clarification" && (
          <div className="mt-3 border-l-4 border-accent bg-neutral-100 px-3 py-3">
            {Array.isArray(message.data?.extra?.candidates) &&
            (message.data!.extra!.candidates as { id: string; display_name: string; works_count?: number }[]).length > 0 ? (
              <ul className="flex flex-col gap-1 font-body text-sm">
                {(message.data!.extra!.candidates as { id: string; display_name: string; works_count?: number }[]).map(
                  (candidate) => (
                    <li key={candidate.id} className="font-mono text-xs">
                      &middot; {candidate.display_name}
                      {typeof candidate.works_count === "number" && (
                        <span className="text-neutral-500"> ({candidate.works_count} works)</span>
                      )}
                    </li>
                  )
                )}
              </ul>
            ) : (
              <p className="font-mono text-xs text-neutral-700">
                Reply with the option you meant, or add more detail (e.g. institution or field),
                and I&apos;ll narrow it down.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

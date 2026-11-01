import type { ResearchMessage } from "@/lib/types";

export function UserMessage({ message }: { message: ResearchMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] border border-ink bg-ink px-4 py-3 text-offwhite sm:max-w-[70%]">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-neutral-400">
          You
        </p>
        <p className="whitespace-pre-wrap font-body text-sm leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

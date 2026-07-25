export function LoadingState({ label = "Consulting the archive" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 border border-ink bg-offwhite p-4 font-mono text-xs uppercase tracking-widest text-neutral-600">
      <span className="flex gap-1" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-pulse bg-ink [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-pulse bg-ink [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse bg-ink [animation-delay:300ms]" />
      </span>
      <span>{label}&hellip;</span>
    </div>
  );
}

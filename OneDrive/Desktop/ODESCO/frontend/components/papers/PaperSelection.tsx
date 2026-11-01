import { Check } from "lucide-react";

interface PaperSelectionProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
}

export function PaperSelection({ checked, onToggle, label }: PaperSelectionProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={`Select "${label}" for comparison`}
      onClick={onToggle}
      className="flex h-11 w-11 shrink-0 items-center justify-center border border-ink bg-offwhite hover:bg-neutral-100 transition-colors"
    >
      {checked && <Check className="h-5 w-5 text-accent" strokeWidth={2} />}
    </button>
  );
}

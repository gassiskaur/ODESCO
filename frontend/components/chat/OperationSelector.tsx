"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import type { OperationType } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: { value: OperationType; label: string }[] = [
  { value: "auto", label: "Auto Agent" },
  { value: "search", label: "Search Papers" },
  { value: "analyze", label: "Analyze Paper" },
  { value: "compare", label: "Compare Papers" },
  { value: "citations", label: "Citation Network" },
  { value: "research_gaps", label: "Research Gaps" },
];

interface OperationSelectorProps {
  value: OperationType;
  onChange: (value: OperationType) => void;
}

export function OperationSelector({ value, onChange }: OperationSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-h-[44px] items-center gap-2 border border-ink bg-offwhite px-3 font-sans text-xs uppercase tracking-widest hover:bg-neutral-100 transition-colors"
      >
        {current.label}
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute bottom-full z-20 mb-1 w-48 border border-ink bg-offwhite"
        >
          {OPTIONS.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "block w-full min-h-[44px] px-3 text-left font-sans text-xs uppercase tracking-widest hover:bg-ink hover:text-offwhite transition-colors border-b border-muted last:border-b-0",
                  option.value === value && "bg-neutral-100"
                )}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

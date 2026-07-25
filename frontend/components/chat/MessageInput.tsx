"use client";

import { useState, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import type { OperationType } from "@/lib/types";
import { OperationSelector } from "./OperationSelector";

interface MessageInputProps {
  onSend: (message: string, operation: OperationType) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState("");
  const [operation, setOperation] = useState<OperationType>("auto");

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, operation);
    setText("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t-4 border-ink bg-offwhite p-3 sm:p-4">
      <div className="mb-2">
        <OperationSelector value={operation} onChange={setOperation} />
      </div>
      <div className="flex items-end gap-2 border border-ink bg-offwhite p-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask your research agent…"
          disabled={disabled}
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 font-body text-sm outline-none placeholder:text-neutral-500"
        />
        <button
          onClick={submit}
          disabled={disabled || !text.trim()}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center border border-ink bg-ink text-offwhite hover:bg-offwhite hover:text-ink transition-all disabled:opacity-40"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

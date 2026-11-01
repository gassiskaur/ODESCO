"use client";

import { useState, type KeyboardEvent } from "react";
import { ArrowUp, Mic, Square, Loader2 } from "lucide-react";
import type { OperationType } from "@/lib/types";
import { useVoiceRecorder } from "@/lib/use-voice-recorder";
import { OperationSelector } from "./OperationSelector";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (message: string, operation: OperationType) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState("");
  const [operation, setOperation] = useState<OperationType>("auto");

  const { state: voiceState, error: voiceError, toggle: toggleVoice } = useVoiceRecorder(
    (transcribed) => {
      setText((prev) => (prev.trim() ? `${prev.trim()} ${transcribed}` : transcribed));
    }
  );

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

  const isRecording = voiceState === "recording";
  const isTranscribing = voiceState === "transcribing";

  return (
    <div className="border-t-4 border-ink bg-offwhite p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <OperationSelector value={operation} onChange={setOperation} />
        {voiceError && (
          <span className="font-mono text-[10px] text-accent">{voiceError}</span>
        )}
      </div>
      <div className="flex items-end gap-2 border border-ink bg-offwhite p-2">
        <button
          type="button"
          onClick={toggleVoice}
          disabled={disabled || isTranscribing}
          aria-label={isRecording ? "Stop recording" : "Start voice input"}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center border transition-all disabled:opacity-40",
            isRecording
              ? "border-accent bg-accent text-offwhite animate-pulse"
              : "border-ink bg-offwhite hover:bg-neutral-100"
          )}
        >
          {isTranscribing ? (
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
          ) : isRecording ? (
            <Square className="h-4 w-4" strokeWidth={1.5} fill="currentColor" />
          ) : (
            <Mic className="h-5 w-5" strokeWidth={1.5} />
          )}
        </button>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={isRecording ? "Listening…" : "Ask your research agent…"}
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

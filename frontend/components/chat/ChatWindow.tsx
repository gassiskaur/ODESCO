"use client";

import { useEffect, useRef, useState } from "react";
import { researchApi } from "@/lib/api-client";
import type { OperationType, ResearchMessage } from "@/lib/types";
import { Message } from "./Message";
import { MessageInput } from "./MessageInput";
import { LoadingState } from "@/components/common/LoadingState";

function tempId() {
  return `temp_${Math.random().toString(36).slice(2)}`;
}

export function ChatWindow({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<ResearchMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    researchApi
      .getMessages(sessionId)
      .then((data) => {
        if (!cancelled) setMessages(data);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(text: string, operation: OperationType, selectedPapers?: string[]) {
    setError(null);
    const optimisticUser: ResearchMessage = {
      id: tempId(),
      session_id: sessionId,
      role: "user",
      message_type: "text",
      content: text,
      operation,
      data: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setSending(true);
    try {
      const agentMessage = await researchApi.postMessage(sessionId, text, operation, selectedPapers);
      setMessages((prev) => [...prev, agentMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong sending that.");
    } finally {
      setSending(false);
    }
  }

  function handleCompareSelected(paperIds: string[], paperTitles: string[]) {
    const text = `Compare the following papers based on their findings: ${paperTitles.join("; ")}`;
    handleSend(text, "compare", paperIds);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        {loadingHistory && <LoadingState label="Opening the archive" />}

        {!loadingHistory && messages.length === 0 && (
          <div className="mx-auto max-w-xl py-16 text-center">
            <p className="font-serif text-3xl font-bold tracking-tight">
              What are you researching today?
            </p>
            <p className="mt-3 font-body text-sm text-neutral-600">
              Ask about a topic, an author, an institution, or a journal — the agent searches
              OpenAlex and keeps the whole conversation in context.
            </p>
          </div>
        )}

        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              sessionId={sessionId}
              onCompareSelected={handleCompareSelected}
            />
          ))}

          {sending && <LoadingState label="Consulting OpenAlex" />}

          {error && (
            <p className="border-l-4 border-accent bg-neutral-100 px-3 py-2 font-mono text-xs text-neutral-700">
              {error}
            </p>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <MessageInput onSend={handleSend} disabled={sending} />
      </div>
    </div>
  );
}

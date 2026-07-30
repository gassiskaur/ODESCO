import type { ResearchMessage } from "@/lib/types";
import { UserMessage } from "./UserMessage";
import { AgentMessage } from "./AgentMessage";

interface MessageProps {
  message: ResearchMessage;
  sessionId: string;
}

export function Message({ message, sessionId }: MessageProps) {
  if (message.role === "user") {
    return <UserMessage message={message} />;
  }
  return <AgentMessage message={message} sessionId={sessionId} />;
}

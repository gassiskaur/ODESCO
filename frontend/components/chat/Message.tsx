import type { ResearchMessage } from "@/lib/types";
import { UserMessage } from "./UserMessage";
import { AgentMessage } from "./AgentMessage";

interface MessageProps {
  message: ResearchMessage;
  sessionId: string;
  onCompareSelected: (paperIds: string[], paperTitles: string[]) => void;
}

export function Message({ message, sessionId, onCompareSelected }: MessageProps) {
  if (message.role === "user") {
    return <UserMessage message={message} />;
  }
  return (
    <AgentMessage message={message} sessionId={sessionId} onCompareSelected={onCompareSelected} />
  );
}

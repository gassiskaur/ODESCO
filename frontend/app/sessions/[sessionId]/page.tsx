"use client";

import { use } from "react";
import { AuthGuard } from "@/components/common/AuthGuard";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  return (
    <AuthGuard>
      <WorkspaceLayout>
        <ChatWindow sessionId={sessionId} />
      </WorkspaceLayout>
    </AuthGuard>
  );
}

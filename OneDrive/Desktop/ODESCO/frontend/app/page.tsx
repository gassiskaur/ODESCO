"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/common/AuthGuard";
import { LoadingState } from "@/components/common/LoadingState";
import { researchApi } from "@/lib/api-client";

function HomeRedirect() {
  const router = useRouter();
  const [message, setMessage] = useState("Opening your research desk");

  useEffect(() => {
    async function go() {
      const sessions = await researchApi.listSessions();
      if (sessions.length > 0) {
        router.replace(`/sessions/${sessions[0].id}`);
        return;
      }
      setMessage("Starting your first research session");
      const session = await researchApi.createSession("New research session");
      router.replace(`/sessions/${session.id}`);
    }
    go();
  }, [router]);

  return (
    <div className="flex h-dvh items-center justify-center bg-offwhite">
      <LoadingState label={message} />
    </div>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <HomeRedirect />
    </AuthGuard>
  );
}

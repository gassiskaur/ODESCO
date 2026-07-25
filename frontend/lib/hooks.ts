"use client";

import { useEffect, useState } from "react";
import { researchApi } from "./api-client";
import type { Paper } from "./types";

export function useCollectionPapers(sessionId: string, collectionId?: string | null) {
  const [papers, setPapers] = useState<Paper[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPapers(null);
    if (!collectionId) return;
    researchApi.getCollection(sessionId, collectionId).then((collection) => {
      if (!cancelled) setPapers(collection.papers);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, collectionId]);

  return papers;
}

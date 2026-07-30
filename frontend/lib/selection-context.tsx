"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { PaperPreview } from "./types";

interface SelectionContextValue {
  selected: PaperPreview[];
  isSelected: (id: string) => boolean;
  toggle: (paper: PaperPreview) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

/**
 * Scoped per research session (mount this provider around a single
 * ChatWindow instance, which itself remounts on session navigation) so
 * switching sessions naturally resets the selection instead of carrying
 * stale picks from a previous conversation into a new one.
 */
export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedMap, setSelectedMap] = useState<Map<string, PaperPreview>>(new Map());

  const toggle = useCallback((paper: PaperPreview) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(paper.openalex_id)) next.delete(paper.openalex_id);
      else next.set(paper.openalex_id, paper);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedMap(new Map()), []);

  const isSelected = useCallback((id: string) => selectedMap.has(id), [selectedMap]);

  const selected = useMemo(() => Array.from(selectedMap.values()), [selectedMap]);

  return (
    <SelectionContext.Provider value={{ selected, isSelected, toggle, remove, clear }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within SelectionProvider");
  return ctx;
}

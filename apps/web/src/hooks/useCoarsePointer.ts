"use client";

import { useEffect, useState } from "react";

/** True when primary pointer is coarse (touch). Used to disable hover-only UX and auto-advance. */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const apply = () => setCoarse(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return coarse;
}

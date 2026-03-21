"use client";

import { useEffect, useState } from "react";

/** Matches bundle: xs/sm layout below 768px (desktop unchanged at md+). */
export const MOBILE_NARROW_MQ = "(max-width: 767.98px)";

export function useMobileNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_NARROW_MQ);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return narrow;
}

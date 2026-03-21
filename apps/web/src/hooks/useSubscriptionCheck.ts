"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

export function useSubscriptionCheck(creatorId: string | undefined) {
  const { accessToken } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!creatorId) {
      setSubscribed(false);
      setLoading(false);
      return;
    }
    if (!accessToken) {
      setSubscribed(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiFetch<{ subscribed: boolean }>(
      `/subscriptions/check/${creatorId}`,
      { accessToken }
    )
      .then((r) => {
        if (!cancelled) setSubscribed(!!r.subscribed);
      })
      .catch(() => {
        if (!cancelled) setSubscribed(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [creatorId, accessToken]);

  return { subscribed, loading };
}

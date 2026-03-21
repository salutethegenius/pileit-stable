"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserMe } from "@/types/content";
import { apiFetch, subscribeAccessTokenRefresh } from "@/lib/api";
import { mapApiUserMe, type ApiUserMe } from "@/lib/mapApiUser";

const ACCESS = "pileit_access_token";
const REFRESH = "pileit_refresh_token";

type AuthContextValue = {
  user: UserMe | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);

  const persistTokens = useCallback((access: string, refresh: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS, access);
    localStorage.setItem(REFRESH, refresh);
    setAccessToken(access);
  }, []);

  const refreshUser = useCallback(async () => {
    const token =
      accessToken ||
      (typeof window !== "undefined" ? localStorage.getItem(ACCESS) : null);
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const raw = await apiFetch<ApiUserMe>("/users/me", { accessToken: token });
      setUser(mapApiUserMe(raw));
    } catch {
      setUser(null);
      setAccessToken(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(ACCESS);
        localStorage.removeItem(REFRESH);
      }
    }
  }, [accessToken]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(ACCESS);
    setAccessToken(stored);
    setLoading(false);
  }, []);

  useEffect(() => {
    subscribeAccessTokenRefresh((access) => {
      setAccessToken(access);
    });
    return () => subscribeAccessTokenRefresh(null);
  }, []);

  useEffect(() => {
    if (loading) return;
    void refreshUser();
  }, [loading, accessToken, refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{
      access_token: string;
      refresh_token: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    persistTokens(data.access_token, data.refresh_token);
    const raw = await apiFetch<ApiUserMe>("/users/me", {
      accessToken: data.access_token,
    });
    setUser(mapApiUserMe(raw));
  }, [persistTokens]);

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, display_name: displayName }),
      });
      await login(email, password);
    },
    [login]
  );

  const logout = useCallback(async () => {
    const refresh =
      typeof window !== "undefined" ? localStorage.getItem(REFRESH) : null;
    const accessFromStore =
      typeof window !== "undefined" ? localStorage.getItem(ACCESS) : null;
    const accessForHeader = accessToken || accessFromStore;
    try {
      if (refresh) {
        await apiFetch("/auth/logout", {
          method: "POST",
          ...(accessForHeader ? { accessToken: accessForHeader } : {}),
          body: JSON.stringify({ refresh_token: refresh }),
        });
      }
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACCESS);
      localStorage.removeItem(REFRESH);
    }
    setAccessToken(null);
    setUser(null);
  }, [accessToken]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      loading,
      login,
      register,
      logout,
      refreshUser,
      setTokens: persistTokens,
    }),
    [user, accessToken, loading, login, register, logout, refreshUser, persistTokens]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

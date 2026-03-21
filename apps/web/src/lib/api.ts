/** Same-origin proxy path (see next.config.mjs `rewrites`). */
const API_PROXY_PREFIX = "/pileit-data";

function envApiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "").trim() ||
    process.env.API_URL?.replace(/\/$/, "").trim() ||
    ""
  );
}

/**
 * Base URL for browser `fetch` to the FastAPI backend.
 * - Local dev: `NEXT_PUBLIC_API_URL` or `http://127.0.0.1:8000`
 * - Production (Vercel): if `NEXT_PUBLIC_API_URL` is unset, uses
 *   `https://<your-domain>/pileit-data` so requests hit Next rewrites → Railway.
 *   Set `API_URL` (server) on Vercel to your API origin; optional `NEXT_PUBLIC_API_URL` overrides.
 */
export function getApiBase(): string {
  const fromEnv = envApiUrl();
  if (typeof window === "undefined") {
    return fromEnv || "http://127.0.0.1:8000";
  }
  if (fromEnv) return fromEnv;
  const { hostname, origin } = window.location;
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    return `${origin}${API_PROXY_PREFIX}`;
  }
  return "http://127.0.0.1:8000";
}

const ACCESS_KEY = "pileit_access_token";
const REFRESH_KEY = "pileit_refresh_token";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type TokenPairListener = (access: string, refresh: string) => void;
let tokenPairListener: TokenPairListener | null = null;

/** AuthProvider registers this so React state stays in sync after a background refresh. */
export function subscribeAccessTokenRefresh(cb: TokenPairListener | null) {
  tokenPairListener = cb;
}

type ApiFetchInit = RequestInit & {
  accessToken?: string | null;
  /** Internal: only one refresh+retry per logical call */
  _retriedAfterRefresh?: boolean;
};

async function postJsonRefresh(): Promise<{ access_token: string; refresh_token: string } | null> {
  if (typeof window === "undefined") return null;
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return null;
  const base = getApiBase();
  const res = await fetch(`${base}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) return null;
  const text = await res.text();
  let data: { access_token?: string; refresh_token?: string };
  try {
    data = text ? (JSON.parse(text) as { access_token?: string; refresh_token?: string }) : {};
  } catch {
    return null;
  }
  if (!data.access_token || !data.refresh_token) return null;
  localStorage.setItem(ACCESS_KEY, data.access_token);
  localStorage.setItem(REFRESH_KEY, data.refresh_token);
  tokenPairListener?.(data.access_token, data.refresh_token);
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  };
}

const NO_REFRESH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
];

function shouldAttemptRefresh(
  path: string,
  hadAccessToken: boolean,
  alreadyRetried: boolean
): boolean {
  if (!hadAccessToken || alreadyRetried) return false;
  if (typeof window === "undefined") return false;
  for (let i = 0; i < NO_REFRESH_PATHS.length; i++) {
    const p = NO_REFRESH_PATHS[i];
    if (path === p || path.startsWith(`${p}?`)) return false;
  }
  return true;
}

export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const { accessToken, _retriedAfterRefresh, headers: hdr, ...rest } = init;
  const headers = new Headers(hdr);
  if (
    !headers.has("Content-Type") &&
    rest.body &&
    !(typeof FormData !== "undefined" && rest.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, {
    ...rest,
    headers,
  });
  const text = await res.text();

  if (
    res.status === 401 &&
    shouldAttemptRefresh(path, Boolean(accessToken), Boolean(_retriedAfterRefresh))
  ) {
    const pair = await postJsonRefresh();
    if (pair) {
      return apiFetch<T>(path, {
        ...init,
        accessToken: pair.access_token,
        _retriedAfterRefresh: true,
      });
    }
  }

  if (!res.ok) {
    throw new ApiError(res.statusText || "Request failed", res.status, text);
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("Invalid JSON response from server", res.status, text);
  }
}

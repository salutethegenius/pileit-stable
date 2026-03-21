/** Safe in-app path after login/register. Rejects protocol-relative and external URLs. */
export function safeInternalPath(next: string | null | undefined): string {
  if (next == null || typeof next !== "string") return "/";
  const t = next.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/";
  return t;
}

/** True when `next` was present but not usable as an internal path (e.g. an email was pasted). */
export function isNextParamIgnored(
  raw: string | null | undefined,
  resolved: string
): boolean {
  if (raw == null || typeof raw !== "string") return false;
  const t = raw.trim();
  if (t === "") return false;
  if (resolved !== "/") return false;
  if (t === "/") return false;
  return true;
}

/** `?next=…&email=…` for cross-links between login and register (omits empty defaults). */
export function buildAuthPageSearch(
  nextPath: string,
  email?: string | null
): string {
  const p = new URLSearchParams();
  if (nextPath !== "/") p.set("next", nextPath);
  const e = email?.trim();
  if (e && e.includes("@")) p.set("email", e);
  const s = p.toString();
  return s ? `?${s}` : "";
}

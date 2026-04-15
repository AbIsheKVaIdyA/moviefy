const DEFAULT_FALLBACK = "/app/explore";

/**
 * Accepts relative paths (`/app`) or same-origin absolute URLs (from older clients).
 * Rejects open redirects (`//evil.com`).
 */
export function safeClerkRedirectDestination(
  requestBaseUrl: string,
  raw: string | null | undefined,
  fallback: string = DEFAULT_FALLBACK,
): string {
  if (!raw?.trim()) return fallback;
  const t = raw.trim();
  if (t.startsWith("/") && !t.startsWith("//")) return t;
  try {
    const u = new URL(t);
    const base = new URL(
      requestBaseUrl.endsWith("/")
        ? requestBaseUrl.slice(0, -1)
        : requestBaseUrl,
    );
    if (u.origin === base.origin) {
      const path = `${u.pathname}${u.search}` || "/";
      return path;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

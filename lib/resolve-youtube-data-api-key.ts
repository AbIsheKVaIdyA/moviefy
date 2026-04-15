/** Server-only: reads env on each call so route handlers pick up .env.local after restart and avoid stale module-level snapshots. */
export function resolveYoutubeDataApiKey(): string {
  const candidates = [
    process.env.YOUTUBE_API_KEY,
    process.env.YOUTUBE_DATA_API_KEY,
    process.env.GOOGLE_API_KEY,
  ];
  for (const c of candidates) {
    const t = c?.trim();
    if (t) return t;
  }
  return "";
}

/** Google keys restricted to "HTTP referrers" reject server-side YouTube Data API calls. */
export function youtubeServerKeyHint(apiMessage: string): string | undefined {
  const m = apiMessage.toLowerCase();
  if (
    m.includes("referer") ||
    m.includes("referrer") ||
    m.includes("ip address") ||
    m.includes("restriction") ||
    m.includes("not authorized to use this request")
  ) {
    return " Server routes call YouTube without a browser referrer. In Google Cloud → Credentials, set this key’s Application restrictions to None (dev) or IP — not HTTP referrers — and ensure YouTube Data API v3 is enabled for the project.";
  }
  return undefined;
}

/** YouTube Data API v3 uses a fixed daily quota (default 10k units); each search.list ≈ 100 units — separate from GCP billing credits. */
export function isYoutubeQuotaErrorMessage(message: string): boolean {
  return message.toLowerCase().includes("quota");
}

export type YoutubeQuotaGate = { halted: boolean };

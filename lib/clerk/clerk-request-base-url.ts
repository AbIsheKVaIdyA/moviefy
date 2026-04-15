import { headers } from "next/headers";

/** Same-origin base URL for redirect param validation (e.g. `https://app.example.com`). */
export async function clerkRequestBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

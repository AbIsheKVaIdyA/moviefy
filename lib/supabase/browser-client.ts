import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseBrowserConfig } from "@/lib/supabase/config";
import type { SupabaseClient } from "@supabase/supabase-js";

export function createBrowserSupabaseClient(): SupabaseClient | null {
  const cfg = getSupabaseBrowserConfig();
  if (!cfg) return null;
  return createBrowserClient(cfg.url, cfg.anonKey);
}

"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { isClerkConfigured } from "@/lib/clerk/auth-mode";
import { mapClerkUserToAppUser, type AppUser } from "@/lib/app-user";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { getSupabaseBrowserConfig } from "@/lib/supabase/config";

export type { AppUser };

type Ctx = {
  client: SupabaseClient | null;
  appUser: AppUser | null;
  /** UUID from Supabase auth token/user; required for DB rows keyed to auth.users.id */
  dbUserId: string | null;
  ready: boolean;
  authError: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pickFirstUuid(value: unknown): string | null {
  if (typeof value === "string") return UUID_RE.test(value) ? value : null;
  if (Array.isArray(value)) {
    for (const v of value) {
      const hit = pickFirstUuid(v);
      if (hit) return hit;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      const hit = pickFirstUuid(v);
      if (hit) return hit;
    }
  }
  return null;
}

function extractJwtUserId(token: string | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = JSON.parse(atob(padded)) as Record<string, unknown>;
    // Prefer well-known keys, then deep-scan all claims for a UUID.
    const direct =
      (typeof json.sub === "string" && UUID_RE.test(json.sub) && json.sub) ||
      (typeof json.user_id === "string" &&
        UUID_RE.test(json.user_id) &&
        json.user_id) ||
      (typeof json.uid === "string" && UUID_RE.test(json.uid) && json.uid) ||
      null;
    return direct ?? pickFirstUuid(json);
  } catch {
    return null;
  }
}

const SupabaseAppContext = createContext<Ctx | null>(null);

export function useSupabaseApp(): Ctx {
  const c = useContext(SupabaseAppContext);
  if (!c) {
    throw new Error("useSupabaseApp must be used within SupabaseAppProvider");
  }
  return c;
}

function AnonSupabaseProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => createBrowserSupabaseClient(), []);
  const value = useMemo(
    () =>
      ({
        client,
        appUser: null,
        dbUserId: null,
        ready: true,
        authError: null,
      }) satisfies Ctx,
    [client],
  );
  return (
    <SupabaseAppContext.Provider value={value}>
      {children}
    </SupabaseAppContext.Provider>
  );
}

function ClerkSupabaseProvider({ children }: { children: React.ReactNode }) {
  const cfg = useMemo(() => getSupabaseBrowserConfig(), []);
  const { isLoaded, userId, getToken } = useAuth();
  const { user } = useUser();

  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const appUser = useMemo(() => {
    const base = mapClerkUserToAppUser(user ?? undefined);
    if (!base) return null;
    // Prefer Supabase auth UUID for DB writes; fallback keeps signed-in UI visible.
    return { ...base, id: supabaseUserId ?? base.id };
  }, [user, supabaseUserId]);

  useEffect(() => {
    if (!cfg) {
      setClient(null);
      setSupabaseUserId(null);
      setAuthError(null);
      setReady(true);
      return;
    }

    if (!isLoaded) {
      return;
    }

    let cancelled = false;
    setReady(false);

    (async () => {
      try {
        const token = await getToken({ template: "supabase" }).catch(() => null);
        if (cancelled) return;
        const c = createClient(cfg.url, cfg.anonKey, {
          global: {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        });
        setClient(c);

        // Fast path: token carries DB UUID in one of its claims.
        const tokenUserId = extractJwtUserId(token);
        if (tokenUserId) {
          setSupabaseUserId(tokenUserId);
          setAuthError(null);
          return;
        }
        // Clerk-native fallback: use Clerk user id (e.g. user_xxx). This requires
        // DB schema/policies to use text ids from auth.jwt()->>'sub'.
        const clerkId = typeof userId === "string" && userId.trim() ? userId : null;
        setSupabaseUserId(clerkId);
        setAuthError(
          clerkId
            ? null
            : "No identity available from Clerk session. Please sign out/in.",
        );
      } catch (e) {
        if (!cancelled) {
          setAuthError(e instanceof Error ? e.message : "Supabase client error");
          setSupabaseUserId(null);
          setClient(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cfg, isLoaded, userId, getToken]);

  const value = useMemo(
    () => ({ client, appUser, dbUserId: supabaseUserId, ready, authError }),
    [client, appUser, supabaseUserId, ready, authError],
  );

  return (
    <SupabaseAppContext.Provider value={value}>
      {children}
    </SupabaseAppContext.Provider>
  );
}

export function SupabaseAppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isClerkConfigured()) {
    return <AnonSupabaseProvider>{children}</AnonSupabaseProvider>;
  }
  return <ClerkSupabaseProvider>{children}</ClerkSupabaseProvider>;
}

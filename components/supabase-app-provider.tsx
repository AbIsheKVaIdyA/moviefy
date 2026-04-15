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
  ready: boolean;
  authError: string | null;
};

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
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const appUser = useMemo(
    () => mapClerkUserToAppUser(user ?? undefined),
    [user],
  );

  useEffect(() => {
    if (!cfg) {
      setClient(null);
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
        setAuthError(null);
      } catch (e) {
        if (!cancelled) {
          setAuthError(e instanceof Error ? e.message : "Supabase client error");
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
    () => ({ client, appUser, ready, authError }),
    [client, appUser, ready, authError],
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

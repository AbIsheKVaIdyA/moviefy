"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { ensureAnonymousSession } from "@/lib/supabase/playlist-service";

type Ctx = {
  client: SupabaseClient | null;
  session: Session | null;
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

export function SupabaseAppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = useMemo(() => createBrowserSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) {
      setReady(true);
      return;
    }
    ensureAnonymousSession(client)
      .then((s) => {
        setSession(s);
        setAuthError(null);
      })
      .catch((e: unknown) => {
        setAuthError(
          e instanceof Error ? e.message : "Could not start session",
        );
      })
      .finally(() => setReady(true));

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, [client]);

  const value = useMemo(
    () => ({ client, session, ready, authError }),
    [client, session, ready, authError],
  );

  return (
    <SupabaseAppContext.Provider value={value}>
      {children}
    </SupabaseAppContext.Provider>
  );
}

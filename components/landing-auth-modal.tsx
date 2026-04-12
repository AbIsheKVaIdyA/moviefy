"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabaseApp } from "@/components/supabase-app-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PASSWORD_MIN_LENGTH,
  validateSignUpPassword,
} from "@/lib/password-policy";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function safeNext(raw: string | null): string {
  if (raw?.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/app/explore";
}

function stripAuthFromSearch(search: string): string {
  const u = new URLSearchParams(search);
  u.delete("auth");
  u.delete("next");
  u.delete("error");
  const q = u.toString();
  return q ? `?${q}` : "";
}

export function LandingAuthModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { client, session, ready } = useSupabaseApp();

  const authParam = searchParams.get("auth");
  const view: "sign-in" | "sign-up" | null =
    authParam === "sign-up" ? "sign-up" : authParam === "sign-in" ? "sign-in" : null;
  const open = view !== null;

  const next = useMemo(
    () => safeNext(searchParams.get("next")),
    [searchParams],
  );

  const errParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(errParam);

  useEffect(() => {
    setMessage(errParam);
  }, [errParam]);

  const closeToHome = useCallback(() => {
    const qs = stripAuthFromSearch(searchParams.toString());
    router.replace(`/${qs}`);
  }, [router, searchParams]);

  useEffect(() => {
    if (!ready || !session?.user) return;
    if (!open) return;
    router.replace(next);
    router.refresh();
  }, [ready, session?.user, open, next, router]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  function goApp() {
    window.location.assign(next);
  }

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    setLoading(true);
    setMessage(null);
    const { error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    goApp();
  }

  async function signUpPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) {
      setMessage("Please enter your first and last name.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    const pwError = validateSignUpPassword(password);
    if (pwError) {
      setMessage(pwError);
      return;
    }
    setLoading(true);
    setMessage(null);
    const fullName = `${fn} ${ln}`.trim();
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: origin
          ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
          : undefined,
        data: {
          first_name: fn,
          last_name: ln,
          full_name: fullName,
        },
      },
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (data.session) {
      goApp();
      return;
    }
    setMessage(
      "Check your email to confirm your address if required by your Supabase project, then sign in.",
    );
  }

  function setView(nextView: "sign-in" | "sign-up") {
    setFirstName("");
    setLastName("");
    const p = new URLSearchParams(searchParams.toString());
    p.set("auth", nextView);
    p.set("next", next);
    p.delete("error");
    router.replace(`/?${p.toString()}`);
    setMessage(null);
  }

  const onOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) closeToHome();
  };

  if (!isSupabaseConfigured()) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-h-[min(90dvh,640px)] overflow-y-auto border-white/10 bg-zinc-950 text-white sm:max-w-md"
          backdropClassName="bg-black/70 backdrop-blur-sm"
        >
          <DialogHeader>
            <DialogTitle className="text-white">Sign in</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Supabase is not configured for this build.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-white/10 bg-zinc-900/80 p-4 text-sm text-white/70">
            Set{" "}
            <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
            and your anon key in{" "}
            <code className="rounded bg-white/10 px-1">.env.local</code>.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(90dvh,640px)] overflow-y-auto border-white/10 bg-zinc-950 text-white sm:max-w-md"
        backdropClassName="bg-black/70 backdrop-blur-sm"
      >
        {!ready || !client ? (
          <p className="py-8 text-center text-sm text-white/50">Loading…</p>
        ) : view === "sign-in" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-white">Sign in</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Email and password.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={(e) => void signInPassword(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="landing-si-email">Email</Label>
                <Input
                  id="landing-si-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-white/10 bg-black/30"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landing-si-password">Password</Label>
                <Input
                  id="landing-si-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-white/10 bg-black/30"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            {message ? (
              <p className="text-center text-sm text-amber-200/90" role="alert">
                {message}
              </p>
            ) : null}

            <p className="text-center text-sm text-white/45">
              No account?{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => setView("sign-up")}
              >
                Sign up
              </button>
            </p>
          </>
        ) : view === "sign-up" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-white">Create account</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Your name, email, and password — we use your name for welcome and your
                profile (not your email).
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={(e) => void signUpPassword(e)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="landing-su-first">First name</Label>
                  <Input
                    id="landing-su-first"
                    type="text"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="border-white/10 bg-black/30"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landing-su-last">Last name</Label>
                  <Input
                    id="landing-su-last"
                    type="text"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="border-white/10 bg-black/30"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="landing-su-email">Email</Label>
                <Input
                  id="landing-su-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-white/10 bg-black/30"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landing-su-password">Password</Label>
                <Input
                  id="landing-su-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-white/10 bg-black/30"
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                />
                <p className="text-[11px] leading-relaxed text-white/40">
                  Min {PASSWORD_MIN_LENGTH} characters, at least one uppercase letter, and one
                  special character.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="landing-su-confirm">Confirm password</Label>
                <Input
                  id="landing-su-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="border-white/10 bg-black/30"
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating…" : "Sign up"}
              </Button>
            </form>

            {message ? (
              <p className="text-center text-sm text-amber-200/90" role="status">
                {message}
              </p>
            ) : null}

            <p className="text-center text-sm text-white/45">
              Already have an account?{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => setView("sign-in")}
              >
                Sign in
              </button>
            </p>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

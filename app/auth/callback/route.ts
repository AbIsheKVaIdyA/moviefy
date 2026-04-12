import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next =
    url.searchParams.get("next")?.startsWith("/") &&
    !url.searchParams.get("next")?.startsWith("//")
      ? url.searchParams.get("next")!
      : "/app/explore";

  if (!code) {
    const u = new URL("/", url.origin);
    u.searchParams.set("auth", "sign-in");
    return NextResponse.redirect(u);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const errUrl = new URL("/", url.origin);
    errUrl.searchParams.set("auth", "sign-in");
    errUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(errUrl);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

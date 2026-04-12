import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseBrowserConfig } from "@/lib/supabase/config";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

/**
 * Refreshes auth cookies and returns the response to continue the chain.
 * Uses `getUser()` so the session is validated with Supabase Auth.
 */
export async function updateSession(request: NextRequest) {
  const cfg = getSupabaseBrowserConfig();
  let response = NextResponse.next({ request });

  if (!cfg) {
    return response;
  }

  const supabase = createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        if (headers) {
          for (const [key, value] of Object.entries(headers)) {
            if (typeof value === "string") {
              response.headers.set(key, value);
            }
          }
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtectedApp = pathname.startsWith("/app");
  const isAuthPage =
    pathname === "/auth/sign-in" || pathname === "/auth/sign-up";

  if (isProtectedApp && !user) {
    const url = new URL("/", request.nextUrl.origin);
    url.searchParams.set("auth", "sign-in");
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    copyCookies(response, redirect);
    return redirect;
  }

  if (isAuthPage && user) {
    const next = request.nextUrl.searchParams.get("next");
    const dest =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/app/explore";
    const url = new URL(dest, request.nextUrl.origin);
    const redirect = NextResponse.redirect(url);
    copyCookies(response, redirect);
    return redirect;
  }

  return response;
}

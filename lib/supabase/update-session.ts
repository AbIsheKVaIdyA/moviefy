import { NextResponse, type NextRequest } from "next/server";

/** Next middleware chain step (Supabase Auth cookie refresh removed — auth is Clerk). */
export async function updateSession(request: NextRequest) {
  return NextResponse.next({ request });
}

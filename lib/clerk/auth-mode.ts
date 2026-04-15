/**
 * Publishable key is set — show Clerk `<SignIn />` / `<SignUp />` (e.g. Google SSO).
 * Does not imply server session verification; see `isClerkAuthActive`.
 */
export function isClerkConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
}

/**
 * Publishable key + secret — middleware `auth()`, `auth()` in RSC, and cookie
 * verification behave correctly. Add `CLERK_SECRET_KEY` or users bounce back to
 * legacy Supabase auth while the landing page still “looks” like Clerk is on.
 */
export function isClerkAuthActive(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) &&
    Boolean(process.env.CLERK_SECRET_KEY?.trim())
  );
}

type ClerkUserLike = {
  id: string;
  primaryEmailAddress?: { emailAddress: string } | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  username?: string | null;
};

/** Minimal user shape for display + Supabase row keys (Clerk-backed). */
export type AppUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

export function mapClerkUserToAppUser(
  user: ClerkUserLike | null | undefined,
): AppUser | null {
  if (!user?.id) return null;
  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    user_metadata: {
      first_name: user.firstName ?? "",
      last_name: user.lastName ?? "",
      full_name: user.fullName ?? "",
      name: user.username ?? "",
    },
  };
}

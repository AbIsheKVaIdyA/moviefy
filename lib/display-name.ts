import type { AppUser } from "@/lib/app-user";

const GENERIC_DEFAULTS = new Set(
  ["movie fan", "moviefy user", "user", "there"].map((s) => s.toLowerCase()),
);

/** First word / token for greeting and avatar (letter). */
export function firstNameFromFullName(full: string | null | undefined): string {
  const t = full?.trim();
  if (!t) return "";
  return t.split(/\s+/)[0] ?? "";
}

function displayNameFromUserMetadata(
  meta: Record<string, unknown> | undefined,
): string {
  if (!meta) return "";
  const fn =
    typeof meta.first_name === "string" ? meta.first_name.trim() : "";
  const ln = typeof meta.last_name === "string" ? meta.last_name.trim() : "";
  const combined = [fn, ln].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  const full =
    typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  if (full) return full;
  const name = typeof meta.name === "string" ? meta.name.trim() : "";
  return name;
}

/**
 * Profile row + signed-in user → display string for greeting.
 * Uses Clerk-style `user_metadata` and `profile.display_name`.
 */
export function resolveUserDisplayName(
  profileDisplayName: string | null | undefined,
  authUser: AppUser | null,
): string {
  const meta = authUser?.user_metadata as
    | Record<string, unknown>
    | undefined;
  const fromMeta = displayNameFromUserMetadata(meta);
  const rawProfile = profileDisplayName?.trim() ?? "";
  const emailLocal =
    authUser?.email?.split("@")[0]?.trim().toLowerCase() ?? "";
  const profileIsEmailPrefix =
    Boolean(rawProfile && emailLocal) &&
    rawProfile.toLowerCase() === emailLocal;

  if (
    rawProfile &&
    !GENERIC_DEFAULTS.has(rawProfile.toLowerCase()) &&
    !profileIsEmailPrefix
  ) {
    return rawProfile;
  }
  if (fromMeta && !GENERIC_DEFAULTS.has(fromMeta.toLowerCase())) {
    return fromMeta;
  }
  if (rawProfile && !profileIsEmailPrefix) return rawProfile;
  if (fromMeta) return fromMeta;
  return "there";
}

export function greetingFirstName(
  profileDisplayName: string | null | undefined,
  authUser: AppUser | null,
): string {
  const resolved = resolveUserDisplayName(profileDisplayName, authUser);
  const first = firstNameFromFullName(resolved);
  if (first) return first;
  return resolved || "there";
}

export function avatarLetter(
  profileDisplayName: string | null | undefined,
  authUser: AppUser | null,
): string {
  const g = greetingFirstName(profileDisplayName, authUser);
  return g.slice(0, 1).toUpperCase() || "?";
}

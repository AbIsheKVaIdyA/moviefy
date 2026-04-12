/** Client-side rules for sign-up; align Supabase Dashboard → Auth → Password strength if needed. */
export const PASSWORD_MIN_LENGTH = 12;

/** Returns an error message if invalid; otherwise `null`. */
export function validateSignUpPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!/[A-Z]/.test(password)) {
    return "Include at least one uppercase letter.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Include at least one special character (symbol or punctuation).";
  }
  return null;
}

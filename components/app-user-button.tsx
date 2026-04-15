"use client";

import { UserButton } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/clerk/auth-mode";
import { cn } from "@/lib/utils";

type AppUserButtonProps = {
  className?: string;
};

/**
 * Clerk profile control (avatar + manage account / sign out).
 * Renders nothing when Clerk is not configured (no `ClerkProvider`).
 */
export function AppUserButton({ className }: AppUserButtonProps) {
  if (!isClerkConfigured()) return null;
  return (
    <div className={cn("flex shrink-0 items-center", className)}>
      <UserButton />
    </div>
  );
}

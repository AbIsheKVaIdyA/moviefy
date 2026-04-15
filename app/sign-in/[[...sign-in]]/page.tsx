import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ClerkAuthStage } from "@/components/clerk-auth-stage";
import {
  isClerkAuthActive,
  isClerkConfigured,
} from "@/lib/clerk/auth-mode";
import { clerkRequestBaseUrl } from "@/lib/clerk/clerk-request-base-url";
import { safeClerkRedirectDestination } from "@/lib/clerk/safe-redirect-url";

type PageProps = {
  searchParams: Promise<{ redirect_url?: string }>;
};

export default async function SignInPage({ searchParams }: PageProps) {
  if (!isClerkConfigured()) {
    redirect("/");
  }

  const sp = await searchParams;
  if (isClerkAuthActive()) {
    const { userId } = await auth();
    if (userId) {
      const base = await clerkRequestBaseUrl();
      redirect(
        safeClerkRedirectDestination(base, sp.redirect_url, "/app/explore"),
      );
    }
  }

  return <ClerkAuthStage mode="sign-in" />;
}

import { redirect } from "next/navigation";

export default async function AuthSignInLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next =
    sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/app/explore";
  const p = new URLSearchParams();
  p.set("auth", "sign-in");
  p.set("next", next);
  if (sp.error) p.set("error", sp.error);
  redirect(`/?${p.toString()}`);
}

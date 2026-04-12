import { redirect } from "next/navigation";

export default async function AuthSignUpLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next =
    sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/app/explore";
  const p = new URLSearchParams();
  p.set("auth", "sign-up");
  p.set("next", next);
  redirect(`/?${p.toString()}`);
}

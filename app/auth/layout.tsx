import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#0a0a0a] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.76_0.17_151_/_0.12),transparent)]" />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
        <Suspense
          fallback={
            <p className="text-center text-sm text-white/50">Loading…</p>
          }
        >
          {children}
        </Suspense>
      </div>
    </div>
  );
}

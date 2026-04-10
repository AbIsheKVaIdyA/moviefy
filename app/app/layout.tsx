import { SupabaseAppProvider } from "@/components/supabase-app-provider";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SupabaseAppProvider>{children}</SupabaseAppProvider>;
}

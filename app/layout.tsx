import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { DM_Sans, JetBrains_Mono, Oswald } from "next/font/google";
import { ClerkAppShell } from "@/components/clerk-app-shell";
import { SupabaseAppProvider } from "@/components/supabase-app-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

/** UI body — neutral, readable. */
const sans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

/** Display / titles — bold condensed marquee energy. */
const heading = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Moviefy — movie lists, ranked",
  description:
    "Build playlists of films, rank them, explore genres, and share or keep lists private — Spotify-style energy for movies.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${sans.variable} ${mono.variable} ${heading.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="app-body-skin app-touch-root flex min-h-dvh flex-col text-foreground">
        <ClerkAppShell>
          <SupabaseAppProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </SupabaseAppProvider>
        </ClerkAppShell>
        <Analytics />
      </body>
    </html>
  );
}

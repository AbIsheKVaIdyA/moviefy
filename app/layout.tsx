import type { Metadata } from "next";
import { Geist_Mono, Space_Grotesk, Syne } from "next/font/google";
import { SupabaseAppProvider } from "@/components/supabase-app-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const sans = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const heading = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Moviefy — movie lists, ranked",
  description:
    "Build playlists of films, rank them, explore genres, and share or keep lists private — Spotify-style energy for movies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${sans.variable} ${geistMono.variable} ${heading.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="app-body-skin flex min-h-dvh flex-col text-foreground">
        <SupabaseAppProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </SupabaseAppProvider>
      </body>
    </html>
  );
}

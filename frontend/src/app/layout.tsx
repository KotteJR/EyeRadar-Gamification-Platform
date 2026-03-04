import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "EyeRadar - Dyslexia Exercise Platform",
  description:
    "AI-powered personalized exercise generation for dyslexia intervention",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://eyeradar.app"
  ),
  openGraph: {
    title: "EyeRadar - Dyslexia Exercise Platform",
    description:
      "AI-powered personalized exercise generation for dyslexia intervention",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <SessionProvider refetchOnWindowFocus={false} refetchWhenOffline={false}>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

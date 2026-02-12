"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

// Pages that don't need auth or sidebar
const PUBLIC_PATHS = ["/login"];
// Pages that are full-screen (no sidebar)
const FULLSCREEN_PATHS = ["/login", "/wizard"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isFullscreen = FULLSCREEN_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    // Not logged in -> go to login (unless already there)
    if (!isLoggedIn && !isPublic) {
      router.replace("/login");
      return;
    }

    // Logged in but on login page -> redirect to home
    if (isLoggedIn && pathname === "/login") {
      router.replace("/");
      return;
    }

    // Student who hasn't completed wizard -> force wizard
    if (
      isLoggedIn &&
      user?.role === "student" &&
      !user.wizardCompleted &&
      pathname !== "/wizard"
    ) {
      router.replace("/wizard");
      return;
    }

    // Student trying to access teacher routes -> redirect
    if (isLoggedIn && user?.role === "student") {
      if (
        pathname === "/" ||
        pathname.startsWith("/students") ||
        pathname.startsWith("/analytics")
      ) {
        router.replace("/student");
        return;
      }
    }

    // Teacher trying to access student portal -> redirect
    // Use exact match or /student/ prefix to avoid matching /students (teacher route)
    if (
      isLoggedIn &&
      user?.role === "teacher" &&
      (pathname === "/student" || pathname.startsWith("/student/"))
    ) {
      router.replace("/");
      return;
    }
  }, [isLoggedIn, user, pathname, router, isPublic]);

  // Show nothing while redirecting
  if (!isLoggedIn && !isPublic) {
    return null;
  }

  // Full-screen pages (login, wizard)
  if (isFullscreen) {
    return <>{children}</>;
  }

  // Standard layout with sidebar
  return (
    <>
      <Sidebar />
      <main className="ml-64 min-h-screen bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-8 py-8">{children}</div>
      </main>
    </>
  );
}

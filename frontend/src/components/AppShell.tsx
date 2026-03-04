"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import ParentTopbar from "@/components/ParentTopbar";

// Pages that don't require auth or sidebar
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/pricing", "/parent/pricing"];
// Pages that are full-screen (no sidebar)
const FULLSCREEN_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/student/map", "/pricing", "/parent/pricing"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isFullscreen = FULLSCREEN_PATHS.some((p) => pathname.startsWith(p));
  const allowGuardianStudentDetail = /^\/students\/[^/]+$/.test(pathname);
  const isGuardianThemed =
    user?.role === "guardian" && (pathname === "/parent" || allowGuardianStudentDetail);

  useEffect(() => {
    // Not logged in -> go to login (unless already on a public page)
    if (!isLoggedIn && !isPublic) {
      router.replace("/login");
      return;
    }

    // Logged in but on register pages -> redirect to correct home.
    // Keep /login accessible so users can switch accounts deliberately.
    if (isLoggedIn && pathname.startsWith("/register")) {
      if (user?.role === "student") router.replace("/student");
      else if (user?.role === "guardian") router.replace("/parent");
      else router.replace("/");
      return;
    }

    if (!isLoggedIn) return;

    // Student trying to access teacher routes
    if (user?.role === "student") {
      if (
        pathname === "/" ||
        pathname.startsWith("/students") ||
        pathname.startsWith("/analytics") ||
        pathname.startsWith("/parent")
      ) {
        router.replace("/student");
        return;
      }
    }

    // Teacher trying to access student portal
    if (
      user?.role === "teacher" &&
      (pathname === "/student" || pathname.startsWith("/student/"))
    ) {
      router.replace("/");
      return;
    }

    // Guardian trying to access teacher/student routes
    if (user?.role === "guardian") {
      if (
        pathname === "/" ||
        (pathname.startsWith("/students") && !allowGuardianStudentDetail) ||
        pathname.startsWith("/analytics") ||
        pathname === "/student" ||
        pathname.startsWith("/student/")
      ) {
        router.replace("/parent");
        return;
      }
    }
  }, [isLoggedIn, user, pathname, router, isPublic]);

  // Show nothing while redirecting
  if (!isLoggedIn && !isPublic) {
    return null;
  }

  // Full-screen pages (login, student map, pricing)
  if (isFullscreen) {
    return <>{children}</>;
  }

  // Standard layout with top navbar
  return (
    <>
      {isGuardianThemed ? <ParentTopbar /> : <Sidebar />}
      <main className={`relative pt-14 min-h-screen ${isGuardianThemed ? "" : "bg-white"}`}>
        {isGuardianThemed && (
          <>
            <img
              src="/game-assets/backgrounds/sunset.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-center [image-rendering:pixelated]"
            />
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-black/50 to-black/60" />
          </>
        )}
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </>
  );
}

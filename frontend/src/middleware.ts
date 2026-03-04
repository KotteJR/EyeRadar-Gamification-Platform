import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Paths that do not require authentication
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/pricing", "/parent/pricing"];

export default auth(function middleware(req) {
  const session = req.auth;
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.ico).*)",
  ],
};

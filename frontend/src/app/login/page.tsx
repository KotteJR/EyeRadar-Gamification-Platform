"use client";

import { signIn, signOut } from "next-auth/react";
import { clearBearerTokenCache } from "@/lib/api";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Ensure we are not reusing an existing session when switching users.
      await signOut({ redirect: false });
      clearBearerTokenCache();
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
        callbackUrl: "/",
      });
      if (!result?.ok) {
        setError("Invalid username or password. Please try again.");
      } else {
        // Full navigation so SessionProvider reads the new session cookies. Client-only
        // router.push can leave useSession stale and AppShell may redirect back to /login.
        window.location.assign(result.url ?? "/");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/game-assets/backgrounds/sunset.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          imageRendering: "pixelated",
        }}
      />
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/70" />

      <div className="relative z-10 min-h-screen px-4 py-6 sm:px-8 sm:py-10 flex flex-col">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex">
            <Image
              src="/full-logo.svg"
              alt="eyeRadar"
              width={120}
              height={20}
              className="h-5 w-auto brightness-0 invert"
              priority
            />
          </Link>
          <Link
            href="/pricing"
            className="h-9 px-4 inline-flex items-center rounded-full text-[13px] font-semibold text-white bg-[#171717]/30 hover:bg-[#171717]/20 transition-colors transition-all duration-300"
          >
            Pricing
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[460px] rounded-2xl border border-white/25 bg-white/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <h2 className="text-[30px] font-bold text-neutral-900 tracking-tight leading-tight">
                Welcome back
              </h2>
              <p className="text-[14px] text-neutral-500 mt-2 leading-relaxed">
                Sign in to continue your learning journey.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-neutral-600">
                  Username or email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="username"
                  autoFocus
                  required
                  className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/[0.06] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[13px] font-medium text-neutral-600">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[12px] italic font-medium text-neutral-500 hover:text-neutral-800 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/[0.06] transition-all"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  <p className="text-[13px] text-red-600 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 h-12 hover:brightness-110 active:scale-[0.99] active:brightness-95 text-white text-[14px] font-semibold rounded-xl transition-all disabled:opacity-60 select-none"
                style={{ background: "linear-gradient(90deg, #FF9E75 0%, #FF5A39 100%)" }}
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </>
                )}
              </button>

            </form>

            <div className="mt-6 text-center space-y-2.5">
              <p className="text-[14px] text-neutral-500">
                New guardian account?{" "}
                <Link href="/register" className="text-[#FF5A39] font-semibold hover:underline">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

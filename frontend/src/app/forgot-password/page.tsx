"use client";

import { useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devCode, setDevCode] = useState("");
  const [devLink, setDevLink] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setDevCode("");
    setDevLink("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/password/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.detail || "Unable to send reset instructions.");
        return;
      }
      setMessage(payload?.message || "If an account exists, reset instructions were sent.");
      if (payload?.dev_code) setDevCode(payload.dev_code);
      if (payload?.dev_reset_link) setDevLink(payload.dev_reset_link);
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
          backgroundImage: "url('/game-assets/backgrounds/night.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          imageRendering: "pixelated",
        }}
      />
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/70" />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/25 bg-white/90 backdrop-blur-xl p-6 space-y-4">
          <h1 className="text-2xl font-bold text-neutral-900">Reset password</h1>
          <p className="text-sm text-neutral-500">
            Enter your account email and we will send reset instructions.
          </p>
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px]"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-white font-semibold disabled:opacity-60"
              style={{ background: "linear-gradient(90deg, #FF9E75 0%, #FF5A39 100%)" }}
            >
              {loading ? "Sending..." : "Send reset instructions"}
            </button>
          </form>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-700">{message}</p>}
          {devCode && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Dev code: <span className="font-semibold">{devCode}</span>
            </div>
          )}
          {devLink && (
            <a href={devLink} className="text-sm text-[#FF5A39] font-semibold underline">
              Open reset page
            </a>
          )}
          <p className="text-sm text-neutral-500">
            Back to{" "}
            <Link href="/login" className="text-[#FF5A39] font-semibold">
              login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

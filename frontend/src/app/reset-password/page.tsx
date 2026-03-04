"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!token) {
      setError("Reset token is missing.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          code,
          new_password: password,
          confirm_password: confirmPassword,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.detail || "Unable to reset password.");
        return;
      }
      setMessage("Password reset successful. Redirecting to login...");
      setTimeout(() => router.push("/login"), 1000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/25 bg-white/90 backdrop-blur-xl p-6 space-y-4">
          <h1 className="text-2xl font-bold text-neutral-900">Choose new password</h1>
          <p className="text-sm text-neutral-500">
            Enter the verification code from your email and set a new password.
          </p>
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Verification code"
              required
              className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px]"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              required
              minLength={8}
              className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px]"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={8}
              className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px]"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-white font-semibold disabled:opacity-60"
              style={{ background: "linear-gradient(90deg, #FF9E75 0%, #FF5A39 100%)" }}
            >
              {loading ? "Updating..." : "Reset password"}
            </button>
          </form>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-700">{message}</p>}
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

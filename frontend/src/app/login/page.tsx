"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, getDynamicAccounts } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const dynamicAccounts = getDynamicAccounts();
  const needsPassword = (() => {
    if (["teacher", "student5yrs", "student10yrs", "student15yrs"].includes(username)) return true;
    const dyn = dynamicAccounts.find((a) => a.username === username);
    if (dyn && dyn.password === null) return false;
    return true;
  })();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const ok = login(username, password);
    if (ok) {
      router.push("/");
    } else {
      setError("Invalid username or password");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className={`w-full max-w-sm ${shake ? "animate-shake" : ""}`}>
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/full-logo.svg" alt="eyeRadar" className="h-7 mx-auto mb-2" />
          <p className="text-[13px] text-neutral-400">The Exercise Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-cream rounded-2xl p-7">
          <h2 className="text-lg font-semibold text-neutral-900 mb-5 text-center">Sign In</h2>

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-[13px] font-medium text-neutral-600 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-[13px] bg-white placeholder:text-neutral-300 transition-all"
                autoFocus
              />
            </div>

            {needsPassword ? (
              <div>
                <label className="block text-[13px] font-medium text-neutral-600 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-[13px] bg-white placeholder:text-neutral-300 transition-all"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-emerald-700 font-medium">No password needed - just click Sign In!</p>
              </div>
            )}

            {error && (
              <p className="text-[13px] text-red-500 text-center bg-red-50 rounded-lg py-2 font-medium">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full justify-center py-2.5">
              Sign In
            </button>
          </form>

          {/* Quick login hints */}
          <div className="mt-6 pt-5 border-t border-neutral-100">
            <p className="text-[11px] text-neutral-400 text-center mb-3 uppercase tracking-wider font-medium">
              Demo accounts
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { u: "teacher", label: "Teacher", icon: "T" },
                { u: "student5yrs", label: "Student (5yr)", icon: "5" },
                { u: "student10yrs", label: "Student (10yr)", icon: "10" },
                { u: "student15yrs", label: "Student (15yr)", icon: "15" },
              ].map((acc) => (
                <button
                  key={acc.u}
                  onClick={() => { setUsername(acc.u); setPassword(acc.u); }}
                  className="flex items-center gap-2 text-[12px] py-2 px-3 bg-neutral-50 text-neutral-500 rounded-lg hover:bg-neutral-100 transition-colors font-medium"
                >
                  <span className="w-5 h-5 rounded bg-neutral-200 flex items-center justify-center text-[10px] font-semibold text-neutral-500">
                    {acc.icon}
                  </span>
                  {acc.label}
                </button>
              ))}
            </div>

            {/* Dynamic student accounts */}
            {dynamicAccounts.length > 0 && (
              <>
                <p className="text-[11px] text-neutral-400 text-center mt-4 mb-3 uppercase tracking-wider font-medium">
                  Student accounts
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {dynamicAccounts.map((acc) => (
                    <button
                      key={acc.username}
                      onClick={() => { setUsername(acc.username); setPassword(""); }}
                      className="flex items-center gap-2 text-[12px] py-2 px-3 bg-neutral-50 text-neutral-500 rounded-lg hover:bg-neutral-100 transition-colors font-medium"
                    >
                      <span className="w-5 h-5 rounded-full bg-neutral-300 flex items-center justify-center text-[10px] font-semibold text-white">
                        {acc.displayName.charAt(0)}
                      </span>
                      <span className="truncate">{acc.displayName}</span>
                      {acc.password === null && (
                        <span className="ml-auto text-[9px] text-emerald-500 font-semibold">No PW</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

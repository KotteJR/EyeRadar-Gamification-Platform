"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 flex items-center justify-center p-4">
      <div className={`w-full max-w-sm ${shake ? "animate-shake" : ""}`}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200/50">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">EyeRadar</h1>
          <p className="text-sm text-slate-400 mt-0.5">Dyslexia Exercise Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/30 p-7">
          <h2 className="text-lg font-semibold text-slate-900 mb-5 text-center">Sign In</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 placeholder:text-slate-300 transition-all"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 placeholder:text-slate-300 transition-all"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center bg-red-50 rounded-lg py-2 font-medium">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200/50 text-sm"
            >
              Sign In
            </button>
          </form>

          {/* Quick login hints */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 text-center mb-3 uppercase tracking-wider font-medium">
              Demo accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { u: "teacher", label: "Teacher", icon: "T" },
                { u: "student5yrs", label: "Student (5yr)", icon: "5" },
                { u: "student10yrs", label: "Student (10yr)", icon: "10" },
                { u: "student15yrs", label: "Student (15yr)", icon: "15" },
              ].map((acc) => (
                <button
                  key={acc.u}
                  onClick={() => { setUsername(acc.u); setPassword(acc.u); }}
                  className="flex items-center gap-2 text-xs py-2 px-3 bg-slate-50 text-slate-500 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors font-medium"
                >
                  <span className="w-5 h-5 rounded bg-slate-200/80 flex items-center justify-center text-[10px] font-bold text-slate-500">
                    {acc.icon}
                  </span>
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

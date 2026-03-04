"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowLeft,
  Users,
  UserRound,
  Plus,
  Trash2,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const STEP_BACKGROUNDS = [
  "/game-assets/backgrounds/cloud_kingdom.png",
  "/game-assets/backgrounds/forest.png",
  "/game-assets/backgrounds/mountain.png",
  "/game-assets/backgrounds/sunset.png",
];

const STEP_LABELS = [
  "Account Basics",
  "Guardian Profile",
  "Password",
  "Children & Checkout",
];

const STEP_DESCRIPTIONS = [
  "Pick your login details to get started.",
  "Tell us who is managing the learning journey.",
  "Create a secure password for your account.",
  "Add your child details before continuing to payment.",
];

type ChildDraft = {
  name: string;
  username: string;
  password: string;
  confirmPassword: string;
  age: number;
  language: string;
};

type UsernameStatus = "idle" | "invalid" | "checking" | "available" | "taken" | "error";
type EmailStatus = "idle" | "invalid" | "checking" | "available" | "taken" | "error";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [children, setChildren] = useState<ChildDraft[]>([
    { name: "", username: "", password: "", confirmPassword: "", age: 8, language: "en" },
  ]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [guardianUsernameStatus, setGuardianUsernameStatus] = useState<UsernameStatus>("idle");
  const [childUsernameStatus, setChildUsernameStatus] = useState<Record<number, UsernameStatus>>({});
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");

  const canGoStep2 =
    username.trim().length >= 3 &&
    email.trim().length >= 5 &&
    guardianUsernameStatus === "available" &&
    emailStatus === "available";
  const canGoStep3 = firstName.trim().length >= 1 && lastName.trim().length >= 1;
  const canSubmit =
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    password === confirmPassword &&
    children.length >= 1 &&
    children.every(
      (c, i) =>
        c.name.trim().length >= 1 &&
        c.username.trim().length >= 3 &&
        childUsernameStatus[i] === "available" &&
        c.password.length >= 8 &&
        c.confirmPassword.length >= 8 &&
        c.password === c.confirmPassword
    );
  const activeBg = STEP_BACKGROUNDS[Math.max(0, Math.min(3, step - 1))];

  const getUsernameStatusText = (status: UsernameStatus) => {
    if (status === "available") return "Username available";
    if (status === "taken") return "Username already taken";
    if (status === "checking") return "Checking username...";
    if (status === "invalid") return "Minimum 3 characters";
    if (status === "error") return "Could not check right now";
    return "";
  };

  const getUsernameStatusClass = (status: UsernameStatus) => {
    if (status === "available") return "text-emerald-600";
    if (status === "taken" || status === "error") return "text-red-600";
    return "text-neutral-500";
  };

  const getEmailStatusText = (status: EmailStatus) => {
    if (status === "available") return "Email available";
    if (status === "taken") return "Email already in use";
    if (status === "checking") return "Checking email...";
    if (status === "invalid") return "Enter a valid email address";
    if (status === "error") return "Could not check right now";
    return "";
  };

  const checkUsernameAvailability = async (candidate: string) => {
    const res = await fetch(
      `${API_BASE}/auth/username/availability?username=${encodeURIComponent(candidate)}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("availability check failed");
    const payload = (await res.json()) as { available?: boolean };
    return Boolean(payload?.available);
  };

  const checkEmailAvailability = async (candidate: string) => {
    const res = await fetch(
      `${API_BASE}/auth/email/availability?email=${encodeURIComponent(candidate)}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("email availability check failed");
    const payload = (await res.json()) as { available?: boolean };
    return Boolean(payload?.available);
  };

  const updateChild = (index: number, patch: Partial<ChildDraft>) => {
    setChildren((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const addChild = () => {
    setChildren((prev) => [
      ...prev,
      {
        name: "",
        username: "",
        password: "",
        confirmPassword: "",
        age: 8,
        language: "en",
      },
    ]);
  };

  const removeChild = (index: number) => {
    setChildren((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
    setChildUsernameStatus((prev) => {
      const next: Record<number, UsernameStatus> = {};
      Object.entries(prev).forEach(([k, value]) => {
        const i = Number(k);
        if (i < index) next[i] = value;
        if (i > index) next[i - 1] = value;
      });
      return next;
    });
  };

  useEffect(() => {
    const normalized = username.trim().toLowerCase();
    if (!normalized) {
      setGuardianUsernameStatus("idle");
      return;
    }
    if (normalized.length < 3) {
      setGuardianUsernameStatus("invalid");
      return;
    }
    let cancelled = false;
    setGuardianUsernameStatus("checking");
    const t = window.setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(normalized);
        if (cancelled) return;
        setGuardianUsernameStatus(available ? "available" : "taken");
      } catch {
        if (cancelled) return;
        setGuardianUsernameStatus("error");
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [username]);

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      const normalizedChildren = children.map((c) => c.username.trim().toLowerCase());
      const duplicateCounts: Record<string, number> = {};
      normalizedChildren.forEach((u) => {
        if (!u) return;
        duplicateCounts[u] = (duplicateCounts[u] || 0) + 1;
      });

      children.forEach(async (child, index) => {
        const normalized = child.username.trim().toLowerCase();
        if (!normalized) {
          setChildUsernameStatus((prev) => ({ ...prev, [index]: "idle" }));
          return;
        }
        if (normalized.length < 3) {
          setChildUsernameStatus((prev) => ({ ...prev, [index]: "invalid" }));
          return;
        }
        if (duplicateCounts[normalized] > 1 || normalized === username.trim().toLowerCase()) {
          setChildUsernameStatus((prev) => ({ ...prev, [index]: "taken" }));
          return;
        }
        setChildUsernameStatus((prev) => ({ ...prev, [index]: "checking" }));
        try {
          const available = await checkUsernameAvailability(normalized);
          if (cancelled) return;
          setChildUsernameStatus((prev) => ({
            ...prev,
            [index]: available ? "available" : "taken",
          }));
        } catch {
          if (cancelled) return;
          setChildUsernameStatus((prev) => ({ ...prev, [index]: "error" }));
        }
      });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [children, username]);

  useEffect(() => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setEmailStatus("idle");
      return;
    }
    if (!normalized.includes("@") || !normalized.split("@").pop()?.includes(".")) {
      setEmailStatus("invalid");
      return;
    }
    let cancelled = false;
    setEmailStatus("checking");
    const t = window.setTimeout(async () => {
      try {
        const available = await checkEmailAvailability(normalized);
        if (cancelled) return;
        setEmailStatus(available ? "available" : "taken");
      } catch {
        if (cancelled) return;
        setEmailStatus("error");
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [email]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!canSubmit) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/onboarding/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          first_name: firstName,
          last_name: lastName,
          password,
          confirm_password: confirmPassword,
          children: children.map((child) => ({
            name: child.name,
            username: child.username,
            temporary_password: child.password,
            confirm_temporary_password: child.confirmPassword,
            age: child.age,
            language: child.language,
            // Keep UI simple (age-only) and derive grade for backend compatibility.
            grade: Math.max(0, Math.min(12, child.age - 5)),
          })),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.detail || "Failed to create account.");
        return;
      }
      if (payload?.checkout_url) {
        window.location.href = payload.checkout_url;
        return;
      }
      setError("Unable to start checkout.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {STEP_BACKGROUNDS.map((bg) => (
        <div
          key={bg}
          className={`absolute inset-0 transition-opacity duration-700 ${
            bg === activeBg ? "opacity-100" : "opacity-0"
          }`}
          style={{
            backgroundImage: `url('${bg}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            imageRendering: "pixelated",
          }}
        />
      ))}
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/20 to-black/65" />

      <div className="relative z-10 min-h-screen px-4 py-6 sm:px-8 sm:py-10 flex flex-col">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          <Image
            src="/full-logo.svg"
            alt="eyeRadar"
            width={120}
            height={20}
            className="h-5 w-auto brightness-0 invert"
            priority
          />
          <p className="text-white/70 text-xs sm:text-sm">
            Step {step} of 4 · {STEP_LABELS[step - 1]}
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[740px]">
            <div className="mb-4 sm:mb-6 flex items-center justify-center gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i <= step ? "w-10 sm:w-16 bg-[#FF5A39]" : "w-6 sm:w-10 bg-white/40"
                  }`}
                />
              ))}
            </div>

            <div className="rounded-2xl border border-white/25 bg-white/90 backdrop-blur-xl p-5 sm:p-7 space-y-5 shadow-2xl">
              <div className="text-center">
                <h2 className="text-[24px] sm:text-[30px] font-bold text-neutral-900 tracking-tight">
                  Create guardian account
                </h2>
                <p className="text-[13px] sm:text-[14px] text-neutral-500 mt-1.5">
                  {STEP_DESCRIPTIONS[step - 1]}
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-5">
            {step === 1 && (
              <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
                <p className="text-[13px] font-semibold text-neutral-700 flex items-center gap-2">
                  <UserRound size={14} />
                  Account basics
                </p>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                  className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px]"
                />
                {username.trim().length > 0 && (
                  <p className={`text-[12px] ${getUsernameStatusClass(guardianUsernameStatus)}`}>
                    {getUsernameStatusText(guardianUsernameStatus)}
                  </p>
                )}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px]"
                />
                {email.trim().length > 0 && (
                  <p className={`text-[12px] ${getUsernameStatusClass(emailStatus as UsernameStatus)}`}>
                    {getEmailStatusText(emailStatus)}
                  </p>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
                <p className="text-[13px] font-semibold text-neutral-700">Your name</p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    required
                    className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px]"
                  />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    required
                    className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px]"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
                <p className="text-[13px] font-semibold text-neutral-700">Secure your account</p>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (min 8 chars)"
                  required
                  minLength={8}
                  className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px]"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required
                  minLength={8}
                  className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px]"
                />
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <p className="text-[12px] text-red-600">Passwords do not match.</p>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
                <p className="text-[13px] font-semibold text-neutral-700 flex items-center gap-2">
                  <Users size={14} />
                  Your children
                </p>
                <p className="text-[12px] text-neutral-500">
                  Set login credentials for each child account.
                </p>
                {children.map((child, index) => (
                  <div key={`child-${index}`} className="rounded-xl border border-neutral-200 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-semibold text-neutral-600">Child {index + 1}</p>
                      {children.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeChild(index)}
                          className="inline-flex items-center gap-1 text-[12px] text-red-600"
                        >
                          <Trash2 size={12} />
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={child.name}
                      onChange={(e) => updateChild(index, { name: e.target.value })}
                      placeholder="Child name"
                      required
                      className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px]"
                    />
                    <input
                      type="text"
                      value={child.username}
                      onChange={(e) => updateChild(index, { username: e.target.value })}
                      placeholder="Child username"
                      required
                      minLength={3}
                      className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px]"
                    />
                    {child.username.trim().length > 0 && (
                      <p
                        className={`text-[12px] ${getUsernameStatusClass(
                          childUsernameStatus[index] || "idle"
                        )}`}
                      >
                        {getUsernameStatusText(childUsernameStatus[index] || "idle")}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="password"
                        value={child.password}
                        onChange={(e) => updateChild(index, { password: e.target.value })}
                        placeholder="Password"
                        required
                        minLength={8}
                        className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px]"
                      />
                      <input
                        type="password"
                        value={child.confirmPassword}
                        onChange={(e) =>
                          updateChild(index, { confirmPassword: e.target.value })
                        }
                        placeholder="Confirm password"
                        required
                        minLength={8}
                        className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px]"
                      />
                    </div>
                    {child.confirmPassword.length > 0 &&
                      child.password !== child.confirmPassword && (
                        <p className="text-[12px] text-red-600">
                          Child passwords do not match.
                        </p>
                      )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[12px] font-medium text-neutral-500">Age</label>
                        <input
                          type="number"
                          value={child.age}
                          onChange={(e) => updateChild(index, { age: Number(e.target.value) })}
                          min={4}
                          max={18}
                          required
                          className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[12px] font-medium text-neutral-500">Language</label>
                        <select
                          value={child.language}
                          onChange={(e) => updateChild(index, { language: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px]"
                        >
                          <option value="en">EN</option>
                          <option value="sv">SV</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addChild}
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#FF5A39]"
                >
                  <Plus size={14} />
                  Add another child
                </button>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-[13px] text-red-600 font-medium">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className="h-12 px-4 rounded-xl border border-neutral-200 text-neutral-700 inline-flex items-center gap-2 text-[14px] font-semibold"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              )}
              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1 && !canGoStep2) {
                      if (guardianUsernameStatus === "checking") {
                        setError("Please wait while we check username availability.");
                      } else if (guardianUsernameStatus === "taken") {
                        setError("That username is already taken. Please choose another.");
                      } else if (emailStatus === "checking") {
                        setError("Please wait while we check email availability.");
                      } else if (emailStatus === "taken") {
                        setError("That email already has an account. Please sign in instead.");
                      } else {
                        setError("Please add username and email.");
                      }
                      return;
                    }
                    if (step === 2 && !canGoStep3) {
                      setError("Please add first and last name.");
                      return;
                    }
                    if (step === 3 && (password.length < 8 || password !== confirmPassword)) {
                      setError("Please set a valid password and confirm it.");
                      return;
                    }
                    setError("");
                    setStep((s) => Math.min(4, s + 1));
                  }}
                  className="flex-1 h-12 rounded-xl bg-[#171717] text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2"
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="flex-1 flex items-center justify-center gap-2.5 h-12 hover:brightness-110 active:scale-[0.99] active:brightness-95 text-white text-[14px] font-semibold rounded-xl transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(90deg, #FF9E75 0%, #FF5A39 100%)" }}
                >
                  {loading ? "Redirecting to checkout..." : (
                    <>
                      Continue to checkout
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              )}
            </div>
              </form>
            </div>

            <p className="mt-4 text-center text-[13px] text-white/85">
              Already have an account?{" "}
              <Link href="/login" className="text-white font-semibold underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

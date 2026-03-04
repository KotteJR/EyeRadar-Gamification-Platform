"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, AlertCircle, ArrowRight } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type OnboardingStatus = "pending_payment" | "processing" | "completed" | "failed";

export default function RegisterSuccessPage() {
  const params = useSearchParams();
  const onboardingId = params.get("onboarding_id") || "";
  const [status, setStatus] = useState<OnboardingStatus>("processing");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!onboardingId) return;
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/onboarding/${onboardingId}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload?.detail || "Unable to check onboarding status.");
        }
        if (!mounted) return;
        setStatus(payload?.status || "processing");
        setError(payload?.error_message || "");
        if ((payload?.status || "") !== "completed" && (payload?.status || "") !== "failed") {
          timer = setTimeout(poll, 2500);
        }
      } catch (err) {
        if (!mounted) return;
        setStatus("failed");
        setError(err instanceof Error ? err.message : "Unable to verify onboarding.");
      }
    };

    poll();
    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [onboardingId]);

  const headline = useMemo(() => {
    if (status === "completed") return "Account ready";
    if (status === "failed") return "Setup needs attention";
    return "Finalising your account";
  }, [status]);

  if (!onboardingId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700 font-medium text-sm">Missing onboarding session ID.</p>
          <Link href="/register" className="mt-4 inline-block text-sm text-red-700 underline">
            Return to signup
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div
        className="hidden lg:block lg:w-1/2 relative"
        style={{
          backgroundImage: "url('/game-assets/bg_mountain_evening_16_9.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          imageRendering: "pixelated",
        }}
      >
        <div className="absolute inset-0 bg-black/45" />
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-8">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-[#F9F9F9] p-7 text-center space-y-4">
          <p className="text-xs uppercase tracking-[0.16em] text-neutral-400">Onboarding</p>
          <h1 className="text-2xl font-bold text-neutral-900">{headline}</h1>

          {status === "completed" && (
            <div className="space-y-3">
              <CheckCircle2 className="mx-auto text-emerald-600" size={28} />
              <p className="text-sm text-neutral-600">
                Payment confirmed. Your guardian account and children are now created.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-white text-sm font-semibold"
                style={{ background: "linear-gradient(90deg, #FF9E75 0%, #FF5A39 100%)" }}
              >
                Go to login
                <ArrowRight size={15} />
              </Link>
            </div>
          )}

          {(status === "processing" || status === "pending_payment") && (
            <div className="space-y-3">
              <Loader2 className="mx-auto animate-spin text-[#FF5A39]" size={26} />
              <p className="text-sm text-neutral-600">
                We are setting up your account. This usually takes a few seconds.
              </p>
            </div>
          )}

          {status === "failed" && (
            <div className="space-y-3">
              <AlertCircle className="mx-auto text-red-600" size={26} />
              <p className="text-sm text-red-700">
                {error || "We could not complete onboarding. Please contact support or retry."}
              </p>
              <Link href="/register" className="text-sm text-[#FF5A39] font-semibold underline">
                Start again
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

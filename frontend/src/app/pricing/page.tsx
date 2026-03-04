"use client";

import { Check, Users, GraduationCap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const plans = [
  {
    id: "family",
    name: "Family Plan",
    price: "EUR 10",
    period: "per month",
    description: "One guardian + one child included.",
    icon: Users,
    color: "text-[#FF5A39]",
    bgColor: "bg-[#FF5A39]/10",
    buttonLabel: "Get started",
    buttonStyle: "bg-[#FF5A39] text-white hover:brightness-110",
    features: [
      "Everything unlocked",
      "1 child included",
      "Additional child: EUR 5/month",
      "Adventure maps and progress insights",
      "Custom child accounts",
    ],
    missing: [],
    highlighted: true,
  },
  {
    id: "educator",
    name: "Educator Plan",
    price: "EUR 74.99",
    period: "per month",
    description: "Designed for teachers and learning groups.",
    icon: GraduationCap,
    color: "text-[#475093]",
    bgColor: "bg-[#475093]/10",
    buttonLabel: "Contact sales",
    buttonStyle: "bg-[#171717] text-white hover:bg-[#303030]",
    features: [
      "Starts with 15 students",
      "Discounted per-student pricing",
      "Everything in Family Plan",
      "Classroom-oriented management",
      "Priority onboarding support",
    ],
    missing: [],
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/game-assets/backgrounds/forest.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          imageRendering: "pixelated",
        }}
      />
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/25 to-black/70" />

      <div className="relative z-10 min-h-screen px-4 py-6 sm:px-8 sm:py-10">
        <div className="max-w-6xl mx-auto flex items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/full-logo.svg"
              alt="eyeRadar"
              width={120}
              height={20}
              className="h-5 w-auto brightness-0 invert"
              priority
            />
          </Link>
          <div className="ml-auto flex items-center gap-3">
          <Link
            href="/login"
            className="text-[13px] font-medium text-white/80 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="text-[13px] font-semibold text-white bg-[#171717]/90 hover:bg-[#171717] transition-colors px-4 py-2 rounded-full"
          >
            Get started
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-2 sm:px-6 py-12 sm:py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-[11px] font-semibold text-white/80 uppercase tracking-widest mb-5">
            Pricing
          </span>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-4">
            Simple plans
          </h1>
          <p className="text-[16px] text-white/80 max-w-md mx-auto">
            Choose the plan that fits your family or classroom.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border transition-shadow backdrop-blur-xl ${
                  plan.highlighted
                    ? "bg-white/95 border-[#FF5A39]/40 shadow-lg shadow-[#FF5A39]/20"
                    : "bg-white/90 border-white/30 shadow-md"
                } p-7 flex flex-col`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FF5A39] text-white text-[11px] font-bold uppercase tracking-wide shadow-sm">
                      Most popular
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <div
                    className={`w-10 h-10 rounded-xl ${plan.bgColor} flex items-center justify-center mb-4`}
                  >
                    <Icon size={18} className={plan.color} />
                  </div>
                  <h3 className="text-[17px] font-bold text-neutral-900">{plan.name}</h3>
                  <p className="text-[12px] text-neutral-400 mt-0.5">{plan.description}</p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-neutral-900">{plan.price}</span>
                    <span className="text-[12px] text-neutral-400">{plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                      <span className="text-[13px] text-neutral-700">{f}</span>
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 opacity-40">
                      <span className="w-3.5 mt-0.5 flex-shrink-0 text-center text-neutral-400 text-[11px] font-bold">—</span>
                      <span className="text-[13px] text-neutral-400 line-through">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  className={`w-full h-10 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.99] ${plan.buttonStyle}`}
                  onClick={() => {
                    if (plan.id === "educator") {
                      window.location.href = "mailto:hello@eyeradar.io?subject=Educator Plan Enquiry";
                    } else {
                      window.location.href = "/register";
                    }
                  }}
                >
                  {plan.buttonLabel}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[12px] text-white/70 mt-10">
          Need help choosing?{" "}
          <a href="mailto:hello@eyeradar.io" className="text-white font-medium hover:underline">
            Contact us
          </a>
        </p>
      </div>
      </div>
    </div>
  );
}

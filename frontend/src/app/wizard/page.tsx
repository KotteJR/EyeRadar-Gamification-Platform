"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const INTEREST_OPTIONS = [
  { id: "animals", emoji: "🐾", label: "Animals" },
  { id: "space", emoji: "🚀", label: "Space" },
  { id: "sports", emoji: "⚽", label: "Sports" },
  { id: "music", emoji: "🎵", label: "Music" },
  { id: "art", emoji: "🎨", label: "Art & Drawing" },
  { id: "nature", emoji: "🌿", label: "Nature" },
  { id: "cooking", emoji: "🍳", label: "Cooking" },
  { id: "gaming", emoji: "🎮", label: "Video Games" },
  { id: "reading", emoji: "📚", label: "Books & Stories" },
  { id: "dinosaurs", emoji: "🦕", label: "Dinosaurs" },
  { id: "superheroes", emoji: "🦸", label: "Superheroes" },
  { id: "ocean", emoji: "🌊", label: "Ocean & Sea Life" },
  { id: "robots", emoji: "🤖", label: "Robots & Tech" },
  { id: "cars", emoji: "🏎️", label: "Cars & Racing" },
  { id: "magic", emoji: "✨", label: "Magic & Fantasy" },
  { id: "dance", emoji: "💃", label: "Dance" },
];

const STEPS = ["welcome", "interests", "ready"] as const;
type Step = (typeof STEPS)[number];

export default function WizardPage() {
  const { user, updateInterests, completeWizard } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [selected, setSelected] = useState<string[]>([]);

  if (!user || user.role !== "student") {
    router.push("/");
    return null;
  }

  const toggleInterest = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleFinish = () => {
    updateInterests(selected);
    completeWizard();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-all ${
                STEPS.indexOf(step) >= i
                  ? "bg-indigo-600 scale-110"
                  : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Step: Welcome */}
        {step === "welcome" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-10 text-center">
            <div className="text-6xl mb-6">👋</div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">
              Welcome, {user.displayName}!
            </h1>
            <p className="text-lg text-slate-500 mb-8 max-w-md mx-auto">
              Let&apos;s set up your learning adventure. We&apos;ll ask you a few questions
              to make your games extra fun!
            </p>
            <button
              onClick={() => setStep("interests")}
              className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 text-lg"
            >
              Let&apos;s Go!
            </button>
          </div>
        )}

        {/* Step: Interests */}
        {step === "interests" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">
              What do you like?
            </h2>
            <p className="text-slate-500 text-center mb-6">
              Pick as many as you want! This helps us make your games more fun.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {INTEREST_OPTIONS.map((opt) => {
                const isSelected = selected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleInterest(opt.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100 scale-105"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-3xl">{opt.emoji}</span>
                    <span className={`text-sm font-medium ${isSelected ? "text-indigo-700" : "text-slate-600"}`}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setStep("welcome")}
                className="px-6 py-2.5 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep("ready")}
                disabled={selected.length === 0}
                className="px-8 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-200"
              >
                Next ({selected.length} selected)
              </button>
            </div>
          </div>
        )}

        {/* Step: Ready */}
        {step === "ready" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-10 text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">
              You&apos;re all set!
            </h1>
            <p className="text-lg text-slate-500 mb-4 max-w-md mx-auto">
              We&apos;ll use your interests to create fun and personalized learning games just for you.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {selected.map((id) => {
                const opt = INTEREST_OPTIONS.find((o) => o.id === id);
                return opt ? (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium"
                  >
                    {opt.emoji} {opt.label}
                  </span>
                ) : null;
              })}
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setStep("interests")}
                className="px-6 py-3 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors"
              >
                Change Interests
              </button>
              <button
                onClick={handleFinish}
                className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 text-lg"
              >
                Start Learning!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

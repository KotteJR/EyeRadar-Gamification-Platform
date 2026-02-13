"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  Dog,
  Rocket,
  Trophy,
  Music,
  Palette,
  TreePine,
  ChefHat,
  Gamepad2,
  BookOpen,
  Bone,
  Shield,
  Waves,
  Bot,
  Car,
  Sparkles,
  Heart,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Hand,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface InterestOption {
  id: string;
  icon: LucideIcon;
  label: string;
  image: string;
  gradient: [string, string]; // from, to
  accent: string;
}

const INTEREST_OPTIONS: InterestOption[] = [
  { id: "animals",      icon: Dog,      label: "Animals",           image: "/interests/animals.png",      gradient: ["#FFF7ED", "#FFEDD5"], accent: "#F97316" },
  { id: "space",         icon: Rocket,   label: "Space",             image: "/interests/space.png",        gradient: ["#EEF2FF", "#E0E7FF"], accent: "#6366F1" },
  { id: "sports",        icon: Trophy,   label: "Sports",            image: "/interests/sports.png",       gradient: ["#ECFDF5", "#D1FAE5"], accent: "#10B981" },
  { id: "music",         icon: Music,    label: "Music",             image: "/interests/music.png",        gradient: ["#FDF2F8", "#FCE7F3"], accent: "#EC4899" },
  { id: "art",           icon: Palette,  label: "Art & Drawing",     image: "/interests/art.png",          gradient: ["#FAF5FF", "#F3E8FF"], accent: "#8B5CF6" },
  { id: "nature",        icon: TreePine, label: "Nature",            image: "/interests/nature.png",       gradient: ["#ECFDF5", "#D1FAE5"], accent: "#059669" },
  { id: "cooking",       icon: ChefHat,  label: "Cooking",           image: "/interests/cooking.png",      gradient: ["#FEFCE8", "#FEF9C3"], accent: "#EAB308" },
  { id: "gaming",        icon: Gamepad2, label: "Video Games",       image: "/interests/gaming.png",       gradient: ["#EFF6FF", "#DBEAFE"], accent: "#3B82F6" },
  { id: "reading",       icon: BookOpen, label: "Books & Stories",   image: "/interests/reading.png",      gradient: ["#FFFBEB", "#FEF3C7"], accent: "#D97706" },
  { id: "dinosaurs",     icon: Bone,     label: "Dinosaurs",         image: "/interests/dinosaurs.png",    gradient: ["#F7FEE7", "#ECFCCB"], accent: "#84CC16" },
  { id: "superheroes",   icon: Shield,   label: "Superheroes",       image: "/interests/superheroes.png",  gradient: ["#FEF2F2", "#FEE2E2"], accent: "#EF4444" },
  { id: "ocean",         icon: Waves,    label: "Ocean & Sea Life",  image: "/interests/ocean.png",        gradient: ["#F0F9FF", "#E0F2FE"], accent: "#0EA5E9" },
  { id: "robots",        icon: Bot,      label: "Robots & Tech",     image: "/interests/robots.png",       gradient: ["#EEF2FF", "#E0E7FF"], accent: "#475093" },
  { id: "cars",          icon: Car,      label: "Cars & Racing",     image: "/interests/cars.png",         gradient: ["#FEF2F2", "#FEE2E2"], accent: "#DC2626" },
  { id: "magic",         icon: Sparkles, label: "Magic & Fantasy",   image: "/interests/magic.png",        gradient: ["#FAF5FF", "#F3E8FF"], accent: "#7C3AED" },
  { id: "dance",         icon: Heart,    label: "Dance",             image: "/interests/dance.png",        gradient: ["#FDF2F8", "#FCE7F3"], accent: "#DB2777" },
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
    <div className="student-ui min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                STEPS.indexOf(step) >= i ? "bg-neutral-900" : "bg-neutral-300"
              }`}
            />
          ))}
        </div>

        {/* Step: Welcome */}
        {step === "welcome" && (
          <div className="bg-cream rounded-2xl p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-6">
              <Hand size={32} className="text-neutral-600" />
            </div>
            <h1 className="text-2xl font-semibold text-neutral-900 mb-2 tracking-tight">
              Welcome, {user.displayName}!
            </h1>
            <p className="text-[15px] text-neutral-400 mb-8 max-w-md mx-auto">
              Let&apos;s set up your learning adventure. We&apos;ll ask you a few questions
              to make your games extra fun!
            </p>
            <button
              onClick={() => setStep("interests")}
              className="btn-primary px-8 py-3 text-[15px]"
            >
              Let&apos;s Go
            </button>
          </div>
        )}

        {/* Step: Interests */}
        {step === "interests" && (
          <div className="bg-cream rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-neutral-900 mb-1.5 text-center tracking-tight">
              What do you like?
            </h2>
            <p className="text-neutral-400 text-center mb-6 text-[13px]">
              Pick as many as you want! This helps us make your games more fun.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {INTEREST_OPTIONS.map((opt) => {
                const isSelected = selected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleInterest(opt.id)}
                    className={`relative overflow-hidden rounded-xl border aspect-[4/3] transition-all hover:shadow-md active:scale-[0.97] ${
                      isSelected
                        ? "shadow-md scale-[1.02] ring-2 ring-offset-1"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                    style={{
                      borderColor: isSelected ? opt.accent : undefined,
                      ["--tw-ring-color" as string]: isSelected ? opt.accent : undefined,
                    } as React.CSSProperties}
                  >
                    {/* Gradient fallback */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${opt.gradient[0]}, ${opt.gradient[1]})`,
                      }}
                    />
                    {/* Full image */}
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-300 hover:scale-105"
                      style={{ backgroundImage: `url(${opt.image})` }}
                    />
                    {/* Bottom gradient for text */}
                    <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/40 to-transparent" />

                    {/* Label at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2 z-[1]">
                      <span className="text-[12px] font-semibold text-white drop-shadow-sm leading-tight">
                        {opt.label}
                      </span>
                    </div>

                    {/* Selected check */}
                    {isSelected && (
                      <div
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-10"
                        style={{ backgroundColor: opt.accent }}
                      >
                        <Check size={14} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setStep("welcome")}
                className="btn-outline"
              >
                <ChevronLeft size={15} />
                Back
              </button>
              <button
                onClick={() => setStep("ready")}
                disabled={selected.length === 0}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next ({selected.length} selected)
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Ready */}
        {step === "ready" && (
          <div className="bg-cream rounded-2xl p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-6">
              <PartyPopper size={32} className="text-emerald-500" />
            </div>
            <h1 className="text-2xl font-semibold text-neutral-900 mb-2 tracking-tight">
              You&apos;re all set!
            </h1>
            <p className="text-[15px] text-neutral-400 mb-4 max-w-md mx-auto">
              We&apos;ll use your interests to create fun and personalized learning games just for you.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 mb-8">
              {selected.map((id) => {
                const opt = INTEREST_OPTIONS.find((o) => o.id === id);
                if (!opt) return null;
                const Icon = opt.icon;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium bg-neutral-100"
                    style={{ color: opt.accent }}
                  >
                    <Icon size={13} strokeWidth={2} />
                    {opt.label}
                  </span>
                );
              })}
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setStep("interests")}
                className="btn-outline"
              >
                Change Interests
              </button>
              <button
                onClick={handleFinish}
                className="btn-primary px-8 py-3 text-[15px]"
              >
                Start Learning
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

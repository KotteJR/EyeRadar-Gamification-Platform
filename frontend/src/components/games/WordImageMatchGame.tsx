"use client";

import { useState, useEffect, useCallback } from "react";
import { Volume2, Check, X, ImageIcon, Sparkles } from "lucide-react";
import { tts } from "@/lib/tts";
import { UISounds } from "@/lib/ui-sounds";
import { SubmitButton, type GameRendererProps } from "./shared";

type ImageOption = {
  id: string;
  url: string;
  label: string;
};

export default function WordImageMatchGame({
  item,
  lastResult,
  submitting,
  onSubmit,
}: GameRendererProps) {
  const extra = item.extra_data as {
    mode?: "word_to_image" | "image_to_word";
    target_word?: string;
    target_image?: string;
    image_options?: ImageOption[];
    word_options?: string[];
    lang?: string;
    auto_play?: boolean;
  };

  const mode = extra.mode || "word_to_image";
  const lang = extra.lang || "el-GR";
  const targetWord = extra.target_word || item.question;
  const imageOptions = extra.image_options || [];
  const wordOptions = extra.word_options || item.options || [];

  const [selected, setSelected] = useState<string | null>(null);
  const [playingTTS, setPlayingTTS] = useState(false);
  const [explodingCard, setExplodingCard] = useState<string | null>(null);
  const [shakeCard, setShakeCard] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setSelected(null);
    setExplodingCard(null);
    setShakeCard(null);
    setParticles([]);
  }, [item.index]);

  useEffect(() => {
    if (!lastResult) return;
    if (lastResult.is_correct) {
      const correctId = lastResult.correct_answer;
      setExplodingCard(correctId);
      setParticles(generateParticles());
      UISounds.correct?.();
    } else {
      setShakeCard(selected);
      UISounds.wrong?.();
      setTimeout(() => setShakeCard(null), 600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResult]);

  const playWord = useCallback(async (word: string) => {
    if (playingTTS) return;
    setPlayingTTS(true);
    try {
      await tts.speak(word, { lang, rate: 0.75 });
    } finally {
      setPlayingTTS(false);
    }
  }, [lang, playingTTS]);

  const handleSelect = (value: string) => {
    if (lastResult || submitting) return;
    UISounds.select();
    setSelected(value);
  };

  const showResult = lastResult !== null;

  // ─── Word → Image mode (1 row, 4 cols of images) ──────
  if (mode === "word_to_image") {
    return (
      <div className="game-card text-center relative overflow-hidden">
        <p className="text-sm text-gray-400 font-semibold mb-2">
          {item.question || "Find the picture that matches this word"}
        </p>

        {/* Target word with speaker */}
        <div className="inline-flex items-center gap-3 px-6 py-4 bg-[#475093]/[0.06] rounded-2xl mb-6">
          <span className="text-3xl font-bold text-[#303FAE]">{targetWord}</span>
          <button
            onClick={() => playWord(targetWord)}
            disabled={playingTTS || !!lastResult}
            className={`p-2 rounded-xl transition-all ${
              playingTTS
                ? "bg-[#FF5A39] text-white animate-pulse"
                : "bg-[#FF5A39]/10 text-[#FF5A39] hover:bg-[#FF5A39]/20"
            }`}
          >
            <Volume2 size={18} />
          </button>
        </div>

        {/* 1 row × 4 cols image grid */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {imageOptions.map((img) => {
            const isSelected = selected === img.id;
            const isCorrect = showResult && img.id === lastResult.correct_answer;
            const isWrong = showResult && isSelected && !lastResult.is_correct;
            const isExploding = explodingCard === img.id;
            const isShaking = shakeCard === img.id;

            let borderColor = "border-gray-200/60";
            let bg = "bg-white/5";
            if (isCorrect) { borderColor = "border-emerald-400"; bg = "bg-emerald-400/10"; }
            else if (isWrong) { borderColor = "border-red-400"; bg = "bg-red-400/10"; }
            else if (isSelected) { borderColor = "border-[#475093]"; bg = "bg-[#475093]/[0.06]"; }

            return (
              <button
                key={img.id}
                onClick={() => handleSelect(img.id)}
                disabled={submitting || showResult}
                className={`
                  relative rounded-2xl border-2 p-2 transition-all
                  ${borderColor} ${bg}
                  ${!showResult && !submitting ? "hover:border-[#475093]/40 hover:bg-[#475093]/[0.04] hover:scale-[1.03] active:scale-95 cursor-pointer" : ""}
                  ${isExploding ? "animate-card-explode" : ""}
                  ${isShaking ? "animate-shake" : ""}
                `}
              >
                {/* Image */}
                <div className="aspect-square rounded-xl overflow-hidden mb-1.5 bg-gray-50/50">
                  {img.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.url}
                      alt={img.label}
                      className="w-full h-full object-contain"
                      style={{ imageRendering: "auto" }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={28} className="text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Label */}
                <p className="text-xs font-bold text-gray-500 truncate">{img.label}</p>

                {/* Result badge */}
                {isCorrect && (
                  <div className="absolute -top-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 animate-pop-in">
                    <Check size={14} className="text-white" strokeWidth={3} />
                  </div>
                )}
                {isWrong && (
                  <div className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-200 animate-pop-in">
                    <X size={14} className="text-white" strokeWidth={3} />
                  </div>
                )}

                {/* Selection ring */}
                {isSelected && !showResult && (
                  <div className="absolute inset-0 rounded-2xl border-2 border-[#475093] pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>

        {/* Particle explosion overlay */}
        {particles.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {particles.map((p) => (
              <div
                key={p.id}
                className="absolute w-2.5 h-2.5 rounded-full animate-particle-burst"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  backgroundColor: p.color,
                  "--tx": `${p.tx}px`,
                  "--ty": `${p.ty}px`,
                  animationDelay: `${p.delay}ms`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        {/* Correct answer glow ring */}
        {showResult && lastResult.is_correct && (
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-emerald-400/20 animate-glow-ring" />
          </div>
        )}

        {!lastResult && (
          <SubmitButton
            onClick={() => onSubmit(selected || "")}
            disabled={submitting || !selected}
            submitting={submitting}
          />
        )}

        {/* Correct celebration text */}
        {showResult && lastResult.is_correct && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-emerald-600 animate-pop-in">
            <Sparkles size={16} />
            <span className="font-bold text-sm">Perfect match!</span>
            <Sparkles size={16} />
          </div>
        )}
      </div>
    );
  }

  // ─── Image → Word mode (1 row × 4 cols of words) ──────
  return (
    <div className="game-card text-center relative overflow-hidden">
      <p className="text-sm text-gray-400 font-semibold mb-2">
        {item.question || "What word matches this picture?"}
      </p>

      {/* Target image */}
      <div className="mx-auto mb-6 w-36 h-36 rounded-2xl overflow-hidden bg-gray-50/50 border-2 border-gray-200/60 shadow-sm">
        {extra.target_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={extra.target_image}
            alt="What is this?"
            className="w-full h-full object-contain"
            style={{ imageRendering: "auto" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={40} className="text-gray-300" />
          </div>
        )}
      </div>

      {/* 1 row × 4 cols word cards */}
      <div className="grid grid-cols-4 gap-2.5 mb-4">
        {wordOptions.map((word, idx) => {
          const isSelected = selected === word;
          const isCorrect = showResult && word === lastResult.correct_answer;
          const isWrong = showResult && isSelected && !lastResult.is_correct;
          const isExploding = explodingCard === word;
          const isShaking = shakeCard === word;

          let borderColor = "border-gray-200/60";
          let bg = "bg-white/5";
          if (isCorrect) { borderColor = "border-emerald-400"; bg = "bg-emerald-400/10"; }
          else if (isWrong) { borderColor = "border-red-400"; bg = "bg-red-400/10"; }
          else if (isSelected) { borderColor = "border-[#475093]"; bg = "bg-[#475093]/[0.06]"; }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(word)}
              disabled={submitting || showResult}
              className={`
                relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all
                ${borderColor} ${bg}
                ${!showResult && !submitting ? "hover:border-[#475093]/40 hover:bg-[#475093]/[0.04] hover:scale-[1.03] active:scale-95 cursor-pointer" : ""}
                ${isExploding ? "animate-card-explode" : ""}
                ${isShaking ? "animate-shake" : ""}
              `}
            >
              <span className="text-base font-bold text-gray-700">{word}</span>
              <button
                onClick={(e) => { e.stopPropagation(); playWord(word); }}
                disabled={playingTTS || !!lastResult}
                className="p-1 rounded-lg bg-gray-100/80 text-gray-400 hover:text-[#FF5A39] hover:bg-[#FF5A39]/10 transition-colors"
              >
                <Volume2 size={12} />
              </button>

              {isCorrect && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 animate-pop-in">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
              {isWrong && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-200 animate-pop-in">
                  <X size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Particle explosion overlay */}
      {particles.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute w-2.5 h-2.5 rounded-full animate-particle-burst"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                backgroundColor: p.color,
                "--tx": `${p.tx}px`,
                "--ty": `${p.ty}px`,
                animationDelay: `${p.delay}ms`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {!lastResult && (
        <SubmitButton
          onClick={() => onSubmit(selected || "")}
          disabled={submitting || !selected}
          submitting={submitting}
        />
      )}

      {showResult && lastResult.is_correct && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-emerald-600 animate-pop-in">
          <Sparkles size={16} />
          <span className="font-bold text-sm">Perfect match!</span>
          <Sparkles size={16} />
        </div>
      )}
    </div>
  );
}

// ─── Particle system ─────────────────────────────────────

type Particle = {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
  delay: number;
};

const PARTICLE_COLORS = [
  "#10b981", "#34d399", "#6ee7b7", "#fbbf24", "#f59e0b",
  "#ec4899", "#a78bfa", "#60a5fa", "#f87171", "#fb923c",
];

function generateParticles(): Particle[] {
  const count = 24;
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const distance = 80 + Math.random() * 120;
    return {
      id: i,
      x: 50,
      y: 50,
      tx: Math.cos(angle) * distance,
      ty: Math.sin(angle) * distance,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      delay: Math.random() * 150,
    };
  });
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Volume2, ThumbsUp, ThumbsDown } from "lucide-react";
import { tts } from "@/lib/tts";
import { UISounds } from "@/lib/ui-sounds";
import type { GameRendererProps } from "./shared";

/**
 * Phonological Awareness – Sound Matching
 *
 * extra_data shape:
 * {
 *   word1: string       — first word (e.g. "σπίτι")
 *   word2: string       — second word (e.g. "κουτί")
 *   lang?: string       — BCP-47 lang tag, defaults to "el-GR"
 *   auto_play?: boolean — auto-play audio on mount
 * }
 *
 * The child hears two words via TTS, then decides Yes/No
 * whether they rhyme (sound the same at the end).
 * Correct answer comes from item.correct_answer ("yes" | "no").
 */
export default function SoundMatchingGame({
  item,
  lastResult,
  submitting,
  onSubmit,
}: GameRendererProps) {
  const extra = item.extra_data as {
    word1: string;
    word2: string;
    lang?: string;
    auto_play?: boolean;
  };

  const word1 = extra.word1 || item.options?.[0] || "";
  const word2 = extra.word2 || item.options?.[1] || "";
  const lang = extra.lang || "el-GR";
  const isGreek = lang.startsWith("el");

  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<"yes" | "no" | null>(null);

  const playWords = useCallback(async () => {
    if (playing) return;
    setPlaying(true);
    try {
      await tts.speak(word1, { lang, rate: 0.75 });
      await new Promise((r) => setTimeout(r, 600));
      await tts.speak(word2, { lang, rate: 0.75 });
    } finally {
      setPlaying(false);
      setPlayed(true);
    }
  }, [word1, word2, lang, playing]);

  useEffect(() => {
    setSelectedAnswer(null);
    setPlayed(false);
    if (extra.auto_play !== false) {
      const timer = setTimeout(playWords, 400);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.index]);

  const handleAnswer = (answer: "yes" | "no") => {
    if (lastResult || submitting) return;
    UISounds.select();
    setSelectedAnswer(answer);
    onSubmit(answer);
  };

  const showResult = lastResult !== null;

  return (
    <div className="game-card text-center">
      <p className="text-lg font-bold text-gray-900 mb-2">
        {item.question || "Do these words sound the same at the end?"}
      </p>

      {/* Word display */}
      <div className="flex items-center justify-center gap-4 my-6">
        <div className="px-5 py-3 bg-[#475093]/[0.06] rounded-2xl">
          <p className="text-2xl font-bold text-[#303FAE]">{word1}</p>
        </div>
        <span className="text-gray-300 text-xl font-bold">&</span>
        <div className="px-5 py-3 bg-[#475093]/[0.06] rounded-2xl">
          <p className="text-2xl font-bold text-[#303FAE]">{word2}</p>
        </div>
      </div>

      {/* Play button */}
      <button
        onClick={playWords}
        disabled={playing || !!lastResult}
        className={`mx-auto mb-6 flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
          playing
            ? "bg-[#FF5A39] text-white animate-pulse"
            : "bg-[#FF5A39]/10 text-[#FF5A39] hover:bg-[#FF5A39]/20 active:scale-95"
        } disabled:opacity-40`}
      >
        <Volume2 size={18} className={playing ? "animate-bounce" : ""} />
        {playing
          ? isGreek ? "Παίζει..." : "Playing..."
          : played
          ? isGreek ? "Άκουσε ξανά" : "Listen Again"
          : isGreek ? "Άκουσε τις λέξεις" : "Listen to Words"}
      </button>

      {/* Yes / No buttons */}
      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
        {(["yes", "no"] as const).map((answer) => {
          const isSelected = selectedAnswer === answer;
          const isCorrect = showResult && answer === lastResult.correct_answer;
          const isWrong = showResult && isSelected && !lastResult.is_correct;

          let bg = "bg-gray-50 border-gray-100 hover:border-[#475093]/30";
          if (isCorrect)
            bg = "bg-emerald-50 border-emerald-400";
          else if (isWrong)
            bg = "bg-red-50 border-red-400 animate-shake";
          else if (isSelected)
            bg = "bg-[#475093]/[0.06] border-[#475093]";

          const Icon = answer === "yes" ? ThumbsUp : ThumbsDown;
          const label = answer === "yes"
            ? isGreek ? "Ναι, ομοιοκαταληκτούν!" : "Yes, they rhyme!"
            : isGreek ? "Όχι, διαφορετικές" : "No, different";

          return (
            <button
              key={answer}
              onClick={() => handleAnswer(answer)}
              disabled={submitting || showResult}
              className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 font-bold transition-all active:scale-95 ${bg}`}
            >
              <Icon
                size={28}
                className={
                  isCorrect
                    ? "text-emerald-500"
                    : isWrong
                    ? "text-red-500"
                    : isSelected
                    ? "text-[#303FAE]"
                    : "text-gray-400"
                }
              />
              <span className="text-sm text-gray-700">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

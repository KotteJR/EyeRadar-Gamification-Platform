"use client";

import { useState, useEffect, useCallback } from "react";
import { Volume2 } from "lucide-react";
import { tts } from "@/lib/tts";
import { UISounds } from "@/lib/ui-sounds";
import { SubmitButton, AnswerOption, HintSection, type GameRendererProps } from "./shared";

/**
 * Word-to-Sound Matching
 *
 * extra_data shape:
 * {
 *   target_word: string   — the word shown on top
 *   lang?: string         — BCP-47, defaults to "el-GR"
 *   auto_play?: boolean   — auto-play target word TTS on mount
 * }
 *
 * A word is shown above. The child picks which of 3 (or more) option words
 * sounds the same as the target. Each option has a speaker button to hear it.
 * item.options contains the candidate words; item.correct_answer is the match.
 */
export default function WordSoundMatchGame({
  item,
  lastResult,
  submitting,
  selectedAnswer,
  areaColor,
  onSelectAnswer,
  onSubmit,
}: GameRendererProps) {
  const extra = item.extra_data as {
    target_word?: string;
    lang?: string;
    auto_play?: boolean;
  };

  const targetWord = extra.target_word || item.question;
  const lang = extra.lang || "el-GR";

  const [playingTarget, setPlayingTarget] = useState(false);
  const [playingOption, setPlayingOption] = useState<number | null>(null);

  const playTarget = useCallback(async () => {
    if (playingTarget) return;
    setPlayingTarget(true);
    try {
      await tts.speak(targetWord, { lang, rate: 0.75 });
    } finally {
      setPlayingTarget(false);
    }
  }, [targetWord, lang, playingTarget]);

  const playOption = async (word: string, idx: number) => {
    if (playingOption !== null) return;
    setPlayingOption(idx);
    try {
      await tts.speak(word, { lang, rate: 0.75 });
    } finally {
      setPlayingOption(null);
    }
  };

  useEffect(() => {
    if (extra.auto_play !== false) {
      const timer = setTimeout(playTarget, 400);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.index]);

  const showResult = lastResult !== null;

  return (
    <div className="game-card">
      {/* Target word */}
      <div className="text-center mb-6">
        <p className="text-sm text-gray-400 font-semibold mb-2">
          {item.question || "Which word sounds the same?"}
        </p>
        <div className="inline-flex items-center gap-3 px-6 py-4 bg-[#475093]/[0.06] rounded-2xl">
          <span className="text-3xl font-bold text-[#303FAE]">{targetWord}</span>
          <button
            onClick={playTarget}
            disabled={playingTarget || !!lastResult}
            className={`p-2 rounded-xl transition-all ${
              playingTarget
                ? "bg-[#FF5A39] text-white animate-pulse"
                : "bg-[#FF5A39]/10 text-[#FF5A39] hover:bg-[#FF5A39]/20"
            }`}
          >
            <Volume2 size={20} />
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {item.options.map((option, idx) => {
          const isSelected = selectedAnswer === option;
          const isCorrectAnswer = showResult && option === lastResult.correct_answer;
          const isWrongSelection = showResult && isSelected && !lastResult.is_correct;

          return (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1">
                <AnswerOption
                  option={option}
                  index={idx}
                  isSelected={isSelected}
                  isCorrectAnswer={isCorrectAnswer}
                  isWrongSelection={isWrongSelection}
                  showResult={showResult}
                  disabled={submitting || showResult}
                  areaColor={areaColor}
                  onClick={() => {
                    if (!submitting && !showResult) onSelectAnswer(option);
                  }}
                />
              </div>
              <button
                onClick={() => playOption(option, idx)}
                disabled={playingOption !== null || !!lastResult}
                className={`flex-shrink-0 p-2.5 rounded-xl transition-all ${
                  playingOption === idx
                    ? "bg-[#FF5A39] text-white animate-pulse"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                <Volume2 size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <HintSection hint={item.hint} />

      {!lastResult && (
        <SubmitButton
          onClick={() => onSubmit()}
          disabled={submitting || !selectedAnswer}
          submitting={submitting}
        />
      )}
    </div>
  );
}

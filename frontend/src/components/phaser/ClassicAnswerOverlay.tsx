"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  eventBus,
  GameEvents,
  type PhaseChangePayload,
  type AnswerResultPayload,
} from "@/lib/phaser/EventBus";
import type { ExerciseItem, ExerciseItemResult } from "@/types";
import GameRenderer from "@/components/games/GameRenderer";

interface ClassicAnswerOverlayProps {
  item: ExerciseItem;
  lastResult: ExerciseItemResult | null;
  submitting: boolean;
  selectedAnswer: string;
  textInput: string;
  onSelectAnswer: (answer: string) => void;
  onTextInput: (text: string) => void;
  onSubmit: (answer?: string) => void;
}

export default function ClassicAnswerOverlay({
  item,
  lastResult,
  submitting,
  selectedAnswer,
  textInput,
  onSelectAnswer,
  onTextInput,
  onSubmit,
}: ClassicAnswerOverlayProps) {
  const [animating, setAnimating] = useState(false);
  const prevItemRef = useRef(item);

  useEffect(() => {
    if (prevItemRef.current !== item) {
      prevItemRef.current = item;
      setAnimating(false);
    }
  }, [item]);

  useEffect(() => {
    const unsub = eventBus.on(GameEvents.PHASE_CHANGE, (detail) => {
      const d = detail as PhaseChangePayload;
      if (d.phase === "correct" || d.phase === "incorrect") {
        setAnimating(true);
      } else if (d.phase === "ready") {
        setAnimating(false);
      }
    });
    return () => unsub();
  }, []);

  // Emit answer result to Phaser scene for battle animations
  useEffect(() => {
    if (!lastResult) return;
    const payload: AnswerResultPayload = {
      isCorrect: lastResult.is_correct,
      correctAnswer: lastResult.correct_answer,
      pointsEarned: lastResult.points_earned,
      studentAnswer: lastResult.student_answer,
    };
    eventBus.emit(GameEvents.ANSWER_RESULT, payload);
  }, [lastResult]);

  const showQuestion = !lastResult && !animating && !submitting;
  const showResult = !!lastResult;

  return (
    <div className="absolute inset-x-0 top-[56px] bottom-0 z-20 flex flex-col items-center pointer-events-none overflow-y-auto">
      {showQuestion && (
        <div className="pointer-events-auto w-full max-w-lg px-4 mt-2 animate-in fade-in slide-in-from-top-2 duration-200 adventure-overlay">
          <GameRenderer
            item={item}
            lastResult={lastResult}
            submitting={submitting}
            selectedAnswer={selectedAnswer}
            textInput={textInput}
            areaColor="#d4aa50"
            onSelectAnswer={onSelectAnswer}
            onTextInput={onTextInput}
            onSubmit={onSubmit}
          />
        </div>
      )}

      {showResult && lastResult && (
        <div className="pointer-events-auto animate-in zoom-in duration-150 mt-4">
          <div className={`px-8 py-4 rounded-2xl backdrop-blur-sm border-2 ${
            lastResult.is_correct
              ? "bg-emerald-900/70 border-emerald-400/60"
              : "bg-red-900/70 border-red-400/60"
          }`}>
            {lastResult.is_correct ? (
              <span className="text-lg font-bold text-emerald-200">
                Correct! +{lastResult.points_earned}
              </span>
            ) : (
              <div className="text-center">
                <p className="text-lg font-bold text-red-200">Wrong</p>
                <p className="text-sm text-red-300/80 mt-1">
                  Answer: {lastResult.correct_answer}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

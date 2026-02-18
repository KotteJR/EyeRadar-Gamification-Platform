"use client";

import { useState, useEffect, useCallback } from "react";
import { Crown, ChevronLeft, Shield } from "lucide-react";
import HUDOverlay from "./HUDOverlay";
import {
  eventBus,
  GameEvents,
  type CastlePhasePayload,
  type CastleQuestionPayload,
} from "@/lib/phaser/EventBus";
import { UISounds } from "@/lib/ui-sounds";
import { api } from "@/lib/api";
import type { ExerciseItem, ExerciseItemResult } from "@/types";

interface BlockState {
  stamina: number;
  maxStamina: number;
  onCooldown: boolean;
  cooldownRemaining: number;
  maxCooldown: number;
}

interface CastleBossOverlayProps {
  sessionId: string;
  items: ExerciseItem[];
  onExit: () => void;
  onSwitchMode: () => void;
  onVictory: () => void;
}

const BOSS_NAMES: Record<number, string> = {
  1: "Skeleton Knight",
  2: "Shadow Witch",
  3: "Stone Golem",
};

export default function CastleBossOverlay({
  sessionId,
  items,
  onExit,
  onSwitchMode,
  onVictory,
}: CastleBossOverlayProps) {
  const [phase, setPhase] = useState<CastlePhasePayload>({
    bossPhase: 1, bossHp: 6, maxBossHp: 6,
    playerHp: 5, maxPlayerHp: 5, gameState: "spawning",
  });

  const [blockState, setBlockState] = useState<BlockState>({
    stamina: 2000, maxStamina: 2000, onCooldown: false,
    cooldownRemaining: 0, maxCooldown: 3000,
  });

  const [showQuestion, setShowQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<ExerciseItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<ExerciseItemResult | null>(null);

  useEffect(() => {
    const u1 = eventBus.on(GameEvents.CASTLE_PHASE_UPDATE, (d) => setPhase(d as CastlePhasePayload));
    const u2 = eventBus.on("castle:block_state", (d) => setBlockState(d as BlockState));
    return () => { u1(); u2(); };
  }, []);

  useEffect(() => {
    const unsub = eventBus.on(GameEvents.CASTLE_QUESTION, (detail) => {
      const d = detail as CastleQuestionPayload;
      const qi = d.bossPhase - 1;
      if (qi < items.length) {
        setCurrentQuestion(items[qi]);
        setShowQuestion(true);
        setLastResult(null);
      }
    });
    return () => unsub();
  }, [items]);

  useEffect(() => {
    const unsub = eventBus.on(GameEvents.CASTLE_VICTORY, () => { onVictory(); });
    return () => unsub();
  }, [onVictory]);

  const handleAnswer = useCallback(async (answer: string) => {
    if (submitting || !currentQuestion) return;
    setSubmitting(true);
    UISounds.select();

    try {
      const isLocal = sessionId === "test-session";
      let isCorrect: boolean;
      let correctAns: string;

      if (isLocal) {
        isCorrect = answer === currentQuestion.correct_answer;
        correctAns = currentQuestion.correct_answer;
      } else {
        const result = await api.submitAnswer(sessionId, currentQuestion.index, answer, 3000);
        isCorrect = result.is_correct;
        correctAns = result.correct_answer;
      }

      const localResult: ExerciseItemResult = {
        is_correct: isCorrect, correct_answer: correctAns, student_answer: answer,
        points_earned: isCorrect ? 10 : 0, item_index: currentQuestion.index, response_time_ms: 3000,
      };
      setLastResult(localResult);
      if (isCorrect) UISounds.correct(); else UISounds.wrong();

      setTimeout(() => {
        setShowQuestion(false);
        setSubmitting(false);
        setLastResult(null);
        eventBus.emit(GameEvents.CASTLE_ANSWER, { correct: isCorrect });
      }, 1500);
    } catch {
      setSubmitting(false);
    }
  }, [submitting, currentQuestion, sessionId]);

  const bossName = BOSS_NAMES[phase.bossPhase] || "Boss";
  const shieldPct = blockState.onCooldown
    ? (1 - blockState.cooldownRemaining / blockState.maxCooldown) * 100
    : (blockState.stamina / blockState.maxStamina) * 100;
  const shieldColor = blockState.onCooldown ? "bg-gray-500" : "bg-blue-400";

  return (
    <>
      <HUDOverlay
        initialPoints={0}
        initialStreak={0}
        initialLives={phase.maxPlayerHp}
        bossName={`${bossName} (${phase.bossPhase}/3)`}
        maxBossHp={phase.maxBossHp}
        onExit={onExit}
        onSwitchMode={onSwitchMode}
      />

      <div className="absolute inset-0 z-20 pointer-events-none">
        {/* Shield bar — bottom-left */}
        {phase.gameState === "fighting" && (
          <div className="absolute bottom-12 left-3 flex items-center gap-1.5">
            <Shield size={14} className={`${blockState.onCooldown ? "text-gray-400" : "text-blue-400"}`} />
            <div className="w-16 h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full ${shieldColor} transition-all duration-100 rounded-full`}
                style={{ width: `${shieldPct}%` }}
              />
            </div>
            {blockState.onCooldown && (
              <span className="text-[9px] text-gray-400 font-bold">CD</span>
            )}
          </div>
        )}

        {/* Spawning */}
        {phase.gameState === "spawning" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/60 backdrop-blur-sm px-8 py-4 rounded-2xl animate-pulse">
              <p className="text-white text-lg font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                Boss {phase.bossPhase} Incoming...
              </p>
            </div>
          </div>
        )}

        {/* Controls hint */}
        {phase.gameState === "fighting" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <div className="bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full">
              <p className="text-white/50 text-[10px] font-bold">
                ← → Move &nbsp;|&nbsp; ↑ Jump &nbsp;|&nbsp; X Attack &nbsp;|&nbsp; Z Block &nbsp;|&nbsp; C Dash
              </p>
            </div>
          </div>
        )}

        {/* Question popup */}
        {showQuestion && currentQuestion && (
          <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1a1a2e] border-2 border-amber-500/50 rounded-3xl p-6 max-w-lg w-full mx-4 shadow-2xl" style={{ boxShadow: "0 0 40px rgba(200,150,0,0.15)" }}>
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-2 bg-amber-500/20 px-4 py-1.5 rounded-full border border-amber-500/30">
                  <Crown size={14} className="text-amber-400" />
                  <span className="text-amber-300 text-xs font-bold">
                    {lastResult ? (lastResult.is_correct ? "Correct!" : "Wrong Answer!") : `Defeat Boss ${phase.bossPhase}`}
                  </span>
                </div>
              </div>

              <p className="text-white text-center text-base font-bold mb-5 leading-relaxed" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                {currentQuestion.question}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {currentQuestion.options.map((option, idx) => {
                  const isC = lastResult && option === lastResult.correct_answer;
                  const isW = lastResult && option === lastResult.student_answer && !lastResult.is_correct;
                  let cls = "bg-white/10 border-white/20 text-white hover:bg-white/20";
                  if (isC) cls = "bg-emerald-500/30 border-emerald-400 text-emerald-300";
                  if (isW) cls = "bg-red-500/30 border-red-400 text-red-300";

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(option)}
                      disabled={submitting || !!lastResult}
                      className={`${cls} border-2 rounded-xl px-4 py-3 text-sm font-bold transition-all active:scale-95 disabled:opacity-60`}
                      style={{ fontFamily: "'Fredoka', sans-serif" }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {lastResult && (
                <div className={`mt-4 text-center text-sm font-bold ${lastResult.is_correct ? "text-emerald-400" : "text-red-400"}`}>
                  {lastResult.is_correct
                    ? phase.bossPhase >= 3 ? "Victory! All bosses defeated!" : "Boss vanquished! Next one approaches..."
                    : "The boss rises again, enraged! Defeat it once more!"}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Victory */}
        {phase.gameState === "victory" && (
          <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center">
              <Crown size={64} className="text-amber-400 mx-auto mb-4" />
              <h2 className="text-white text-3xl font-bold mb-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                Castle Conquered!
              </h2>
              <p className="text-white/60 text-sm mb-6">All three bosses have been defeated!</p>
              <button
                onClick={onExit}
                className="flex items-center gap-2 mx-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                <ChevronLeft size={16} />
                Return to Map
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

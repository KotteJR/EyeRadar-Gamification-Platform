"use client";

import { useState, useEffect, useCallback } from "react";
import { Crown, ChevronLeft, Skull, Users, Swords } from "lucide-react";
import HUDOverlay from "./HUDOverlay";
import GameOverOverlay from "./GameOverOverlay";
import {
  eventBus,
  GameEvents,
  type CastlePhasePayload,
} from "@/lib/phaser/EventBus";
import { UISounds } from "@/lib/ui-sounds";
import { api } from "@/lib/api";
import type { ExerciseItem, ExerciseItemResult } from "@/types";

interface DungeonOverlayProps {
  sessionId: string;
  items: ExerciseItem[];
  onExit: () => void;
  onVictory: () => void;
}

export default function DungeonOverlay({
  sessionId,
  items,
  onExit,
  onVictory,
}: DungeonOverlayProps) {
  const [phase, setPhase] = useState<CastlePhasePayload>({
    bossPhase: 1,
    bossHp: 10,
    maxBossHp: 10,
    playerHp: 5,
    maxPlayerHp: 5,
    gameState: "playing",
  });

  const [showQuestion, setShowQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<ExerciseItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<ExerciseItemResult | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [enemiesDefeated, setEnemiesDefeated] = useState(0);
  const [showGameOver, setShowGameOver] = useState(false);

  useEffect(() => {
    const u1 = eventBus.on(GameEvents.CASTLE_PHASE_UPDATE, (d) => {
      const payload = d as CastlePhasePayload;
      setPhase(payload);
    });
    return () => { u1(); };
  }, []);

  useEffect(() => {
    const unsub = eventBus.on("battle:gameover", () => {
      setShowGameOver(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = eventBus.on(GameEvents.CASTLE_QUESTION, () => {
      if (items.length === 0) {
        eventBus.emit(GameEvents.CASTLE_ANSWER, { correct: true });
        return;
      }
      const idx = questionIdx % items.length;
      setCurrentQuestion(items[idx]);
      setShowQuestion(true);
      setLastResult(null);
    });
    return () => unsub();
  }, [items, questionIdx]);

  useEffect(() => {
    const unsub = eventBus.on(GameEvents.CASTLE_VICTORY, () => {
      onVictory();
    });
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
        is_correct: isCorrect,
        correct_answer: correctAns,
        student_answer: answer,
        points_earned: isCorrect ? 10 : 0,
        item_index: currentQuestion.index,
        response_time_ms: 3000,
      };
      setLastResult(localResult);

      if (isCorrect) {
        UISounds.correct();
        setEnemiesDefeated((e) => e + 1);
      } else {
        UISounds.wrong();
      }

      setTimeout(() => {
        setShowQuestion(false);
        setSubmitting(false);
        setLastResult(null);
        setQuestionIdx((i) => i + 1);
        eventBus.emit(GameEvents.CASTLE_ANSWER, { correct: isCorrect });
      }, 1500);
    } catch {
      setSubmitting(false);
    }
  }, [submitting, currentQuestion, sessionId]);

  return (
    <>
      <HUDOverlay
        initialPoints={enemiesDefeated * 10}
        initialStreak={0}
        initialLives={phase.maxPlayerHp}
        bossName={`Dungeon Level ${phase.bossPhase}`}
        maxBossHp={phase.maxBossHp}
        onExit={onExit}
        onSwitchMode={onExit}
      />

      <div className="absolute inset-0 z-20 pointer-events-none">
        {/* Game info panel */}
        <div className="absolute top-20 right-3 bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 text-xs text-white/80 mb-2">
            <Swords size={14} className="text-red-400" />
            <span className="font-bold">Enemies: {enemiesDefeated}/5</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/60 mb-1">
            <Users size={12} className="text-green-400" />
            <span>NPCs give questions</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="text-red-400">🍎</span>
            <span>Apples restore HP</span>
          </div>
        </div>

        {/* Controls hint */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <div className="bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full">
            <p className="text-white/50 text-[10px] font-bold">
              WASD Move &nbsp;|&nbsp; X Attack (auto-aim) &nbsp;|&nbsp; C Dodge &nbsp;|&nbsp; E Talk to NPC
            </p>
          </div>
        </div>

        {/* Question popup */}
        {showQuestion && currentQuestion && (
          <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
              className="bg-[#1a1a2e] border-2 border-amber-500/50 rounded-3xl p-6 max-w-lg w-full mx-4 shadow-2xl"
              style={{ boxShadow: "0 0 40px rgba(200,150,0,0.15)" }}
            >
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-2 bg-amber-500/20 px-4 py-1.5 rounded-full border border-amber-500/30">
                  <Skull size={14} className="text-amber-400" />
                  <span className="text-amber-300 text-xs font-bold">
                    {lastResult
                      ? lastResult.is_correct
                        ? "Correct!"
                        : "Wrong Answer!"
                      : "Enemy Defeated!"}
                  </span>
                </div>
              </div>

              <p
                className="text-white text-center text-base font-bold mb-5 leading-relaxed"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                {currentQuestion.question}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {currentQuestion.options.map((option, idx) => {
                  const isC = lastResult && option === lastResult.correct_answer;
                  const isW =
                    lastResult &&
                    option === lastResult.student_answer &&
                    !lastResult.is_correct;
                  let cls =
                    "bg-white/10 border-white/20 text-white hover:bg-white/20";
                  if (isC)
                    cls =
                      "bg-emerald-500/30 border-emerald-400 text-emerald-300";
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
                <div
                  className={`mt-4 text-center text-sm font-bold ${
                    lastResult.is_correct ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {lastResult.is_correct
                    ? "Enemy vanquished! Continue exploring..."
                    : "The enemy rises again! Defeat it once more!"}
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
              <h2
                className="text-white text-3xl font-bold mb-2"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                Dungeon Cleared!
              </h2>
              <p className="text-white/60 text-sm mb-6">
                All enemies have been defeated!
              </p>
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

      {showGameOver && (
        <GameOverOverlay
          onRetry={() => window.location.reload()}
          onBackToWorld={onExit}
        />
      )}
    </>
  );
}

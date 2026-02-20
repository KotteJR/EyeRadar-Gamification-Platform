"use client";

import { useState, useEffect, useCallback } from "react";
import { Crown, ChevronLeft, Skull, Shield, Sparkles, Lock, Unlock, Trophy, Star, Swords } from "lucide-react";
import HUDOverlay from "./HUDOverlay";
import GameOverOverlay from "./GameOverOverlay";
import {
  eventBus,
  GameEvents,
  type CastlePhasePayload,
  type CastleQuestionPayload,
} from "@/lib/phaser/EventBus";
import { UISounds } from "@/lib/ui-sounds";
import { api } from "@/lib/api";
import type { ExerciseItem, ExerciseItemResult } from "@/types";

interface Dungeon3StageOverlayProps {
  sessionId: string;
  items: ExerciseItem[];
  onExit: () => void;
  onVictory: () => void;
}

export default function Dungeon3StageOverlay({
  sessionId,
  items,
  onExit,
  onVictory,
}: Dungeon3StageOverlayProps) {
  const [phase, setPhase] = useState<CastlePhasePayload>({
    bossPhase: 1,
    bossHp: 15,
    maxBossHp: 15,
    playerHp: 5,
    maxPlayerHp: 5,
    gameState: "playing",
    currentZone: 1,
    totalZones: 3,
    zoneProgress: [],
  });

  const [showQuestion, setShowQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<ExerciseItem | null>(null);
  const [questionSource, setQuestionSource] = useState<string>("enemy");
  const [zoneName, setZoneName] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<ExerciseItemResult | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [enemiesDefeated, setEnemiesDefeated] = useState(0);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gateNotification, setGateNotification] = useState<string | null>(null);

  useEffect(() => {
    const u1 = eventBus.on(GameEvents.CASTLE_PHASE_UPDATE, (d) => {
      setPhase(d as CastlePhasePayload);
    });
    return () => { u1(); };
  }, []);

  useEffect(() => {
    const unsub = eventBus.on("battle:gameover", () => setShowGameOver(true));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = eventBus.on(GameEvents.GATE_OPENED, (d) => {
      const data = d as { zoneId: number };
      const names = ["", "The Courtyard", "The Dark Halls", "The Shadow Throne"];
      setGateNotification(`Gate to ${names[data.zoneId + 1] || "next zone"} opened!`);
      UISounds.correct();
      setTimeout(() => setGateNotification(null), 3000);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = eventBus.on(GameEvents.CASTLE_QUESTION, (d) => {
      const payload = d as CastleQuestionPayload;
      setQuestionSource(payload.source ?? "enemy");
      setZoneName(payload.zoneName ?? "");

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

  const [showVictory, setShowVictory] = useState(false);

  useEffect(() => {
    const unsub = eventBus.on(GameEvents.CASTLE_VICTORY, () => {
      setShowVictory(true);
    });
    return () => unsub();
  }, []);

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
        if (questionSource === "enemy") setEnemiesDefeated((e) => e + 1);
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
  }, [submitting, currentQuestion, sessionId, questionSource]);

  const getQuestionTitle = () => {
    if (questionSource === "boss_shield") return "Break the Shield!";
    if (questionSource === "shrine") return `Shrine Challenge${zoneName ? ` — ${zoneName}` : ""}`;
    return "Enemy Defeated!";
  };

  const getQuestionIcon = () => {
    if (questionSource === "boss_shield") return <Shield size={14} className="text-blue-400" />;
    if (questionSource === "shrine") return <Sparkles size={14} className="text-purple-400" />;
    return <Skull size={14} className="text-amber-400" />;
  };

  const getResultText = (correct: boolean) => {
    if (questionSource === "boss_shield") {
      return correct ? "Shield shattered! Attack now!" : "The shield holds strong...";
    }
    if (questionSource === "shrine") {
      return correct ? "The shrine glows brighter!" : "The shrine dims... Try again later.";
    }
    return correct ? "Enemy vanquished! Continue exploring..." : "The enemy rises again!";
  };

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
        {/* Zone progress panel */}
        <div className="absolute top-20 right-3 bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-white/10 min-w-[160px]">
          <div className="text-xs text-amber-400 font-bold mb-2">
            Zone {phase.currentZone ?? 1} / {phase.totalZones ?? 3}
          </div>
          {(phase.zoneProgress ?? []).map((zp) => (
            <div key={zp.zone} className={`flex items-center gap-2 text-[10px] mb-1 ${(phase.currentZone ?? 1) === zp.zone ? "text-white" : "text-white/40"}`}>
              {zp.gateOpen ? (
                <Unlock size={10} className="text-green-400" />
              ) : (
                <Lock size={10} className="text-red-400" />
              )}
              <span className="flex-1 truncate">{zp.name}</span>
              <span className="text-white/60">
                {zp.enemiesLeft > 0 ? `${zp.enemiesLeft} left` : zp.shrineComplete ? "Done" : "Shrine"}
              </span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-white/50">
            Enemies: {enemiesDefeated}/{phase.zoneProgress?.reduce((sum, zp) => sum + zp.enemiesLeft, 0) ?? 0 + enemiesDefeated}
          </div>
        </div>

        {/* Gate notification */}
        {gateNotification && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="bg-gradient-to-r from-amber-900/90 to-amber-800/90 border-2 border-amber-400/60 rounded-xl px-6 py-3 shadow-lg animate-bounce">
              <div className="flex items-center gap-2">
                <Unlock size={18} className="text-amber-300" />
                <span className="text-amber-200 font-bold text-sm" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  {gateNotification}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Controls hint */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <div className="bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full">
            <p className="text-white/50 text-[10px] font-bold">
              WASD Move | X Attack | C Dodge | E Interact (NPC/Shrine)
            </p>
          </div>
        </div>

        {/* Question popup */}
        {showQuestion && currentQuestion && (
          <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
              className={`border-2 rounded-3xl p-6 max-w-lg w-full mx-4 shadow-2xl ${
                questionSource === "boss_shield"
                  ? "bg-[#0a1a2e] border-blue-500/50"
                  : questionSource === "shrine"
                  ? "bg-[#1a0a2e] border-purple-500/50"
                  : "bg-[#1a1a2e] border-amber-500/50"
              }`}
              style={{ boxShadow: questionSource === "boss_shield"
                ? "0 0 40px rgba(100,150,255,0.15)"
                : questionSource === "shrine"
                ? "0 0 40px rgba(150,100,255,0.15)"
                : "0 0 40px rgba(200,150,0,0.15)"
              }}
            >
              <div className="flex justify-center mb-4">
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${
                  questionSource === "boss_shield"
                    ? "bg-blue-500/20 border-blue-500/30"
                    : questionSource === "shrine"
                    ? "bg-purple-500/20 border-purple-500/30"
                    : "bg-amber-500/20 border-amber-500/30"
                }`}>
                  {getQuestionIcon()}
                  <span className={`text-xs font-bold ${
                    questionSource === "boss_shield" ? "text-blue-300"
                    : questionSource === "shrine" ? "text-purple-300"
                    : "text-amber-300"
                  }`}>
                    {lastResult ? (lastResult.is_correct ? "Correct!" : "Wrong!") : getQuestionTitle()}
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
                  {getResultText(lastResult.is_correct)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Victory / Congratulations Screen */}
        {(phase.gameState === "victory" || showVictory) && (
          <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md">
            <div className="relative text-center max-w-md w-full mx-4">
              {/* Decorative glow */}
              <div className="absolute inset-0 -m-8 rounded-3xl bg-gradient-to-b from-amber-500/10 via-purple-500/5 to-transparent blur-2xl" />

              <div className="relative bg-gradient-to-b from-[#1a1030] to-[#0d0d1a] border-2 border-amber-500/40 rounded-3xl p-8 shadow-2xl"
                style={{ boxShadow: "0 0 60px rgba(200,150,0,0.15), 0 0 120px rgba(150,100,255,0.08)" }}>

                {/* Top stars */}
                <div className="flex justify-center gap-3 mb-3">
                  <Star size={24} className="text-amber-400 animate-pulse" fill="currentColor" />
                  <Star size={32} className="text-yellow-300 animate-pulse" fill="currentColor" style={{ animationDelay: "0.2s" }} />
                  <Star size={24} className="text-amber-400 animate-pulse" fill="currentColor" style={{ animationDelay: "0.4s" }} />
                </div>

                {/* Trophy icon */}
                <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/30 to-yellow-600/20 animate-ping" style={{ animationDuration: "2s" }} />
                  <div className="absolute inset-1 rounded-full bg-gradient-to-br from-amber-400/20 to-purple-500/10" />
                  <Trophy size={44} className="relative text-amber-400 drop-shadow-lg" />
                </div>

                {/* Title */}
                <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent"
                  style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  Congratulations!
                </h2>
                <h3 className="text-lg font-bold text-purple-300 mb-4"
                  style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  Dungeon Conquered!
                </h3>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <Swords size={18} className="text-red-400 mx-auto mb-1" />
                    <div className="text-white font-bold text-lg">{enemiesDefeated}</div>
                    <div className="text-white/40 text-[10px]">Enemies</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <Crown size={18} className="text-amber-400 mx-auto mb-1" />
                    <div className="text-white font-bold text-lg">3/3</div>
                    <div className="text-white/40 text-[10px]">Zones</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <Star size={18} className="text-yellow-400 mx-auto mb-1" />
                    <div className="text-white font-bold text-lg">{enemiesDefeated * 10}</div>
                    <div className="text-white/40 text-[10px]">Points</div>
                  </div>
                </div>

                <p className="text-purple-300/80 text-sm mb-6 italic">
                  The Shadow Lord has been vanquished and the dungeon is free!
                </p>

                {/* Buttons */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => { onVictory(); onExit(); }}
                    className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                    style={{ fontFamily: "'Fredoka', sans-serif" }}
                  >
                    <Trophy size={18} />
                    Complete & Return
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center justify-center gap-2 w-full px-6 py-2.5 bg-white/5 border border-white/10 text-white/60 font-bold rounded-xl hover:bg-white/10 hover:text-white/80 transition-all active:scale-95"
                    style={{ fontFamily: "'Fredoka', sans-serif" }}
                  >
                    <Swords size={16} />
                    Play Again
                  </button>
                </div>
              </div>
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

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { eventBus } from "@/lib/phaser/EventBus";
import { GAME_WIDTH, GAME_HEIGHT } from "@/lib/phaser/constants";
import type { ExerciseItem, ExerciseItemResult } from "@/types";
import type { WorldTheme } from "@/lib/level-config";
import { Heart, Coin } from "./Sprites";

// ─── Props (matches BossEncounter interface) ────────────────
interface DragonBattleProps {
  item: ExerciseItem;
  lastResult: ExerciseItemResult | null;
  submitting: boolean;
  selectedAnswer: string;
  onSelectAnswer: (answer: string) => void;
  onSubmit: (answer?: string) => void;
  progress: number;
  maxProgress: number;
  streak: number;
  points: number;
  worldTheme?: WorldTheme;
}

export default function DragonBattle({
  item,
  lastResult,
  submitting,
  onSelectAnswer,
  onSubmit,
  progress,
  maxProgress,
  streak,
  points,
  worldTheme = "mountain",
}: DragonBattleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [lives, setLives] = useState(6);
  const readyRef = useRef(false);
  const pendingQuestionRef = useRef<{
    question: string;
    options: string[];
    word?: string;
  } | null>(null);

  // Stable refs for callbacks that shouldn't trigger re-subscriptions
  const onSelectAnswerRef = useRef(onSelectAnswer);
  onSelectAnswerRef.current = onSelectAnswer;
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  // ─── Create Phaser game on mount ────────────────────────
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    let game: Phaser.Game | null = null;
    let mounted = true;

    async function initPhaser() {
      const PhaserModule = await import("phaser");
      const Phaser = PhaserModule.default ?? PhaserModule;
      const { DragonBattleScene } = await import(
        "@/lib/phaser/scenes/DragonBattleScene"
      );

      if (!mounted || !containerRef.current) return;

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        pixelArt: true,
        roundPixels: true,
        backgroundColor: "#111111",
        scale: {
          mode: Phaser.Scale.ENVELOP,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [DragonBattleScene],
      });

      gameRef.current = game;
    }

    initPhaser();

    return () => {
      mounted = false;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      readyRef.current = false;
      setReady(false);
    };
  }, []);

  // ─── Listen for scene ready ─────────────────────────────
  useEffect(() => {
    const unsub = eventBus.on("dragon:ready", () => {
      readyRef.current = true;
      setReady(true);

      // Send queued question if any
      if (pendingQuestionRef.current) {
        eventBus.emit("dragon:question", pendingQuestionRef.current);
        pendingQuestionRef.current = null;
      }
    });
    return unsub;
  }, []);

  // ─── Listen for answer clicks from Phaser ───────────────
  useEffect(() => {
    const unsub = eventBus.on("dragon:submit", (data) => {
      const { answer } = data as { answer: string };
      onSelectAnswerRef.current(answer);
      onSubmitRef.current(answer);
    });
    return unsub;
  }, []);

  // ─── Listen for lives updates from Phaser ───────────────
  useEffect(() => {
    const unsub = eventBus.on("dragon:lives", (data) => {
      const { lives: newLives } = data as { lives: number };
      setLives(newLives);
    });
    return unsub;
  }, []);

  // ─── Send question to Phaser when item changes ──────────
  useEffect(() => {
    const questionData = {
      question: item.question,
      options: item.options || [],
      word:
        typeof item.extra_data?.word === "string"
          ? item.extra_data.word
          : undefined,
    };

    if (readyRef.current) {
      eventBus.emit("dragon:question", questionData);
    } else {
      pendingQuestionRef.current = questionData;
    }
  }, [item]);

  // ─── Send result to Phaser when lastResult changes ──────
  useEffect(() => {
    if (!lastResult) return;
    eventBus.emit("dragon:result", {
      isCorrect: lastResult.is_correct,
      correctAnswer: lastResult.correct_answer,
      pointsEarned: lastResult.points_earned,
    });
  }, [lastResult]);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Phaser canvas container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ imageRendering: "pixelated" }}
      />

      {/* ─── HUD Overlay ─────────────────────────────────── */}
      {ready && (
        <>
          {/* Lives (top-left) */}
          <div className="absolute top-3 left-4 z-30 flex items-center gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Heart key={i} size={22} filled={i < lives} />
            ))}
          </div>

          {/* Points + Streak (top-right) */}
          <div className="absolute top-3 right-4 z-30 flex items-center gap-2">
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
              <Coin size={18} />
              <span className="text-white text-sm font-bold">{points}</span>
            </div>
            {streak >= 2 && (
              <div className="bg-orange-500/90 px-2 py-1 rounded-full animate-pulse">
                <span className="text-white text-xs font-bold">x{streak}</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="absolute top-11 left-4 right-4 z-30">
            <div className="h-2.5 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all duration-500"
                style={{
                  width: `${((progress + 1) / maxProgress) * 100}%`,
                }}
              />
            </div>
            <p className="text-white/50 text-[10px] font-bold mt-0.5 text-right">
              {progress + 1}/{maxProgress}
            </p>
          </div>

          {/* Game Over overlay */}
          {lives <= 0 && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="text-center animate-pop-in">
                <p
                  className="text-4xl font-bold text-red-400 mb-2"
                  style={{ fontFamily: "'Fredoka', sans-serif" }}
                >
                  No Lives Left!
                </p>
                <p className="text-white/70 text-sm">
                  Keep going — practice makes perfect!
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

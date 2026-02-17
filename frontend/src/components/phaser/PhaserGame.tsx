"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { ExerciseItem, ExerciseItemResult, DeficitArea } from "@/types";
import type { LevelStartPayload } from "@/lib/phaser/EventBus";
import { eventBus, GameEvents } from "@/lib/phaser/EventBus";
import { DEFICIT_AREA_THEME } from "@/lib/level-config";
import { GAME_MODE_BOSS, BOSSES } from "@/lib/boss-config";
import AnswerOverlay from "./AnswerOverlay";
import MemoryOverlay, { isMemoryItemType } from "./MemoryOverlay";
import HUDOverlay from "./HUDOverlay";
import PatternMemoryGame from "../memory/PatternMemoryGame";
import MemoryMatchGame from "../memory/MemoryMatchGame";
import { X, BookOpen } from "lucide-react";

const STANDALONE_MEMORY_TYPES = ["grid_memory", "pattern_match"];

// These types use React overlays even when the boss is "dragon" (stones can't handle them)
const OVERLAY_EVEN_IN_DRAGON = ["sequence_tap"];

const PhaserCanvas = dynamic(() => import("./PhaserCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-[#FF5A39] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60 text-sm font-semibold">
          Loading game engine...
        </p>
      </div>
    </div>
  ),
});

interface PhaserGameProps {
  item: ExerciseItem;
  lastResult: ExerciseItemResult | null;
  submitting: boolean;
  selectedAnswer: string;
  textInput: string;
  onSelectAnswer: (answer: string) => void;
  onTextInput: (text: string) => void;
  onSubmit: (answer?: string) => void;
  progress: number;
  maxProgress: number;
  streak: number;
  points: number;
  deficitArea?: DeficitArea;
  onExit: () => void;
  onSwitchMode: () => void;
  onGameComplete?: () => void;
}

export default function PhaserGame({
  item,
  lastResult,
  submitting,
  selectedAnswer,
  textInput,
  onSelectAnswer,
  onTextInput,
  onSubmit,
  progress,
  maxProgress,
  streak,
  points,
  deficitArea,
  onExit,
  onSwitchMode,
  onGameComplete,
}: PhaserGameProps) {
  const [gameReady, setGameReady] = useState(false);
  const [dragonReady, setDragonReady] = useState(false);

  const worldTheme = deficitArea
    ? DEFICIT_AREA_THEME[deficitArea]
    : "grassland";

  const bossType = GAME_MODE_BOSS[item.item_type] || "dark_sorcerer";
  const bossConfig = BOSSES[bossType];
  const isDragonBattle = bossType === "dragon";
  // Some dragon-boss types still need React overlays (e.g. sequence_tap)
  const useDragonStones = isDragonBattle && !OVERLAY_EVEN_IN_DRAGON.includes(item.item_type);

  // Stable refs for callbacks
  const onSelectAnswerRef = useRef(onSelectAnswer);
  onSelectAnswerRef.current = onSelectAnswer;
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const levelConfig: LevelStartPayload = useMemo(
    () => ({
      worldTheme,
      bossType,
      itemType: item.item_type,
      questionData: {
        question: item.question,
        options: item.options,
        itemType: item.item_type,
        hint: item.hint,
        extraData: item.extra_data,
      },
      progress,
      maxProgress,
      streak,
      points,
    }),
    // Only rebuild when theme/boss change, not on every question
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [worldTheme, bossType, maxProgress]
  );

  const handleReady = useCallback(() => {
    setGameReady(true);
  }, []);

  // Listen for LEVEL_COMPLETE from Phaser (boss killed)
  // Don't auto-complete the session — let the normal question flow handle it.
  // The kill animation is purely visual; session ends when all questions are answered.
  useEffect(() => {
    const unsub = eventBus.on(GameEvents.LEVEL_COMPLETE, () => {
      // Boss killed visually — just log, don't end session
    });
    return () => unsub();
  }, []);

  // ─── Dragon-specific: listen for scene ready ──────────
  useEffect(() => {
    if (!isDragonBattle) return;
    const unsub = eventBus.on("dragon:ready", () => {
      setDragonReady(true);
    });
    return () => { unsub(); setDragonReady(false); };
  }, [isDragonBattle]);

  // ─── Dragon-specific: listen for answer clicks from stones ──
  const recallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Skip the next lastResult-based dragon:result emission (used after local recall validation)
  const skipNextResultEmitRef = useRef(false);

  useEffect(() => {
    if (!useDragonStones) return;
    const unsub = eventBus.on("dragon:submit", (data) => {
      const { answer } = data as { answer: string };

      // Dual task: math phase — validate locally, then throw recall stone
      if (dualTaskPhaseRef.current === "math" && dualTaskDataRef.current) {
        const dt = dualTaskDataRef.current;
        const isCorrect = answer === dt.mathAnswer;

        // Send result directly to scene (not through backend)
        eventBus.emit("dragon:result", {
          isCorrect,
          correctAnswer: dt.mathAnswer,
          pointsEarned: isCorrect ? 5 : 0,
        });

        // After the result animation plays, throw the "What was the word?" stone
        if (recallTimerRef.current) clearTimeout(recallTimerRef.current);
        recallTimerRef.current = setTimeout(() => {
          if (dualTaskDataRef.current) {
            dualTaskPhaseRef.current = "recall";
            eventBus.emit("dragon:question", {
              question: "What was the word?",
              options: dualTaskDataRef.current.wordOptions,
              itemIndex: item.index,
            });
          }
        }, 2500);
        return;
      }

      // Dual task: recall phase — validate word locally, submit math answer to backend
      if (dualTaskPhaseRef.current === "recall" && dualTaskDataRef.current) {
        const dt = dualTaskDataRef.current;
        const isWordCorrect =
          answer.trim().toLowerCase() === dt.correctWord.trim().toLowerCase();

        // Show local visual feedback for the word recall
        skipNextResultEmitRef.current = true;
        eventBus.emit("dragon:result", {
          isCorrect: isWordCorrect,
          correctAnswer: dt.correctWord,
          pointsEarned: isWordCorrect ? 5 : 0,
        });

        // Submit to backend: math_answer if word correct (backend validates against math),
        // otherwise the wrong word so backend marks it wrong too
        const backendAnswer = isWordCorrect ? dt.mathAnswer : answer;

        dualTaskPhaseRef.current = null;
        dualTaskDataRef.current = null;

        onSelectAnswerRef.current(backendAnswer);
        onSubmitRef.current(backendAnswer);
        return;
      }

      // Non-dual-task or fallback: submit directly
      if (dualTaskPhaseRef.current === "recall") {
        dualTaskPhaseRef.current = null;
        dualTaskDataRef.current = null;
      }

      onSelectAnswerRef.current(answer);
      onSubmitRef.current(answer);
    });
    return () => {
      unsub();
      if (recallTimerRef.current) clearTimeout(recallTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDragonStones, item.index]);

  // ─── Dragon-specific: send question when item changes ──
  const pendingRef = useRef<{ question: string; options: string[]; word?: string; displayWord?: string; itemIndex: number } | null>(null);
  const lastSentIndexRef = useRef<number>(-1);
  // For dual_task: track whether we're in the "recall" phase
  const dualTaskPhaseRef = useRef<"math" | "recall" | null>(null);
  const dualTaskDataRef = useRef<{ word: string; wordOptions: string[]; correctWord: string; mathAnswer: string } | null>(null);

  // Clear recall timer when item changes
  useEffect(() => {
    return () => {
      if (recallTimerRef.current) {
        clearTimeout(recallTimerRef.current);
        recallTimerRef.current = null;
      }
    };
  }, [item.index]);

  useEffect(() => {
    if (!useDragonStones) return;
    if (lastSentIndexRef.current === item.index) return;

    const ed = item.extra_data || {};

    // Handle dual_task: this single item has both math + word recall
    if (item.item_type === "dual_task" && typeof ed.remember_word === "string") {
      dualTaskPhaseRef.current = "math";
      dualTaskDataRef.current = {
        word: ed.remember_word as string,
        wordOptions: (ed.word_options as string[]) || [],
        correctWord: (ed.correct_word as string) || "",
        mathAnswer: (ed.math_answer as string) || "",
      };

      const questionData = {
        question: `Solve: ${(ed.math_problem as string) || item.question}`,
        options: item.options || [],
        word: ed.remember_word as string,
        itemIndex: item.index,
      };

      // Always mark as sent to prevent duplicate emission when dragonReady changes
      lastSentIndexRef.current = item.index;

      if (dragonReady) {
        eventBus.emit("dragon:question", questionData);
      } else {
        pendingRef.current = questionData;
      }
      return;
    }

    // Regular question (non-dual-task)
    dualTaskPhaseRef.current = null;
    dualTaskDataRef.current = null;

    const word =
      typeof ed.word === "string" ? ed.word
      : typeof ed.remember_word === "string" ? ed.remember_word
      : undefined;

    const displayWord =
      typeof ed.original_word === "string" ? ed.original_word
      : typeof ed.start_word === "string" ? ed.start_word
      : typeof ed.partial_display === "string" ? ed.partial_display
      : typeof ed.display_item === "string" ? ed.display_item
      : typeof ed.target_word === "string" ? ed.target_word
      : undefined;

    const questionData = {
      question: item.question,
      options: item.options || [],
      word,
      displayWord,
      itemIndex: item.index,
    };

    // Always mark as sent to prevent duplicate emission when dragonReady changes
    lastSentIndexRef.current = item.index;

    if (dragonReady) {
      eventBus.emit("dragon:question", questionData);
    } else {
      pendingRef.current = questionData;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.index, useDragonStones, dragonReady]);

  // Send pending question when dragon becomes ready
  useEffect(() => {
    if (dragonReady && pendingRef.current) {
      lastSentIndexRef.current = item.index;
      eventBus.emit("dragon:question", pendingRef.current);
      pendingRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragonReady]);

  // ─── Dragon-specific: send result when lastResult changes ──
  // Skip if math phase (handled locally) or if we already emitted for recall phase
  useEffect(() => {
    if (!useDragonStones || !lastResult) return;
    if (dualTaskPhaseRef.current === "math") return;
    if (skipNextResultEmitRef.current) {
      skipNextResultEmitRef.current = false;
      return;
    }
    eventBus.emit("dragon:result", {
      isCorrect: lastResult.is_correct,
      correctAnswer: lastResult.correct_answer,
      pointsEarned: lastResult.points_earned,
    });
  }, [useDragonStones, lastResult]);

  // (Recall stone for dual_task is triggered directly in the dragon:submit handler above)

  // ─── Standalone memory games (no Phaser canvas, no characters) ──
  if (STANDALONE_MEMORY_TYPES.includes(item.item_type)) {
    if (item.item_type === "pattern_match") {
      return (
        <MemoryMatchGame
          item={item}
          lastResult={lastResult}
          submitting={submitting}
          onSubmit={onSubmit}
          progress={progress}
          maxProgress={maxProgress}
          points={points}
          onExit={onExit}
          onSwitchMode={onSwitchMode}
        />
      );
    }
    return (
      <PatternMemoryGame
        item={item}
        lastResult={lastResult}
        submitting={submitting}
        onSubmit={onSubmit}
        progress={progress}
        maxProgress={maxProgress}
        points={points}
        onExit={onExit}
        onSwitchMode={onSwitchMode}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Phaser canvas */}
      <div className="w-full h-full">
        <PhaserCanvas levelConfig={levelConfig} onReady={handleReady} />
      </div>

      {/* React overlays */}
      {gameReady && (
        <>
          <HUDOverlay
            initialPoints={points}
            initialStreak={streak}
            initialLives={isDragonBattle ? 6 : 3}
            progress={progress}
            maxProgress={maxProgress}
            bossName={bossConfig.name}
          />

          {/* For dragon boss with stones: no React overlay needed. Otherwise show overlay. */}
          {!useDragonStones && (
            isMemoryItemType(item.item_type) ? (
              <MemoryOverlay
                item={item}
                lastResult={lastResult}
                submitting={submitting}
                onSubmit={onSubmit}
                onSelectAnswer={onSelectAnswer}
              />
            ) : (
              <AnswerOverlay
                item={item}
                lastResult={lastResult}
                submitting={submitting}
                onSubmit={onSubmit}
                onSelectAnswer={onSelectAnswer}
              />
            )
          )}
        </>
      )}

      {/* Top controls — ornate PixelLab-styled buttons */}
      <div className="fixed top-3 left-3 z-[200] flex gap-1.5">
        <button
          onClick={onExit}
          className="hud-ctrl-btn hud-ctrl-exit pointer-events-auto"
        >
          <img
            src="/game-assets/ui/stone-button.png"
            alt=""
            className="absolute inset-0 w-full h-full pixelated pointer-events-none rounded"
            style={{ opacity: 0.4, objectFit: "fill" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <X size={11} strokeWidth={3} className="relative z-[1]" />
          <span className="relative z-[1]">Exit</span>
        </button>
        <button
          onClick={onSwitchMode}
          className="hud-ctrl-btn hud-ctrl-mode pointer-events-auto"
          title="Switch to classic mode"
        >
          <img
            src="/game-assets/ui/stone-button.png"
            alt=""
            className="absolute inset-0 w-full h-full pixelated pointer-events-none rounded"
            style={{ opacity: 0.3, objectFit: "fill" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <BookOpen size={11} strokeWidth={2.5} className="relative z-[1]" />
          <span className="relative z-[1]">Classic</span>
        </button>
      </div>
    </div>
  );
}

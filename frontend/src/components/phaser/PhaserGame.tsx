"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import type { ExerciseItem, ExerciseItemResult, DeficitArea } from "@/types";
import type { LevelStartPayload } from "@/lib/phaser/EventBus";
import { eventBus, GameEvents } from "@/lib/phaser/EventBus";
import { DEFICIT_AREA_THEME } from "@/lib/level-config";
import { GAME_MODE_BOSS, BOSSES } from "@/lib/boss-config";
import AnswerOverlay from "./AnswerOverlay";
import MemoryOverlay, { isMemoryItemType } from "./MemoryOverlay";
import HUDOverlay from "./HUDOverlay";
import { X, BookOpen } from "lucide-react";

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

  const worldTheme = deficitArea
    ? DEFICIT_AREA_THEME[deficitArea]
    : "grassland";

  const bossType = GAME_MODE_BOSS[item.item_type] || "dark_sorcerer";
  const bossConfig = BOSSES[bossType];

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
  useEffect(() => {
    const unsub = eventBus.on(GameEvents.LEVEL_COMPLETE, () => {
      if (onGameComplete) onGameComplete();
    });
    return () => unsub();
  }, [onGameComplete]);

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
            initialLives={3}
            progress={progress}
            maxProgress={maxProgress}
            bossName={bossConfig.name}
          />

          {isMemoryItemType(item.item_type) ? (
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

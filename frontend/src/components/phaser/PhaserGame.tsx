"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { ExerciseItem, ExerciseItemResult, DeficitArea } from "@/types";
import type { LevelStartPayload } from "@/lib/phaser/EventBus";
import { eventBus, GameEvents } from "@/lib/phaser/EventBus";
import { DEFICIT_AREA_THEME } from "@/lib/level-config";
import { GAME_MODE_BOSS, BOSSES } from "@/lib/boss-config";
import ClassicAnswerOverlay from "./ClassicAnswerOverlay";
import MemoryOverlay, { isMemoryItemType } from "./MemoryOverlay";
import HUDOverlay from "./HUDOverlay";
import GameOverOverlay from "./GameOverOverlay";
import PatternMemoryGame from "../memory/PatternMemoryGame";
import MemoryMatchGame from "../memory/MemoryMatchGame";

const STANDALONE_MEMORY_TYPES = ["grid_memory", "pattern_match"];

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
  maxProgress: number;
  streak: number;
  points: number;
  deficitArea?: DeficitArea;
  onExit: () => void;
  onSwitchMode: () => void;
  onBossKilled?: () => void;
  onGameOver?: () => void;
  onBackToWorld?: () => void;
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
  maxProgress,
  streak,
  points,
  deficitArea,
  onExit,
  onSwitchMode,
  onBossKilled,
  onGameOver,
  onBackToWorld,
}: PhaserGameProps) {
  const [gameReady, setGameReady] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);

  const worldTheme = deficitArea
    ? DEFICIT_AREA_THEME[deficitArea]
    : "grassland";

  const bossType = GAME_MODE_BOSS[item.item_type] || "dark_sorcerer";
  const bossConfig = BOSSES[bossType];
  const isDragonBattle = bossType === "dragon";

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
      progress: 0,
      maxProgress,
      streak,
      points,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [worldTheme, bossType, maxProgress]
  );

  const handleReady = useCallback(() => {
    setGameReady(true);
  }, []);

  // Listen for LEVEL_COMPLETE from Phaser (boss HP = 0, kill animation done)
  useEffect(() => {
    const unsub = eventBus.on(GameEvents.LEVEL_COMPLETE, () => {
      if (onBossKilled) onBossKilled();
    });
    return () => unsub();
  }, [onBossKilled]);

  // Listen for game over (0 hearts) — show game over overlay
  useEffect(() => {
    const unsub = eventBus.on("battle:gameover", () => {
      setShowGameOver(true);
    });
    return () => unsub();
  }, []);

  // Standalone memory games (no Phaser canvas, no characters)
  if (STANDALONE_MEMORY_TYPES.includes(item.item_type)) {
    if (item.item_type === "pattern_match") {
      return (
        <MemoryMatchGame
          item={item}
          lastResult={lastResult}
          submitting={submitting}
          onSubmit={onSubmit}
          progress={0}
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
        progress={0}
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

      {/* React overlays — hide everything when game over */}
      {gameReady && !showGameOver && (
        <>
          <HUDOverlay
            initialPoints={points}
            initialStreak={streak}
            initialLives={3}
            bossName={bossConfig.name}
            maxBossHp={maxProgress}
            onExit={onExit}
            onSwitchMode={onSwitchMode}
          />

          {/* Classic answer overlay for all non-memory types */}
          {isMemoryItemType(item.item_type) ? (
            <MemoryOverlay
              item={item}
              lastResult={lastResult}
              submitting={submitting}
              onSubmit={onSubmit}
              onSelectAnswer={onSelectAnswer}
            />
          ) : (
            <ClassicAnswerOverlay
              item={item}
              lastResult={lastResult}
              submitting={submitting}
              selectedAnswer={selectedAnswer}
              textInput={textInput}
              onSelectAnswer={onSelectAnswer}
              onTextInput={onTextInput}
              onSubmit={onSubmit}
            />
          )}
        </>
      )}

      {/* Game Over overlay */}
      {showGameOver && (
        <GameOverOverlay
          onRetry={() => {
            setShowGameOver(false);
            if (onGameOver) onGameOver();
          }}
          onBackToWorld={() => {
            if (onBackToWorld) onBackToWorld();
            else onExit();
          }}
        />
      )}
    </div>
  );
}

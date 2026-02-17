"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ExerciseItem, ExerciseItemResult } from "@/types";
import { X, BookOpen } from "lucide-react";

interface PatternMemoryGameProps {
  item: ExerciseItem;
  lastResult: ExerciseItemResult | null;
  submitting: boolean;
  onSubmit: (answer?: string) => void;
  progress: number;
  maxProgress: number;
  points: number;
  onExit: () => void;
  onSwitchMode: () => void;
}

type Phase = "show" | "play" | "result";

const TILE_ASSETS = {
  inactive: "/game-assets/memory/tiles/tile-inactive.png",
  active: "/game-assets/memory/tiles/tile-active.png",
  selected: "/game-assets/memory/tiles/tile-selected.png",
  correct: "/game-assets/memory/tiles/tile-correct.png",
  wrong: "/game-assets/memory/tiles/tile-wrong.png",
};

export default function PatternMemoryGame({
  item,
  lastResult,
  submitting,
  onSubmit,
  progress,
  maxProgress,
  points,
  onExit,
  onSwitchMode,
}: PatternMemoryGameProps) {
  const gridSize = (item.extra_data?.grid_size as number) || 3;
  const pattern = (item.extra_data?.pattern as number[]) || [];
  const showDuration = ((item.extra_data?.show_duration_seconds as number) || 3) * 1000;

  const [phase, setPhase] = useState<Phase>("show");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tilesVisible, setTilesVisible] = useState(false);
  const [score, setScore] = useState(points);

  // Reset on new item — simple 3-phase flow:
  // 1. Show pattern tiles for 0.5s
  // 2. Blank wait for 2s ("remember!")
  // 3. Recall phase
  useEffect(() => {
    setPhase("show");
    setSelected(new Set());
    setTilesVisible(false);

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: Show pattern tiles immediately for 500ms
    timeouts.push(setTimeout(() => setTilesVisible(true), 100));
    timeouts.push(setTimeout(() => setTilesVisible(false), 600));

    // Phase 2: 2-second blank wait, then switch to play
    timeouts.push(setTimeout(() => setPhase("play"), 2600));

    return () => timeouts.forEach((t) => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.index]);

  useEffect(() => {
    if (lastResult) {
      setPhase("result");
      if (lastResult.is_correct) {
        setScore((s) => s + lastResult.points_earned);
      }
    }
  }, [lastResult]);

  const toggleCell = useCallback(
    (idx: number) => {
      if (phase !== "play" || submitting || lastResult) return;
      setSelected((prev) => {
        const next = new Set(prev);
        next.has(idx) ? next.delete(idx) : next.add(idx);
        return next;
      });
    },
    [phase, submitting, lastResult]
  );

  const handleSubmit = useCallback(() => {
    const answer = Array.from(selected)
      .sort((a, b) => a - b)
      .join(",");
    onSubmit(answer);
  }, [selected, onSubmit]);

  const totalCells = gridSize * gridSize;

  const getTileState = (idx: number) => {
    const isPattern = pattern.includes(idx);
    const isSel = selected.has(idx);

    if (phase === "show") {
      // Show pattern tiles when visible, otherwise all blank
      if (tilesVisible && isPattern) return "active";
      return "inactive";
    }
    if (phase === "result") {
      if (isPattern && isSel) return "correct";
      if (isPattern && !isSel) return "wrong"; // missed
      if (!isPattern && isSel) return "wrong"; // extra
      return "inactive";
    }
    // Play phase
    if (isSel) return "selected";
    return "inactive";
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col">
      {/* Background — grass meadow */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/game-assets/memory/backgrounds/grass-meadow.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          imageRendering: "pixelated",
        }}
      />
      {/* Dark vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400/20 via-transparent to-black/40" />

      {/* Top HUD */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <div className="flex gap-1.5">
          <button onClick={onExit} className="hud-ctrl-btn hud-ctrl-exit pointer-events-auto">
            <X size={11} strokeWidth={3} className="relative z-[1]" />
            <span className="relative z-[1]">Exit</span>
          </button>
          <button onClick={onSwitchMode} className="hud-ctrl-btn hud-ctrl-mode pointer-events-auto" title="Switch to classic mode">
            <BookOpen size={11} strokeWidth={2.5} className="relative z-[1]" />
            <span className="relative z-[1]">Classic</span>
          </button>
        </div>
        <div className="flex items-center gap-4 text-white font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>
          <span className="text-amber-300 text-shadow-sm">{score} pts</span>
          <span className="text-white/70 text-sm">{progress}/{maxProgress}</span>
        </div>
      </div>

      {/* Main game area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        {/* Phase indicator */}
        <div className="mb-6 text-center">
          <h2
            className="text-2xl font-bold text-white drop-shadow-lg"
            style={{ fontFamily: "'Fredoka', sans-serif", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
          >
            {phase === "show"
              ? tilesVisible
                ? "Remember this pattern!"
                : "Get ready..."
              : phase === "play"
              ? "Now tap to recreate it!"
              : lastResult?.is_correct
              ? "Correct!"
              : "Not quite..."}
          </h2>
        </div>

        {/* Tile grid on wooden table surface */}
        <div className="relative p-5 sm:p-6 rounded-xl" style={{
          background: "linear-gradient(180deg, #5a3e28 0%, #4a3220 50%, #3d2a1a 100%)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.3)",
          border: "3px solid #6b4c30",
          filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.4))",
        }}>
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            maxWidth: gridSize * 100,
          }}
        >
          {Array.from({ length: totalCells }, (_, idx) => {
            const state = getTileState(idx);
            return (
              <button
                key={idx}
                onClick={() => toggleCell(idx)}
                disabled={phase !== "play" || !!lastResult || submitting}
                className={`
                  memory-tile memory-tile-${state}
                  w-20 h-20 sm:w-24 sm:h-24
                  transition-all duration-200
                  ${phase === "play" && !lastResult ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-default"}
                `}
                style={{ imageRendering: "pixelated" }}
              >
                {/* Tile sprite background */}
                <img
                  src={TILE_ASSETS[state] || TILE_ASSETS.inactive}
                  alt=""
                  className="absolute inset-0 w-full h-full pixelated pointer-events-none"
                  style={{ imageRendering: "pixelated" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </button>
            );
          })}
        </div>
        </div>

        {/* Submit button */}
        {phase === "play" && !lastResult && selected.size > 0 && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-6 px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-lg transition-all hover:scale-105 active:scale-95 shadow-lg"
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            {submitting ? "Checking..." : `Submit (${selected.size} selected)`}
          </button>
        )}

        {/* Result feedback */}
        {phase === "result" && lastResult && (
          <div
            className={`mt-6 px-6 py-3 rounded-lg font-bold text-lg ${
              lastResult.is_correct
                ? "bg-emerald-500/80 text-white"
                : "bg-red-500/80 text-white"
            }`}
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            {lastResult.is_correct
              ? `+${lastResult.points_earned} points!`
              : `Answer: ${lastResult.correct_answer}`}
          </div>
        )}
      </div>
    </div>
  );
}

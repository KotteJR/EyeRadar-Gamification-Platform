"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ExerciseItem, ExerciseItemResult } from "@/types";
import { X, BookOpen } from "lucide-react";
import { UISounds } from "@/lib/ui-sounds";
import MuteButton from "@/components/MuteButton";

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

  const [phase, setPhase] = useState<Phase>("show");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tilesVisible, setTilesVisible] = useState(false);
  const [score, setScore] = useState(points);
  const submittedRef = useRef(false);

  useEffect(() => {
    setPhase("show");
    setSelected(new Set());
    setTilesVisible(false);
    submittedRef.current = false;

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    timeouts.push(setTimeout(() => setTilesVisible(true), 100));
    timeouts.push(setTimeout(() => setTilesVisible(false), 600));
    timeouts.push(setTimeout(() => setPhase("play"), 2600));

    return () => timeouts.forEach((t) => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.index]);

  useEffect(() => {
    if (lastResult) {
      setPhase("result");
      if (lastResult.is_correct) {
        UISounds.correct();
        setScore((s) => s + lastResult.points_earned);
      } else {
        UISounds.wrong();
      }
    }
  }, [lastResult]);

  // Auto-submit when correct number of tiles selected
  useEffect(() => {
    if (
      phase === "play" &&
      !submitting &&
      !lastResult &&
      !submittedRef.current &&
      selected.size === pattern.length &&
      pattern.length > 0
    ) {
      submittedRef.current = true;
      const answer = Array.from(selected)
        .sort((a, b) => a - b)
        .join(",");
      setTimeout(() => onSubmit(answer), 0);
    }
  }, [selected, phase, submitting, lastResult, pattern.length, onSubmit]);

  const toggleCell = useCallback(
    (idx: number) => {
      if (phase !== "play" || submitting || lastResult || submittedRef.current) return;
      UISounds.tile();
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) {
          next.delete(idx);
        } else if (next.size < pattern.length) {
          next.add(idx);
        }
        return next;
      });
    },
    [phase, submitting, lastResult, pattern.length]
  );

  const totalCells = gridSize * gridSize;

  const getTileState = (idx: number): "inactive" | "active" | "selected" | "correct" | "wrong" => {
    const isPattern = pattern.includes(idx);
    const isSel = selected.has(idx);

    if (phase === "show") {
      if (tilesVisible && isPattern) return "active";
      return "inactive";
    }
    if (phase === "result") {
      if (isPattern && isSel) return "correct";
      if (isPattern && !isSel) return "wrong";
      if (!isPattern && isSel) return "wrong";
      return "inactive";
    }
    if (isSel) return "selected";
    return "inactive";
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col">
      {/* Background — wooden table on grass */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/game-assets/backgrounds/download-1.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          imageRendering: "pixelated",
        }}
      />

      {/* ═══ HUD buttons — absolute, never affects layout ═══ */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 pointer-events-none">
        <div className="flex gap-1.5 pointer-events-auto">
          <MuteButton className="!w-7 !h-7 !rounded-lg bg-black/30 hover:bg-black/50 !text-white/70" />
          <button onClick={onExit} className="hud-ctrl-btn hud-ctrl-exit">
            <X size={11} strokeWidth={3} className="relative z-[1]" />
            <span className="relative z-[1]">Exit</span>
          </button>
          <button onClick={onSwitchMode} className="hud-ctrl-btn hud-ctrl-mode" title="Switch to classic mode">
            <BookOpen size={11} strokeWidth={2.5} className="relative z-[1]" />
            <span className="relative z-[1]">Classic</span>
          </button>
        </div>
        <div className="flex items-center gap-4 text-white font-bold pointer-events-auto" style={{ fontFamily: "'Fredoka', sans-serif" }}>
          <span className="text-amber-300">{score} pts</span>
        </div>
      </div>

      {/* ═══ Phase indicator — absolute, never affects layout ═══ */}
      <div className="absolute top-14 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <div className="mem-question-panel inline-flex flex-col items-center gap-1 px-6 py-3 min-w-[220px]">
          {phase === "result" && lastResult ? (
            <>
              <span
                className={`text-lg font-bold ${lastResult.is_correct ? "text-emerald-400" : "text-red-400"}`}
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                {lastResult.is_correct ? "Correct!" : "Not quite..."}
              </span>
              <span
                className="text-sm text-amber-300/80 font-semibold"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                {lastResult.is_correct
                  ? `+${lastResult.points_earned} points`
                  : "Try again next round"}
              </span>
            </>
          ) : (
            <span
              className="text-base font-bold text-amber-100"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              {phase === "show"
                ? tilesVisible
                  ? "Remember this pattern!"
                  : "Get ready..."
                : `Tap ${pattern.length} tiles to recreate it (${selected.size}/${pattern.length})`}
            </span>
          )}
        </div>
      </div>

      {/* ═══ CENTER: Tile grid — always in the same fixed position ═══ */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          }}
        >
          {Array.from({ length: totalCells }, (_, idx) => {
            const state = getTileState(idx);
            const isClickable = phase === "play" && !lastResult && !submitting && !submittedRef.current;
            return (
              <button
                key={idx}
                onClick={() => toggleCell(idx)}
                disabled={!isClickable}
                className={`
                  memory-tile memory-tile-${state}
                  w-20 h-20 sm:w-24 sm:h-24
                  transition-all duration-200
                  ${isClickable ? "cursor-pointer hover:scale-105 hover:brightness-110 active:scale-95" : "cursor-default"}
                `}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

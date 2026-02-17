"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import GameWorld from "./GameWorld";
import {
  QuestionBlock, Heart, Coin, PlayerRunning, PlayerCelebrate,
  PlayerSprite, BossMonster, BossDefeatedExplosion,
  SpeechBubble, DamageFlash, BossHealthBar,
} from "./Sprites";
import type { ExerciseItem, ExerciseItemResult } from "@/types";
import type { WorldTheme } from "@/lib/level-config";
import { BOSSES } from "@/lib/boss-config";

interface MemoryBlocksProps {
  item: ExerciseItem;
  lastResult: ExerciseItemResult | null;
  submitting: boolean;
  onSubmit: (answer?: string) => void;
  progress: number;
  maxProgress: number;
  streak: number;
  points: number;
  worldTheme?: WorldTheme;
}

export default function MemoryBlocks({
  item, lastResult, submitting, onSubmit, progress, maxProgress, streak, points,
  worldTheme = "mountain",
}: MemoryBlocksProps) {
  const gridData = useMemo(() => {
    const size = (item.extra_data?.grid_size as number) || 4;
    const pattern = (item.extra_data?.pattern as number[]) || [];
    return { size, pattern };
  }, [item]);

  const [phase, setPhase] = useState<"show" | "play" | "result">("show");
  const [selectedCells, setSelectedCells] = useState<number[]>([]);
  const [showPattern, setShowPattern] = useState(true);
  const [monsterDefeated, setMonsterDefeated] = useState(false);
  const [monsterHurt, setMonsterHurt] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const [showDamageFlash, setShowDamageFlash] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const worldOffset = useRef(0);
  const [offset, setOffset] = useState(0);
  const boss = BOSSES.giant_golem;

  useEffect(() => {
    setPhase("show");
    setSelectedCells([]);
    setShowPattern(true);
    setMonsterDefeated(false);
    setMonsterHurt(false);
    setShowExplosion(false);
    setShowDamageFlash(false);
    setIsRunning(false);
    const timer = setTimeout(() => { setShowPattern(false); setPhase("play"); }, 2500);
    return () => clearTimeout(timer);
  }, [item]);

  useEffect(() => {
    if (lastResult) {
      setPhase("result");
      if (lastResult.is_correct) {
        setMonsterHurt(true);
        setTimeout(() => {
          setMonsterHurt(false);
          setMonsterDefeated(true);
          setShowExplosion(true);
        }, 500);
        setTimeout(() => {
          setIsRunning(true);
          worldOffset.current += 900;
          setOffset(worldOffset.current);
        }, 1000);
        setTimeout(() => setIsRunning(false), 1800);
      } else {
        setShowDamageFlash(true);
        setTimeout(() => setShowDamageFlash(false), 600);
      }
    }
  }, [lastResult]);

  const handleCellClick = (index: number) => {
    if (phase !== "play" || submitting) return;
    setSelectedCells(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  const handleSubmitPattern = () => {
    onSubmit([...selectedCells].sort((a, b) => a - b).join(","));
  };

  const isPatternCell = (index: number) => gridData.pattern.includes(index);
  const gridSize = gridData.size || 4;
  const totalCells = gridSize * gridSize;

  return (
    <GameWorld theme={worldTheme} worldOffset={offset}>
      <DamageFlash active={showDamageFlash} />

      {/* HUD */}
      <div className="absolute top-3 left-4 right-4 z-30 flex items-center justify-between">
        <div className="flex items-center gap-1">{[0,1,2].map(i => <Heart key={i} size={22} filled />)}</div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full"><Coin size={18} /><span className="text-white text-sm font-bold">{points}</span></div>
          {streak >= 2 && <div className="bg-orange-500/90 px-2 py-1 rounded-full animate-pulse"><span className="text-white text-xs font-bold">x{streak}</span></div>}
        </div>
      </div>

      {/* Progress */}
      <div className="absolute top-11 left-4 right-4 z-30">
        <div className="h-2.5 bg-black/20 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 transition-all duration-500" style={{ width: `${((progress + 1) / maxProgress) * 100}%` }} />
        </div>
      </div>

      {/* Boss health */}
      <div className="absolute top-[64px] left-4 right-4 z-30">
        <BossHealthBar hp={monsterDefeated ? 0 : 1} maxHp={1} bossName={boss.name} />
      </div>

      {/* Grid + button */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
        <div className="relative" style={{ minHeight: `${gridSize * 56 + 80}px` }}>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
            {Array.from({ length: totalCells }).map((_, i) => {
              const ip = isPatternCell(i);
              const is = selectedCells.includes(i);
              const active = (showPattern && ip) || (!showPattern && is);
              const cr = phase === "result" && ip;
              const wr = phase === "result" && is && !ip;
              return (
                <button key={i} onClick={() => handleCellClick(i)} disabled={phase !== "play" || submitting}
                  className={`w-12 h-12 rounded-lg shadow-md transition-all duration-200 border-b-[3px] cursor-pointer
                    ${active && phase === "show" ? "bg-yellow-400 border-yellow-600 scale-110" : ""}
                    ${is && phase === "play" ? "bg-yellow-400 border-yellow-600 scale-105" : ""}
                    ${cr ? "bg-emerald-400 border-emerald-600" : ""}
                    ${wr ? "bg-red-400 border-red-600" : ""}
                    ${!active && !cr && !wr ? "bg-amber-700 border-amber-900 hover:bg-amber-600" : ""}
                    ${phase === "play" ? "active:translate-y-0.5 active:border-b-0" : ""}
                  `}
                >
                  {(active || cr) ? <QuestionBlock size={32} hit={phase === "result"} /> : <div className="w-full h-full flex items-center justify-center"><div className="w-5 h-5 rounded bg-amber-800/30" /></div>}
                </button>
              );
            })}
          </div>

          <div className="h-16 flex items-center justify-center mt-3">
            {phase === "play" && selectedCells.length > 0 && !submitting && (
              <button onClick={handleSubmitPattern}
                className="px-10 py-3.5 bg-emerald-400 border-b-4 border-emerald-600 text-white text-lg font-bold rounded-2xl shadow-lg hover:bg-emerald-500 active:translate-y-1 active:border-b-0 transition-all cursor-pointer animate-pop-in"
                style={{ fontFamily: "'Fredoka', sans-serif" }}>Attack!</button>
            )}
            {phase === "result" && lastResult && (
              <div className="animate-pop-in">
                <div className={`px-8 py-3.5 rounded-2xl text-lg font-bold shadow-lg ${lastResult.is_correct ? "bg-emerald-400 text-white" : "bg-amber-400 text-white"}`} style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  {lastResult.is_correct ? `+${lastResult.points_earned} coins!` : "The golem stands strong!"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Characters */}
      <div className="absolute bottom-0 left-0 right-0 z-[15]">
        <div className="absolute bottom-0 left-[10%]">
          {isRunning ? <PlayerRunning size={90} /> : phase === "result" && lastResult?.is_correct ? <PlayerCelebrate size={90} /> : <PlayerSprite size={90} />}
        </div>
        <div className="absolute bottom-0 right-[6%] flex flex-col items-center" style={{ opacity: showExplosion ? 0.3 : 1, transition: "opacity 0.3s" }}>
          {phase !== "result" && (
            <div className="mb-1 max-w-[220px] animate-pop-in">
              <SpeechBubble position="above">
                <p className="text-sm font-bold text-gray-800 text-center" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  {phase === "show" ? boss.taunt : "Show your memory!"}
                </p>
              </SpeechBubble>
            </div>
          )}
          {showExplosion ? (
            <BossDefeatedExplosion size={100} bossType="giant_golem" />
          ) : (
            <BossMonster bossType="giant_golem" size={boss.size - 20} defeated={monsterDefeated} hurt={monsterHurt} />
          )}
        </div>
      </div>
    </GameWorld>
  );
}

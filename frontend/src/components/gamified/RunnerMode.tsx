"use client";

import React, { useState, useEffect, useRef } from "react";
import GameWorld from "./GameWorld";
import {
  PlayerRunning, PlayerSprite, PlayerCelebrate,
  Heart, Coin, BossMonster, BossDefeatedExplosion,
  SpeechBubble, DamageFlash, BossHealthBar,
} from "./Sprites";
import type { ExerciseItem, ExerciseItemResult } from "@/types";
import type { WorldTheme } from "@/lib/level-config";
import { BOSSES } from "@/lib/boss-config";

interface RunnerModeProps {
  item: ExerciseItem;
  lastResult: ExerciseItemResult | null;
  submitting: boolean;
  onSubmit: (answer?: string) => void;
  progress: number;
  maxProgress: number;
  streak: number;
  points: number;
  timeLimit?: number;
  worldTheme?: WorldTheme;
}

export default function RunnerMode({
  item, lastResult, submitting, onSubmit, progress, maxProgress, streak, points, timeLimit = 10,
  worldTheme = "grassland",
}: RunnerModeProps) {
  const [phase, setPhase] = useState<"running" | "answering" | "result">("running");
  const [timer, setTimer] = useState(timeLimit);
  const [timerActive, setTimerActive] = useState(false);
  const [monsterDefeated, setMonsterDefeated] = useState(false);
  const [monsterHurt, setMonsterHurt] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const [showDamageFlash, setShowDamageFlash] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const worldOffset = useRef(0);
  const [offset, setOffset] = useState(0);
  const boss = BOSSES.shadow_beast;

  useEffect(() => {
    setPhase("running");
    setTimer(timeLimit);
    setTimerActive(false);
    setMonsterDefeated(false);
    setMonsterHurt(false);
    setShowExplosion(false);
    setShowDamageFlash(false);
    setIsRunning(true);

    const t = setTimeout(() => {
      setPhase("answering");
      setTimerActive(true);
      setIsRunning(false);
    }, 800);
    return () => clearTimeout(t);
  }, [item, timeLimit]);

  useEffect(() => {
    if (!timerActive || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer(prev => { if (prev <= 1) { clearInterval(interval); setTimerActive(false); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timer]);

  useEffect(() => {
    if (lastResult) {
      setPhase("result");
      setTimerActive(false);
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

  const options = item.options || [];
  const timerPercent = (timer / timeLimit) * 100;
  const timerColor = timer > 5 ? "#34D399" : timer > 2 ? "#FBBF24" : "#EF4444";

  return (
    <GameWorld theme={worldTheme} worldOffset={offset}>
      <DamageFlash active={showDamageFlash} />

      {/* HUD */}
      <div className="absolute top-3 left-4 right-4 z-30 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => <Heart key={i} size={22} filled />)}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
            <div className="w-16 h-2.5 bg-black/20 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${timerPercent}%`, backgroundColor: timerColor }} />
            </div>
            <span className="text-white text-xs font-bold w-4 text-center">{timer}</span>
          </div>
          <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
            <Coin size={18} /><span className="text-white text-sm font-bold">{points}</span>
          </div>
          {streak >= 2 && <div className="bg-orange-500/90 px-2 py-1 rounded-full animate-pulse"><span className="text-white text-xs font-bold">x{streak}</span></div>}
        </div>
      </div>

      {/* Progress */}
      <div className="absolute top-11 left-4 right-4 z-30">
        <div className="h-2.5 bg-black/15 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-300 transition-all duration-500" style={{ width: `${((progress + 1) / maxProgress) * 100}%` }} />
        </div>
      </div>

      {/* Boss health */}
      <div className="absolute top-[64px] left-4 right-4 z-30">
        <BossHealthBar hp={monsterDefeated ? 0 : 1} maxHp={1} bossName={boss.name} />
      </div>

      {/* Answer options */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
        {phase === "answering" && !lastResult && options.length > 0 && (
          <div className="w-full max-w-xl animate-slide-in-right">
            <div className="flex flex-wrap gap-4 justify-center">
              {options.map((opt, i) => {
                const c = ["bg-[#FF5A39] border-[#CC4730]", "bg-[#475093] border-[#333D70]", "bg-emerald-500 border-emerald-700", "bg-purple-500 border-purple-700"][i % 4];
                return (
                  <button key={i} onClick={() => onSubmit(opt)} disabled={submitting}
                    className={`${c} text-white px-8 py-4 rounded-2xl text-base font-bold shadow-lg border-b-4 transition-all active:translate-y-1 active:border-b-0 cursor-pointer ${submitting ? "opacity-50" : ""}`}
                    style={{ fontFamily: "'Fredoka', sans-serif" }}
                  >{opt}</button>
                );
              })}
            </div>
          </div>
        )}

        {lastResult && (
          <div className="animate-pop-in">
            <div className={`px-10 py-5 rounded-2xl text-2xl font-bold shadow-xl ${lastResult.is_correct ? "bg-emerald-400 text-white" : "bg-amber-400 text-white"}`} style={{ fontFamily: "'Fredoka', sans-serif" }}>
              {lastResult.is_correct ? <div className="flex items-center gap-3"><span>+{lastResult.points_earned}</span><Coin size={26} /><span>Keep going!</span></div> : <span>Answer: {lastResult.correct_answer}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Characters on ground */}
      <div className="absolute bottom-0 left-0 right-0 z-[15]">
        <div className="absolute bottom-0 left-[10%]">
          {isRunning ? <PlayerRunning size={100} /> : phase === "result" && lastResult?.is_correct ? <PlayerCelebrate size={100} /> : <PlayerSprite size={100} className={phase === "result" && !lastResult?.is_correct ? "animate-shake" : ""} />}
        </div>

        <div className="absolute bottom-0 right-[6%] flex flex-col items-center" style={{ opacity: phase === "running" ? 0 : 1, transition: "opacity 0.3s" }}>
          {phase === "answering" && !lastResult && (
            <div className="mb-1 max-w-[300px] animate-pop-in">
              <SpeechBubble position="above">
                <p className="text-base font-bold text-gray-800 text-center leading-snug" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  {item.question || boss.taunt}
                </p>
              </SpeechBubble>
            </div>
          )}
          {showExplosion ? (
            <BossDefeatedExplosion size={100} bossType="shadow_beast" />
          ) : (
            <BossMonster bossType="shadow_beast" size={boss.size} defeated={monsterDefeated} hurt={monsterHurt} />
          )}
        </div>
      </div>
    </GameWorld>
  );
}

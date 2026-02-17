"use client";

import React, { useState, useEffect, useRef } from "react";
import GameWorld from "./GameWorld";
import {
  PlayerSprite, PlayerRunning, PlayerCelebrate,
  BossMonster, BossDefeatedExplosion, Heart, Coin,
  SpeechBubble, DamageFlash, BossHealthBar,
} from "./Sprites";
import type { ExerciseItem, ExerciseItemResult } from "@/types";
import type { WorldTheme } from "@/lib/level-config";
import { BOSSES } from "@/lib/boss-config";

interface PuzzleBridgeProps {
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

export default function PuzzleBridge({
  item, lastResult, submitting, onSubmit, progress, maxProgress, streak, points,
  worldTheme = "cloud_kingdom",
}: PuzzleBridgeProps) {
  const [textInput, setTextInput] = useState("");
  const [phase, setPhase] = useState<"enter" | "challenge" | "result">("enter");
  const [monsterDefeated, setMonsterDefeated] = useState(false);
  const [monsterHurt, setMonsterHurt] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const [showDamageFlash, setShowDamageFlash] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const worldOffset = useRef(0);
  const [offset, setOffset] = useState(0);
  const boss = BOSSES.dragon;

  useEffect(() => {
    setPhase("enter");
    setTextInput("");
    setMonsterDefeated(false);
    setMonsterHurt(false);
    setShowExplosion(false);
    setShowDamageFlash(false);
    setIsRunning(false);
    setTimeout(() => setPhase("challenge"), 600);
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

  const options = item.options || [];
  const hasOptions = options.length > 0;
  const wordHint = typeof item.extra_data?.word === "string" ? item.extra_data.word : "";
  const sentenceHint = typeof item.extra_data?.sentence === "string" ? item.extra_data.sentence : "";

  return (
    <GameWorld theme={worldTheme} worldOffset={offset}>
      <DamageFlash active={showDamageFlash} />

      {/* HUD */}
      <div className="absolute top-3 left-4 right-4 z-30 flex items-center justify-between">
        <div className="flex items-center gap-1">{[0, 1, 2].map(i => <Heart key={i} size={22} filled />)}</div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full"><Coin size={18} /><span className="text-white text-sm font-bold">{points}</span></div>
          {streak >= 2 && <div className="bg-orange-500/90 px-2 py-1 rounded-full animate-pulse"><span className="text-white text-xs font-bold">x{streak}</span></div>}
        </div>
      </div>

      {/* Progress */}
      <div className="absolute top-11 left-4 right-4 z-30">
        <div className="h-2.5 bg-black/20 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-300 transition-all duration-500" style={{ width: `${((progress + 1) / maxProgress) * 100}%` }} />
        </div>
      </div>

      {/* Boss health */}
      <div className="absolute top-[64px] left-4 right-4 z-30">
        <BossHealthBar hp={monsterDefeated ? 0 : 1} maxHp={1} bossName={boss.name} />
      </div>

      {/* Challenge */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
        {phase === "challenge" && !lastResult && (
          <div className="w-full max-w-xl animate-slide-in-right">
            {(wordHint || sentenceHint) && (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 mb-5">
                <p className="text-white text-xl font-bold text-center leading-snug" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  {sentenceHint || wordHint}
                </p>
              </div>
            )}

            {hasOptions ? (
              <div className="flex flex-wrap gap-4 justify-center">
                {options.map((opt, i) => {
                  const c = ["bg-violet-500 border-violet-700", "bg-fuchsia-500 border-fuchsia-700", "bg-amber-500 border-amber-700", "bg-cyan-500 border-cyan-700"][i % 4];
                  return (
                    <button key={i} onClick={() => onSubmit(opt)} disabled={submitting}
                      className={`${c} text-white px-8 py-4 rounded-2xl text-base font-bold shadow-lg border-b-4 transition-all active:translate-y-1 active:border-b-0 cursor-pointer ${submitting ? "opacity-50" : ""}`}
                      style={{ fontFamily: "'Fredoka', sans-serif" }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="text" value={textInput} onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && textInput.trim()) onSubmit(textInput.trim()); }}
                  placeholder="Type your answer..."
                  className="flex-1 px-5 py-4 rounded-2xl bg-white/15 border-2 border-white/30 text-white placeholder-white/50 font-bold text-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/40"
                  style={{ fontFamily: "'Fredoka', sans-serif" }}
                  disabled={submitting}
                />
                <button onClick={() => textInput.trim() && onSubmit(textInput.trim())} disabled={submitting || !textInput.trim()}
                  className="px-8 py-4 bg-amber-400 border-b-4 border-amber-600 text-white text-lg font-bold rounded-2xl shadow-lg active:translate-y-1 active:border-b-0 transition-all cursor-pointer hover:bg-amber-500 disabled:opacity-40"
                  style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  Cast!
                </button>
              </div>
            )}
          </div>
        )}

        {lastResult && (
          <div className="animate-pop-in">
            <div className={`px-10 py-5 rounded-2xl text-2xl font-bold shadow-xl ${lastResult.is_correct ? "bg-emerald-400 text-white" : "bg-amber-400 text-white"}`} style={{ fontFamily: "'Fredoka', sans-serif" }}>
              {lastResult.is_correct ? <div className="flex items-center gap-3"><span>+{lastResult.points_earned}</span><Coin size={26} /></div> : <div className="text-center"><p>Not quite!</p><p className="text-base mt-1 opacity-90">Answer: {lastResult.correct_answer}</p></div>}
            </div>
          </div>
        )}
      </div>

      {/* Characters */}
      <div className="absolute bottom-0 left-0 right-0 z-[15]">
        <div className="absolute bottom-0 left-[10%]">
          {isRunning ? <PlayerRunning size={100} /> : phase === "result" && lastResult?.is_correct && !isRunning ? <PlayerCelebrate size={100} /> : <PlayerSprite size={100} className={phase === "result" && !lastResult?.is_correct ? "animate-shake" : ""} />}
        </div>
        <div className="absolute bottom-0 right-[6%] flex flex-col items-center" style={{ opacity: phase === "enter" ? 0 : 1, transition: "opacity 0.3s" }}>
          {phase === "challenge" && !lastResult && (
            <div className="mb-1 max-w-[280px] animate-pop-in">
              <SpeechBubble position="above">
                <p className="text-sm font-bold text-gray-800 text-center" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  {item.question || boss.taunt}
                </p>
              </SpeechBubble>
            </div>
          )}
          {showExplosion ? (
            <BossDefeatedExplosion size={110} bossType="dragon" />
          ) : (
            <BossMonster bossType="dragon" size={boss.size} defeated={monsterDefeated} hurt={monsterHurt} />
          )}
        </div>
      </div>
    </GameWorld>
  );
}

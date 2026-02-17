"use client";

import React, { useState, useEffect, useRef } from "react";
import GameWorld from "./GameWorld";
import {
  PlayerRunning, PlayerCelebrate, PlayerSprite,
  BossMonster, SpeechBubble, BossDefeatedExplosion,
  BossHealthBar, Heart, Coin, DamageFlash, FloatingDamage,
} from "./Sprites";
import type { ExerciseItem, ExerciseItemResult } from "@/types";
import type { WorldTheme } from "@/lib/level-config";
import { BOSSES } from "@/lib/boss-config";

interface BossEncounterProps {
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

type Phase = "walking" | "encounter" | "answering" | "correct" | "incorrect";

export default function BossEncounter({
  item, lastResult, submitting, onSelectAnswer, onSubmit, progress, maxProgress, streak, points,
  worldTheme = "grassland",
}: BossEncounterProps) {
  const [phase, setPhase] = useState<Phase>("walking");
  const [bossDefeated, setBossDefeated] = useState(false);
  const [bossHurt, setBossHurt] = useState(false);
  const [bossAttacking, setBossAttacking] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const [showDamageFlash, setShowDamageFlash] = useState(false);
  const [showFloatingDmg, setShowFloatingDmg] = useState(false);
  const [bossHp, setBossHp] = useState(3);
  const worldOffset = useRef(0);
  const [offset, setOffset] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const boss = BOSSES.dark_sorcerer;

  useEffect(() => {
    setPhase("walking");
    setBossDefeated(false);
    setBossHurt(false);
    setBossAttacking(false);
    setShowExplosion(false);
    setShowDamageFlash(false);
    setShowFloatingDmg(false);
    setIsRunning(false);
    setBossHp(3);
    const t = setTimeout(() => setPhase("answering"), 600);
    return () => clearTimeout(t);
  }, [item]);

  useEffect(() => {
    if (lastResult) {
      if (lastResult.is_correct) {
        setPhase("correct");
        setBossHurt(true);
        setShowFloatingDmg(true);
        setBossHp(prev => Math.max(0, prev - 1));

        setTimeout(() => {
          setBossHurt(false);
          setBossDefeated(true);
          setShowExplosion(true);
        }, 600);
        setTimeout(() => {
          setIsRunning(true);
          worldOffset.current += 900;
          setOffset(worldOffset.current);
          setShowFloatingDmg(false);
        }, 1200);
        setTimeout(() => setIsRunning(false), 2000);
      } else {
        setPhase("incorrect");
        setBossAttacking(true);
        setShowDamageFlash(true);
        setTimeout(() => {
          setBossAttacking(false);
          setShowDamageFlash(false);
        }, 800);
      }
    }
  }, [lastResult]);

  const options = item.options || [];
  const isYesNo = item.item_type === "yes_no" || options.length === 2;

  return (
    <GameWorld theme={worldTheme} worldOffset={offset}>
      <DamageFlash active={showDamageFlash} />

      {/* HUD */}
      <div className="absolute top-3 left-4 right-4 z-30 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => <Heart key={i} size={22} filled />)}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
            <Coin size={18} />
            <span className="text-white text-sm font-bold">{points}</span>
          </div>
          {streak >= 2 && (
            <div className="bg-orange-500/90 px-2 py-1 rounded-full animate-pulse">
              <span className="text-white text-xs font-bold">x{streak}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute top-11 left-4 right-4 z-30">
        <div className="h-2.5 bg-black/15 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all duration-500"
            style={{ width: `${((progress + 1) / maxProgress) * 100}%` }}
          />
        </div>
        <p className="text-white/60 text-[10px] font-bold mt-0.5 text-right">{progress + 1}/{maxProgress}</p>
      </div>

      {/* Boss health bar */}
      <div className="absolute top-[72px] left-4 right-4 z-30">
        <BossHealthBar hp={bossHp} maxHp={3} bossName={boss.name} />
      </div>

      {/* Answer options */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
        {phase === "answering" && !lastResult && (
          <div className="w-full max-w-xl animate-slide-in-right">
            {isYesNo ? (
              <div className="flex gap-5 justify-center">
                {(options.length > 0 ? options : ["Yes", "No"]).map((opt, i) => (
                  <button key={i} onClick={() => { onSelectAnswer(opt); onSubmit(opt); }} disabled={submitting}
                    className={`px-12 py-5 rounded-2xl text-xl font-bold shadow-lg border-b-4 transition-all active:translate-y-1 active:border-b-0 cursor-pointer ${i === 0 ? "bg-emerald-400 border-emerald-600 text-white hover:bg-emerald-500" : "bg-red-400 border-red-600 text-white hover:bg-red-500"} ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                    style={{ fontFamily: "'Fredoka', sans-serif" }}
                  >{opt}</button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {options.map((opt, i) => {
                  const c = ["bg-[#FF5A39] border-[#CC4730]", "bg-[#475093] border-[#333D70]", "bg-emerald-500 border-emerald-700", "bg-amber-500 border-amber-700"][i % 4];
                  return (
                    <button key={i} onClick={() => { onSelectAnswer(opt); onSubmit(opt); }} disabled={submitting}
                      className={`${c} text-white px-5 py-4 rounded-2xl text-base font-bold shadow-lg border-b-4 transition-all active:translate-y-1 active:border-b-0 cursor-pointer ${submitting ? "opacity-50" : "hover:brightness-110"}`}
                      style={{ fontFamily: "'Fredoka', sans-serif" }}
                    >{opt}</button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {lastResult && (
          <div className="animate-pop-in">
            <div className={`px-10 py-5 rounded-2xl text-2xl font-bold shadow-xl ${lastResult.is_correct ? "bg-emerald-400 text-white" : "bg-amber-400 text-white"}`} style={{ fontFamily: "'Fredoka', sans-serif" }}>
              {lastResult.is_correct ? (
                <div className="flex items-center gap-3"><span>Correct! +{lastResult.points_earned}</span><Coin size={26} /></div>
              ) : (
                <div className="text-center"><p>Not quite!</p><p className="text-base mt-1 opacity-90">Answer: {lastResult.correct_answer}</p></div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Characters on ground */}
      <div className="absolute bottom-0 left-0 right-0 z-[15]">
        {/* Player */}
        <div className="absolute bottom-0 left-[10%]">
          {isRunning ? (
            <PlayerRunning size={110} />
          ) : phase === "correct" && !isRunning ? (
            <PlayerCelebrate size={110} />
          ) : (
            <PlayerSprite size={110} className={phase === "incorrect" ? "animate-shake" : ""} />
          )}
        </div>

        {/* Boss with speech bubble */}
        <div className="absolute bottom-0 right-[6%] flex flex-col items-center">
          {phase === "answering" && !lastResult && (
            <div className="mb-1 max-w-[320px] animate-pop-in">
              <SpeechBubble position="above">
                <p className="text-base font-bold text-gray-800 text-center leading-snug" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  {item.question || boss.taunt}
                </p>
                {typeof item.extra_data?.word === "string" && (
                  <p className="text-2xl text-[#475093] font-bold text-center mt-1">{item.extra_data.word}</p>
                )}
              </SpeechBubble>
            </div>
          )}

          {/* Floating damage */}
          {showFloatingDmg && <FloatingDamage amount={1} x="50%" y="-20px" />}

          {showExplosion ? (
            <BossDefeatedExplosion size={140} bossType="dark_sorcerer" />
          ) : (
            <BossMonster
              bossType="dark_sorcerer"
              size={boss.size}
              defeated={bossDefeated}
              hurt={bossHurt}
              attacking={bossAttacking}
            />
          )}
        </div>
      </div>
    </GameWorld>
  );
}

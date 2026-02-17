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

interface CardDealerProps {
  item: ExerciseItem;
  lastResult: ExerciseItemResult | null;
  submitting: boolean;
  onSelectAnswer: (answer: string) => void;
  onSubmit: (answer?: string) => void;
  progress: number;
  maxProgress: number;
  streak: number;
  points: number;
  worldTheme?: WorldTheme;
}

export default function CardDealer({
  item, lastResult, submitting, onSelectAnswer, onSubmit, progress, maxProgress, streak, points,
  worldTheme = "grassland",
}: CardDealerProps) {
  const [phase, setPhase] = useState<"enter" | "deal" | "pick" | "result">("enter");
  const [monsterDefeated, setMonsterDefeated] = useState(false);
  const [monsterHurt, setMonsterHurt] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const [showDamageFlash, setShowDamageFlash] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const worldOffset = useRef(0);
  const [offset, setOffset] = useState(0);
  const boss = BOSSES.corrupted_knight;

  useEffect(() => {
    setPhase("enter");
    setMonsterDefeated(false);
    setMonsterHurt(false);
    setShowExplosion(false);
    setShowDamageFlash(false);
    setIsRunning(false);
    setTimeout(() => setPhase("deal"), 300);
    setTimeout(() => setPhase("pick"), 700);
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
  const isYesNo = item.item_type === "yes_no" || options.length === 2;
  const word1 = typeof item.extra_data?.word1 === "string" ? item.extra_data.word1 : "";
  const word2 = typeof item.extra_data?.word2 === "string" ? item.extra_data.word2 : "";

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
        <div className="h-2.5 bg-black/15 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-300 transition-all duration-500" style={{ width: `${((progress + 1) / maxProgress) * 100}%` }} />
        </div>
      </div>

      {/* Boss health */}
      <div className="absolute top-[64px] left-4 right-4 z-30">
        <BossHealthBar hp={monsterDefeated ? 0 : 1} maxHp={1} bossName={boss.name} />
      </div>

      {/* Cards / answers */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
        {phase !== "enter" && (word1 || word2) && (
          <div className="flex gap-5 mb-6 animate-card-deal">
            {word1 && <WordCard word={word1} />}
            {word2 && <WordCard word={word2} />}
          </div>
        )}

        {phase === "pick" && !lastResult && (
          <div className="w-full max-w-xl animate-slide-in-right">
            {isYesNo ? (
              <div className="flex gap-5 justify-center">
                {(options.length > 0 ? options : ["Yes", "No"]).map((opt, i) => (
                  <button key={i} onClick={() => { onSelectAnswer(opt); onSubmit(opt); }} disabled={submitting}
                    className={`px-14 py-5 rounded-2xl text-xl font-bold shadow-lg border-b-4 transition-all active:translate-y-1 active:border-b-0 cursor-pointer ${i === 0 ? "bg-emerald-400 border-emerald-600 text-white" : "bg-red-400 border-red-600 text-white"} ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                    style={{ fontFamily: "'Fredoka', sans-serif" }}>
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-4 justify-center">
                {options.map((opt, i) => {
                  const c = ["bg-[#FF5A39] border-[#CC4730]", "bg-[#475093] border-[#333D70]", "bg-emerald-500 border-emerald-700"][i % 3];
                  return (
                    <button key={i} onClick={() => { onSelectAnswer(opt); onSubmit(opt); }} disabled={submitting}
                      className={`${c} text-white px-8 py-4 rounded-2xl text-lg font-bold shadow-lg border-b-4 transition-all active:translate-y-1 active:border-b-0 cursor-pointer ${submitting ? "opacity-50" : ""}`}
                      style={{ fontFamily: "'Fredoka', sans-serif" }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {lastResult && (
          <div className="animate-pop-in">
            <div className={`px-10 py-5 rounded-2xl text-2xl font-bold shadow-xl ${lastResult.is_correct ? "bg-emerald-400 text-white" : "bg-amber-400 text-white"}`} style={{ fontFamily: "'Fredoka', sans-serif" }}>
              {lastResult.is_correct ? <div className="flex items-center gap-3"><span>+{lastResult.points_earned}</span><Coin size={26} /></div> : <span>Answer: {lastResult.correct_answer}</span>}
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
          {phase === "pick" && !lastResult && (
            <div className="mb-1 max-w-[260px] animate-pop-in">
              <SpeechBubble position="above">
                <p className="text-sm font-bold text-gray-800 text-center" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  {item.question || boss.taunt}
                </p>
              </SpeechBubble>
            </div>
          )}
          {showExplosion ? (
            <BossDefeatedExplosion size={100} bossType="corrupted_knight" />
          ) : (
            <BossMonster bossType="corrupted_knight" size={boss.size} defeated={monsterDefeated} hurt={monsterHurt} />
          )}
        </div>
      </div>
    </GameWorld>
  );
}

function WordCard({ word }: { word: string }) {
  return (
    <div className="bg-white rounded-2xl px-6 py-4 shadow-xl border-2 border-gray-100 min-w-[120px]">
      <p className="text-3xl font-bold text-center text-[#475093]" style={{ fontFamily: "'Fredoka', sans-serif" }}>{word}</p>
    </div>
  );
}

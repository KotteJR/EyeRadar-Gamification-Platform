"use client";

import { useState, useEffect } from "react";
import { X, BookOpen } from "lucide-react";
import { UISounds } from "@/lib/ui-sounds";
import MuteButton from "@/components/MuteButton";
import {
  eventBus,
  GameEvents,
  type ScoreUpdatePayload,
  type PhaseChangePayload,
} from "@/lib/phaser/EventBus";

const HUD = "/game-assets/ui/hud";

interface HUDOverlayProps {
  initialPoints: number;
  initialStreak: number;
  initialLives: number;
  bossName: string;
  maxBossHp: number;
  onExit?: () => void;
  onSwitchMode?: () => void;
}

export default function HUDOverlay({
  initialPoints,
  initialStreak,
  initialLives,
  bossName,
  maxBossHp: maxBossHpProp,
  onExit,
  onSwitchMode,
}: HUDOverlayProps) {
  const [points, setPoints] = useState(initialPoints);
  const [streak, setStreak] = useState(initialStreak);
  const [lives, setLives] = useState(initialLives);
  const [bossHp, setBossHp] = useState(maxBossHpProp);
  const [maxBossHp, setMaxBossHp] = useState(maxBossHpProp);

  useEffect(() => {
    const unsub1 = eventBus.on(GameEvents.SCORE_UPDATE, (detail) => {
      const data = detail as ScoreUpdatePayload;
      setPoints(data.points);
      setStreak(data.streak);
    });
    const unsub2 = eventBus.on(GameEvents.PHASE_CHANGE, (detail) => {
      const data = detail as PhaseChangePayload;
      if (data.bossHp !== undefined) setBossHp(data.bossHp);
      if (data.maxBossHp !== undefined) setMaxBossHp(data.maxBossHp);
    });
    const unsub3 = eventBus.on("battle:lives", (detail) => {
      const data = detail as { lives: number };
      setLives(data.lives);
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  useEffect(() => {
    setPoints(initialPoints);
    setStreak(initialStreak);
  }, [initialPoints, initialStreak]);

  const hpPercent = maxBossHp > 0 ? (bossHp / maxBossHp) * 100 : 0;
  const totalHearts = initialLives;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">

      {/* ═══ Boss HP — top center ═══════════════════════════ */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[min(300px,72vw)]">
        <div className="text-center mb-1">
          <span className="hud-boss-label">{bossName}</span>
        </div>
        <div className="hud-bar-track">
          <div
            className="hud-bar-fill hud-bar-fill-red"
            style={{ width: `${hpPercent}%` }}
          />
          {maxBossHp <= 20 && Array.from({ length: maxBossHp - 1 }, (_, i) => (
            <div
              key={i}
              className="hud-bar-seg"
              style={{ left: `${((i + 1) / maxBossHp) * 100}%` }}
            />
          ))}
          <span className="hud-bar-text">{bossHp} / {maxBossHp}</span>
        </div>
      </div>

      {/* ═══ Hearts — top left ══════════════════════════════ */}
      <div className="absolute top-3 left-3 flex items-center gap-[2px]">
        {Array.from({ length: totalHearts }, (_, i) => (
          <img
            key={i}
            src={`${HUD}/${i < lives ? "heart-full" : "heart-empty"}.png`}
            alt=""
            className="hud-icon-sm pixelated select-none pointer-events-none"
            draggable={false}
          />
        ))}
      </div>

      {/* ═══ Mute + Exit + Classic — top right ═════════════════════ */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-auto">
        <MuteButton className="!w-7 !h-7 !rounded-lg bg-black/30 hover:bg-black/50 !text-white/70" />
        {onSwitchMode && (
          <button
            onClick={() => { UISounds.click(); onSwitchMode(); }}
            className="hud-ctrl-btn hud-ctrl-mode"
            title="Switch to classic mode"
          >
            <BookOpen size={11} strokeWidth={2.5} className="relative z-[1]" />
            <span className="relative z-[1]">Classic</span>
          </button>
        )}
        {onExit && (
          <button
            onClick={() => { UISounds.click(); onExit(); }}
            className="hud-ctrl-btn hud-ctrl-exit"
          >
            <X size={11} strokeWidth={3} className="relative z-[1]" />
            <span className="relative z-[1]">Exit</span>
          </button>
        )}
      </div>
    </div>
  );
}

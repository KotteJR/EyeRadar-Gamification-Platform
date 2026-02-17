"use client";

import { useState, useEffect } from "react";
import { eventBus, GameEvents, type ScoreUpdatePayload, type PhaseChangePayload } from "@/lib/phaser/EventBus";

interface HUDOverlayProps {
  initialPoints: number;
  initialStreak: number;
  initialLives: number;
  progress: number;
  maxProgress: number;
  bossName: string;
}

export default function HUDOverlay({
  initialPoints,
  initialStreak,
  initialLives,
  progress,
  maxProgress,
  bossName,
}: HUDOverlayProps) {
  const [points, setPoints] = useState(initialPoints);
  const [streak, setStreak] = useState(initialStreak);
  const [bossHp, setBossHp] = useState(maxProgress);
  const [maxBossHp, setMaxBossHp] = useState(maxProgress);
  const [currentProgress, setCurrentProgress] = useState(progress);

  useEffect(() => {
    const unsub1 = eventBus.on(GameEvents.SCORE_UPDATE, (detail) => {
      const data = detail as ScoreUpdatePayload;
      setPoints(data.points);
      setStreak(data.streak);
      setCurrentProgress(data.progress);
    });
    const unsub2 = eventBus.on(GameEvents.PHASE_CHANGE, (detail) => {
      const data = detail as PhaseChangePayload;
      if (data.bossHp !== undefined) setBossHp(data.bossHp);
      if (data.maxBossHp !== undefined) setMaxBossHp(data.maxBossHp);
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  useEffect(() => {
    setPoints(initialPoints);
    setStreak(initialStreak);
    setCurrentProgress(progress);
  }, [initialPoints, initialStreak, progress]);

  const hpPercent = maxBossHp > 0 ? (bossHp / maxBossHp) * 100 : 0;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Boss HP bar — top center, PixelLab health bar frame */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[min(440px,82vw)]">
        <div className="hud-hp-frame">
          {/* PixelLab ornate frame image overlay */}
          <img
            src="/game-assets/ui/healthbar-frame.png"
            alt=""
            className="absolute inset-0 w-full h-full pixelated pointer-events-none"
            style={{ opacity: 0.7, objectFit: "fill" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />

          {/* Boss emblem + name row */}
          <div className="hud-boss-name">
            <img
              src="/game-assets/ui/boss-emblem.png"
              alt=""
              className="inline-block w-5 h-5 pixelated mr-1 align-middle"
              style={{ verticalAlign: "middle" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span>{bossName}</span>
          </div>

          {/* HP track */}
          <div className="hud-hp-track">
            <div
              className="hud-hp-fill"
              style={{ width: `${hpPercent}%` }}
            />
            {maxBossHp <= 20 && Array.from({ length: maxBossHp - 1 }, (_, i) => (
              <div
                key={i}
                className="hud-hp-seg"
                style={{ left: `${((i + 1) / maxBossHp) * 100}%` }}
              />
            ))}
            <span className="hud-hp-count">{bossHp} / {maxBossHp}</span>
          </div>
        </div>
      </div>

      {/* Points + Streak — top right, PixelLab stat badges */}
      <div className="absolute top-3.5 right-4 flex items-center gap-2">
        <div className="hud-stat">
          <img
            src="/game-assets/ui/stat-badge.png"
            alt=""
            className="absolute inset-0 w-full h-full pixelated pointer-events-none rounded"
            style={{ opacity: 0.5, objectFit: "fill" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <span className="hud-stat-label relative z-[1]">PTS</span>
          <span className="hud-stat-value relative z-[1]">{points}</span>
        </div>
        {streak >= 2 && (
          <div className="hud-stat hud-stat-hot">
            <img
              src="/game-assets/ui/stat-badge.png"
              alt=""
              className="absolute inset-0 w-full h-full pixelated pointer-events-none rounded"
              style={{ opacity: 0.4, objectFit: "fill" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span className="hud-stat-label relative z-[1]">STREAK</span>
            <span className="hud-stat-value relative z-[1]">x{streak}</span>
          </div>
        )}
      </div>

      {/* Progress — bottom right */}
      <div className="absolute bottom-3 right-4">
        <div className="hud-stat">
          <img
            src="/game-assets/ui/stat-badge.png"
            alt=""
            className="absolute inset-0 w-full h-full pixelated pointer-events-none rounded"
            style={{ opacity: 0.5, objectFit: "fill" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <span className="hud-stat-label relative z-[1]">Q</span>
          <span className="hud-stat-value relative z-[1]">{currentProgress + 1}/{maxProgress}</span>
        </div>
      </div>
    </div>
  );
}

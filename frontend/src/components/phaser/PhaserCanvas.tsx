"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { createGameConfig } from "@/lib/phaser/config";
import { eventBus, GameEvents } from "@/lib/phaser/EventBus";
import type { LevelStartPayload } from "@/lib/phaser/EventBus";

interface PhaserCanvasProps {
  levelConfig: LevelStartPayload;
  onReady?: () => void;
}

export default function PhaserCanvas({
  levelConfig,
  onReady,
}: PhaserCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const readySent = useRef(false);
  const levelConfigRef = useRef(levelConfig);
  levelConfigRef.current = levelConfig;

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config = createGameConfig(containerRef.current);
    const game = new Phaser.Game(config);
    gameRef.current = game;

    // When PreloadScene finishes, start BattleScene directly
    const unsub = eventBus.on(GameEvents.GAME_READY, () => {
      setTimeout(() => {
        if (game.scene.isActive("PreloadScene")) {
          game.scene.stop("PreloadScene");
        }
        // ALL game types go through BattleScene now
        game.scene.start("BattleScene", levelConfigRef.current);

        if (!readySent.current && onReady) {
          readySent.current = true;
          onReady();
        }
      }, 0);
    });

    return () => {
      unsub();
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        readySent.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

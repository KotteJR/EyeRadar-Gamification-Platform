"use client";

import { useState, useEffect, useCallback } from "react";

export type GameMode = "classic" | "gamified" | "phaser";

const STORAGE_KEY = "eyeradar_game_mode";

export function useGameMode() {
  const [mode, setModeState] = useState<GameMode>("phaser");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "classic" || saved === "gamified" || saved === "phaser") {
        setModeState(saved);
      } else {
        // Migrate old boolean format
        const oldKey = localStorage.getItem("eyeradar_gamified_mode");
        if (oldKey === "true") {
          setModeState("gamified");
          localStorage.setItem(STORAGE_KEY, "gamified");
        } else {
          // Default to phaser (new engine)
          setModeState("phaser");
          localStorage.setItem(STORAGE_KEY, "phaser");
        }
      }
    } catch {
      // noop
    }
    setLoaded(true);
  }, []);

  const setMode = useCallback((newMode: GameMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // noop
    }
  }, []);

  const cycleMode = useCallback(() => {
    setModeState((prev) => {
      const next: GameMode =
        prev === "phaser" ? "classic" : prev === "classic" ? "gamified" : "phaser";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // noop
      }
      return next;
    });
  }, []);

  // Backward compat: gamifiedMode is true when mode is gamified OR phaser
  const gamifiedMode = mode === "gamified" || mode === "phaser";

  const toggleGameMode = useCallback(() => {
    setModeState((prev) => {
      const next: GameMode = prev === "classic" ? "phaser" : "classic";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // noop
      }
      return next;
    });
  }, []);

  return { mode, gamifiedMode, toggleGameMode, setMode, cycleMode, loaded };
}

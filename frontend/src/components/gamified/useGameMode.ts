"use client";

import { useState, useEffect, useCallback } from "react";

export type GameMode = "classic" | "phaser";

const STORAGE_KEY = "eyeradar_game_mode";

export function useGameMode() {
  const [mode, setModeState] = useState<GameMode>("phaser");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "classic") {
        setModeState("classic");
      } else {
        setModeState("phaser");
        localStorage.setItem(STORAGE_KEY, "phaser");
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

  const gamifiedMode = mode === "phaser";

  return { mode, gamifiedMode, toggleGameMode, setMode, loaded };
}

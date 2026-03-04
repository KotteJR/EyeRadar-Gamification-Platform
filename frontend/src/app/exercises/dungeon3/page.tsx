"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { MusicManager } from "@/lib/music-manager";
import type { ExerciseSession, ExerciseItem, DeficitArea } from "@/types";
import { DEFICIT_AREA_THEME } from "@/lib/level-config";
import { markCastleCompleted } from "@/lib/map-utils";
import Dungeon3StageOverlay from "@/components/phaser/Dungeon3StageOverlay";

const PhaserCanvas = dynamic(
  () => import("@/components/phaser/PhaserCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm font-semibold">
            Entering the 3-Stage Dungeon...
          </p>
        </div>
      </div>
    ),
  }
);

const FALLBACK_ITEMS: ExerciseItem[] = [
  { index: 0, item_type: "castle_dungeon", question: "Which word rhymes with 'cat'?", options: ["hat", "dog", "sun", "map"], correct_answer: "hat", extra_data: { answer_mode: "word_cards" } },
  { index: 1, item_type: "castle_dungeon", question: "How many syllables in 'butterfly'?", options: ["3", "2", "4", "1"], correct_answer: "3", extra_data: { answer_mode: "word_cards" } },
  { index: 2, item_type: "castle_dungeon", question: "What is the opposite of 'hot'?", options: ["cold", "warm", "fast", "big"], correct_answer: "cold", extra_data: { answer_mode: "word_cards" } },
  { index: 3, item_type: "castle_dungeon", question: "Which letter makes the 'sh' sound?", options: ["sh", "ch", "th", "wh"], correct_answer: "sh", extra_data: { answer_mode: "word_cards" } },
  { index: 4, item_type: "castle_dungeon", question: "What comes after 'A, B, C'?", options: ["D", "E", "F", "G"], correct_answer: "D", extra_data: { answer_mode: "word_cards" } },
  { index: 5, item_type: "castle_dungeon", question: "Which word starts with 'B'?", options: ["ball", "cat", "dog", "fish"], correct_answer: "ball", extra_data: { answer_mode: "word_cards" } },
  { index: 6, item_type: "castle_dungeon", question: "How many legs does a spider have?", options: ["8", "6", "4", "10"], correct_answer: "8", extra_data: { answer_mode: "word_cards" } },
  { index: 7, item_type: "castle_dungeon", question: "What color is the sky?", options: ["blue", "red", "green", "yellow"], correct_answer: "blue", extra_data: { answer_mode: "word_cards" } },
  { index: 8, item_type: "castle_dungeon", question: "Which is the biggest?", options: ["elephant", "cat", "mouse", "ant"], correct_answer: "elephant", extra_data: { answer_mode: "word_cards" } },
  { index: 9, item_type: "castle_dungeon", question: "What sound does a cow make?", options: ["moo", "woof", "meow", "oink"], correct_answer: "moo", extra_data: { answer_mode: "word_cards" } },
];

function Dungeon3Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get("studentId");
  const levelParam = searchParams.get("level");
  const areaParam = searchParams.get("area") as DeficitArea | null;
  const gameIdParam = searchParams.get("gameId");
  const recapParam = searchParams.get("recap");
  const checkpointId = searchParams.get("checkpointId");

  const [session, setSession] = useState<ExerciseSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameReady, setGameReady] = useState(false);
  const [resolvedArea, setResolvedArea] = useState<DeficitArea | null>(null);

  const recapGameIds = (recapParam || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const isRecapEligible = (gameType: string) =>
    !["castle_boss", "castle_dungeon", "castle_dungeon_3stage", "memory_recall"].includes(gameType);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const candidateIds: string[] = [];
        const checkpointNum = Number((checkpointId || "").replace(/\D/g, "")) || 0;
        if (recapGameIds.length > 0) {
          const picked = recapGameIds[checkpointNum % recapGameIds.length];
          candidateIds.push(picked, ...recapGameIds.filter((id) => id !== picked));
        }
        if (gameIdParam) {
          candidateIds.unshift(gameIdParam);
        }

        if (candidateIds.length === 0 && areaParam) {
          try {
            const areaGames = await api.getGamesByArea(areaParam);
            const eligible = areaGames.filter((g) => isRecapEligible(g.game_type));
            if (eligible[0]) candidateIds.push(eligible[0].id);
          } catch {
            // Area game lookup failed; we'll fallback below.
          }
        }

        if (candidateIds.length === 0) {
          candidateIds.push("dungeon_3stage");
        }

        const tried = new Set<string>();
        let started: ExerciseSession | null = null;
        for (const gid of candidateIds) {
          if (tried.has(gid)) continue;
          tried.add(gid);
          try {
            started = await api.startSession(studentId, gid);
            break;
          } catch {
            // try next candidate
          }
        }

        if (started) {
          setSession(started);
          setResolvedArea(areaParam || started.deficit_area);
        } else {
          setResolvedArea(areaParam);
        }
      } catch {
        setResolvedArea(areaParam);
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId, gameIdParam, areaParam, recapParam, checkpointId]);

  useEffect(() => {
    MusicManager.play("boss");
    return () => { MusicManager.stop(); };
  }, []);

  const handleReady = useCallback(() => setGameReady(true), []);

  const handleExit = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }, [router]);

  const handleVictory = useCallback(async () => {
    if (session) {
      try { await api.completeSession(session.id); } catch { /* */ }
    }
    if (studentId && areaParam && checkpointId) {
      markCastleCompleted(studentId, areaParam, checkpointId);
    }
  }, [session, studentId, areaParam, checkpointId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm font-semibold">Preparing the 3-Stage Dungeon...</p>
        </div>
      </div>
    );
  }

  const items = session ? session.items.slice(0, 10) : FALLBACK_ITEMS;
  const sessionId = session?.id || "test-session";
  const level = parseInt(levelParam || "0", 10);
  const worldTheme = resolvedArea ? DEFICIT_AREA_THEME[resolvedArea] : "cloud_kingdom";
  const dungeonMapNameByTheme: Record<string, string> = {
    grassland: "terrain",
    forest: "default",
    mountain: "best-so-far",
    sunset: "beach-map",
    night: "n",
    cloud_kingdom: "base-map",
  };
  const dungeonMapName = dungeonMapNameByTheme[worldTheme] || "terrain";

  const levelConfig = {
    worldTheme,
    bossType: "castle_dungeon_3stage",
    itemType: "multiple_choice",
    questionData: { question: "", options: [], itemType: "multiple_choice" },
    progress: 0,
    maxProgress: items.length,
    streak: 0,
    points: 0,
    level,
    dungeonMapName,
    dungeonTerrainPreset: worldTheme,
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <div className="w-full h-full">
        <PhaserCanvas levelConfig={levelConfig} onReady={handleReady} />
      </div>
      {gameReady && (
        <Dungeon3StageOverlay
          sessionId={sessionId}
          items={items}
          onExit={handleExit}
          onVictory={handleVictory}
        />
      )}
    </div>
  );
}

export default function Dungeon3Page() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <Dungeon3Content />
    </Suspense>
  );
}

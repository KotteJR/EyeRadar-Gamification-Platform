"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { MusicManager } from "@/lib/music-manager";
import { eventBus, GameEvents } from "@/lib/phaser/EventBus";
import type { ExerciseSession, ExerciseItem } from "@/types";
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

  const [session, setSession] = useState<ExerciseSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameReady, setGameReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (!studentId) {
      setUseFallback(true);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const s = await api.startSession(studentId, "castle_challenge");
        setSession(s);
      } catch {
        try {
          const s = await api.startSession(studentId, "sound_safari");
          setSession(s);
        } catch {
          setUseFallback(true);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

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
  }, [session]);

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

  const levelConfig = {
    worldTheme: "cloud_kingdom",
    bossType: "castle_dungeon_3stage",
    itemType: "multiple_choice",
    questionData: { question: "", options: [], itemType: "multiple_choice" },
    progress: 0,
    maxProgress: 10,
    streak: 0,
    points: 0,
    level,
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

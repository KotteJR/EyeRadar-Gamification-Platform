"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ExerciseItem, ExerciseItemResult } from "@/types";
import { X, BookOpen, Clock, Zap, Trophy } from "lucide-react";

interface MemoryMatchGameProps {
  item: ExerciseItem;
  lastResult: ExerciseItemResult | null;
  submitting: boolean;
  onSubmit: (answer?: string) => void;
  progress: number;
  maxProgress: number;
  points: number;
  onExit: () => void;
  onSwitchMode: () => void;
}

// Card face icons available — sorted by availability (PixelLab generated first)
const CARD_ICONS = [
  "sword", "shield", "potion-red", "coin", "crown",
  "key", "dragon", "gem-red", "wand",
  "axe", "helmet", "bow", "potion-blue", "scroll",
  "spellbook", "gem-blue", "gem-green", "ring", "phoenix", "unicorn",
];

// Emoji fallbacks for icons without PixelLab sprites
const ICON_EMOJI: Record<string, string> = {
  sword: "⚔️", shield: "🛡️", axe: "🪓", helmet: "⛑️", bow: "🏹",
  "potion-red": "🧪", "potion-blue": "🧴", wand: "✨", scroll: "📜", spellbook: "📖",
  "gem-red": "💎", "gem-blue": "🔷", "gem-green": "💚", coin: "🪙", crown: "👑",
  ring: "💍", key: "🗝️", dragon: "🐉", phoenix: "🔥", unicorn: "🦄",
};

interface Card {
  id: number;
  iconId: string;
  flipped: boolean;
  matched: boolean;
}

function CardFaceIcon({ iconId }: { iconId: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    // Fallback to emoji
    return (
      <span className="text-3xl select-none" role="img" aria-label={iconId}>
        {ICON_EMOJI[iconId] || iconId.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={`/game-assets/memory/cards/faces/${iconId}.png`}
      alt={iconId}
      className="w-3/4 h-3/4 object-contain pixelated"
      style={{ imageRendering: "pixelated" }}
      onError={() => setImgFailed(true)}
    />
  );
}

type GamePhase = "playing" | "checking" | "complete";

function createDeck(pairCount: number): Card[] {
  const icons = CARD_ICONS.slice(0, pairCount);
  const cards: Card[] = [];
  icons.forEach((icon) => {
    cards.push({ id: cards.length, iconId: icon, flipped: false, matched: false });
    cards.push({ id: cards.length, iconId: icon, flipped: false, matched: false });
  });
  // Shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
    cards[i].id = i;
    cards[j].id = j;
  }
  return cards;
}

export default function MemoryMatchGame({
  item,
  lastResult,
  submitting,
  onSubmit,
  progress,
  maxProgress,
  points,
  onExit,
  onSwitchMode,
}: MemoryMatchGameProps) {
  // Grid dimensions from extra_data or defaults
  const cols = (item.extra_data?.cols as number) || 5;
  const rows = (item.extra_data?.rows as number) || 4;
  const pairCount = Math.min((cols * rows) / 2, CARD_ICONS.length);

  const [cards, setCards] = useState<Card[]>(() => createDeck(pairCount));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [phase, setPhase] = useState<GamePhase>("playing");
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [score, setScore] = useState(points);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Reset on new item
  useEffect(() => {
    setCards(createDeck(pairCount));
    setFlipped([]);
    setPhase("playing");
    setMoves(0);
    setMatchedPairs(0);
    setElapsed(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.index]);

  // Check for match when 2 cards are flipped
  useEffect(() => {
    if (flipped.length !== 2) return;
    setPhase("checking");
    setMoves((m) => m + 1);

    const [a, b] = flipped;
    const cardA = cards[a];
    const cardB = cards[b];

    if (cardA.iconId === cardB.iconId) {
      // Match found
      checkTimeoutRef.current = setTimeout(() => {
        setCards((prev) =>
          prev.map((c) =>
            c.id === a || c.id === b ? { ...c, matched: true, flipped: true } : c
          )
        );
        setFlipped([]);
        setMatchedPairs((p) => {
          const newP = p + 1;
          if (newP >= pairCount) {
            // All pairs found — submit answer
            setPhase("complete");
            if (timerRef.current) clearInterval(timerRef.current);
            // Submit moves count as answer
            onSubmit(String(moves + 1));
          } else {
            setPhase("playing");
          }
          return newP;
        });
        setScore((s) => s + 10);
      }, 600);
    } else {
      // No match — flip back
      checkTimeoutRef.current = setTimeout(() => {
        setCards((prev) =>
          prev.map((c) =>
            c.id === a || c.id === b ? { ...c, flipped: false } : c
          )
        );
        setFlipped([]);
        setPhase("playing");
      }, 1000);
    }

    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  const handleCardClick = useCallback(
    (cardId: number) => {
      if (phase !== "playing") return;
      const card = cards[cardId];
      if (!card || card.flipped || card.matched) return;
      if (flipped.length >= 2) return;
      if (flipped.includes(cardId)) return;

      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, flipped: true } : c))
      );
      setFlipped((prev) => [...prev, cardId]);
    },
    [phase, cards, flipped]
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col">
      {/* Background — grass meadow with wooden table */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/game-assets/memory/backgrounds/grass-meadow.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          imageRendering: "pixelated",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400/20 via-transparent to-black/40" />

      {/* Top HUD */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <div className="flex gap-1.5">
          <button onClick={onExit} className="hud-ctrl-btn hud-ctrl-exit pointer-events-auto">
            <X size={11} strokeWidth={3} className="relative z-[1]" />
            <span className="relative z-[1]">Exit</span>
          </button>
          <button onClick={onSwitchMode} className="hud-ctrl-btn hud-ctrl-mode pointer-events-auto" title="Switch to classic mode">
            <BookOpen size={11} strokeWidth={2.5} className="relative z-[1]" />
            <span className="relative z-[1]">Classic</span>
          </button>
        </div>
        <div className="flex items-center gap-4 text-white font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>
          <span className="flex items-center gap-1 text-white/80 text-sm">
            <Clock size={14} /> {formatTime(elapsed)}
          </span>
          <span className="flex items-center gap-1 text-amber-300 text-sm">
            <Zap size={14} /> {moves} moves
          </span>
          <span className="flex items-center gap-1 text-emerald-300 text-sm">
            <Trophy size={14} /> {matchedPairs}/{pairCount}
          </span>
        </div>
      </div>

      {/* Title */}
      <div className="relative z-10 text-center mb-2">
        <h2
          className="text-xl font-bold text-white drop-shadow-lg"
          style={{ fontFamily: "'Fredoka', sans-serif", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
        >
          {phase === "complete" ? "All pairs found!" : "Find the matching pairs!"}
        </h2>
      </div>

      {/* Card grid on wooden table surface */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 pb-4">
        <div className="relative p-4 sm:p-6 rounded-xl" style={{
          background: "linear-gradient(180deg, #5a3e28 0%, #4a3220 50%, #3d2a1a 100%)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.3)",
          border: "3px solid #6b4c30",
          filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.4))",
        }}>
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            maxWidth: cols * 80,
          }}
        >
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={phase === "checking" || card.flipped || card.matched}
              className={`
                memory-card relative overflow-hidden
                w-14 h-18 sm:w-16 sm:h-20
                rounded-md transition-all duration-300
                ${card.matched ? "memory-card-matched" : ""}
                ${card.flipped || card.matched ? "memory-card-flipped" : "memory-card-face-down"}
                ${!card.flipped && !card.matched && phase === "playing" ? "cursor-pointer hover:scale-105 hover:brightness-110 active:scale-95" : ""}
              `}
              style={{ aspectRatio: "3/4", imageRendering: "pixelated" }}
            >
              {card.flipped || card.matched ? (
                // Card face — show icon
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-amber-100 to-amber-200 border-2 border-amber-600 rounded-md">
                  <CardFaceIcon iconId={card.iconId} />
                  {card.matched && (
                    <div className="absolute inset-0 bg-emerald-400/20 border-2 border-emerald-400 rounded-md" />
                  )}
                </div>
              ) : (
                // Card back
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-purple-800 to-purple-950 border-2 border-amber-600/50 rounded-md">
                  <img
                    src="/game-assets/memory/cards/backs/card-back.png"
                    alt="card"
                    className="w-full h-full object-contain pixelated"
                    style={{ imageRendering: "pixelated" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Completion overlay */}
      {phase === "complete" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="bg-gradient-to-b from-amber-900 to-amber-950 border-2 border-amber-500 rounded-xl p-8 text-center max-w-sm mx-4 shadow-2xl"
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            <h3 className="text-3xl font-bold text-amber-300 mb-4">Complete!</h3>
            <div className="space-y-2 text-white text-lg mb-6">
              <p><Clock size={16} className="inline mr-2" />Time: {formatTime(elapsed)}</p>
              <p><Zap size={16} className="inline mr-2" />Moves: {moves}</p>
              <p><Trophy size={16} className="inline mr-2" />Score: {score}</p>
            </div>
            {lastResult && (
              <p className={`text-lg font-bold ${lastResult.is_correct ? "text-emerald-400" : "text-red-400"}`}>
                {lastResult.is_correct ? `+${lastResult.points_earned} points!` : "Try again!"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

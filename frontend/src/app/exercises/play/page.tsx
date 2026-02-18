"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { UISounds } from "@/lib/ui-sounds";
import { MusicManager, type MusicTrack } from "@/lib/music-manager";
import MuteButton from "@/components/MuteButton";
import type { ExerciseSession, ExerciseItem, ExerciseItemResult } from "@/types";
import { DEFICIT_AREA_LABELS, DEFICIT_AREA_COLORS } from "@/types";
import ProgressBar from "@/components/ProgressBar";
import GameIcon from "@/components/GameIcon";
import { getGameAsset } from "@/lib/game-assets";
import { useGameMode } from "@/components/gamified/useGameMode";
import GameRenderer from "@/components/games/GameRenderer";
import dynamic from "next/dynamic";

const PhaserGame = dynamic(() => import("@/components/phaser/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-[#FF5A39] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60 text-sm font-semibold">Loading game engine...</p>
      </div>
    </div>
  ),
});
import {
  X,
  Check,
  ChevronLeft,
  Flame,
  Sparkles,
  Star,
  Trophy,
  RotateCcw,
  Gamepad2,
} from "lucide-react";

// =============================================================================
// CELEBRATION MODAL
// =============================================================================

function CelebrationModal({
  isOpen,
  accuracy,
  correct,
  total,
  points,
  badges,
  onReplay,
  onBack,
}: {
  isOpen: boolean;
  accuracy: number;
  correct: number;
  total: number;
  points: number;
  badges: string[];
  onReplay: () => void;
  onBack: () => void;
}) {
  if (!isOpen) return null;

  const grade = accuracy >= 90 ? "amazing" : accuracy >= 70 ? "great" : accuracy >= 50 ? "good" : "keep_going";
  const titles = { amazing: "Amazing Job!", great: "Great Work!", good: "Good Effort!", keep_going: "Keep Trying!" };
  const colors = { amazing: "#34D399", great: "#5EB8FB", good: "#FBBF24", keep_going: "#FF5A39" };
  const icons = { amazing: Star, great: Trophy, good: Sparkles, keep_going: Flame };
  const Icon = icons[grade];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center animate-bounce-in">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: `${colors[grade]}15` }}
        >
          <Icon size={40} style={{ color: colors[grade] }} strokeWidth={2} />
        </div>

        <h2 className="font-bold text-2xl text-gray-900 mb-1" style={{ fontFamily: "'Fredoka', sans-serif" }}>
          {titles[grade]}
        </h2>
        <p className="text-gray-400 text-sm font-medium mb-6">Session Complete</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 bg-gray-50 rounded-2xl">
            <p className="text-2xl font-bold text-gray-900">{correct}/{total}</p>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Correct</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-2xl">
            <p className="text-2xl font-bold text-gray-900">{Math.round(accuracy)}%</p>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Accuracy</p>
          </div>
          <div className="p-3 rounded-2xl" style={{ backgroundColor: `${colors[grade]}08` }}>
            <p className="text-2xl font-bold" style={{ color: colors[grade] }}>+{points}</p>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Points</p>
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="bg-amber-50 rounded-2xl p-3 mb-5">
            <p className="text-xs font-bold text-amber-700 mb-2">New Badges Earned!</p>
            <div className="flex justify-center gap-2 flex-wrap">
              {badges.map((b) => (
                <span key={b} className="px-3 py-1 bg-amber-100 text-amber-800 text-xs rounded-full font-bold">
                  {b.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => { UISounds.click(); onBack(); }}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 text-sm font-bold rounded-2xl hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <button
            onClick={() => { UISounds.start(); onReplay(); }}
            className="flex-1 btn-kids px-5 py-3 text-sm bg-gradient-to-r from-[#FF5A39] to-[#FF9E75] text-white min-h-0"
          >
            <RotateCcw size={16} />
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// RESULT FEEDBACK TOAST
// =============================================================================

function ResultFeedback({ result }: { result: ExerciseItemResult }) {
  return (
    <div
      className={`mt-4 p-4 rounded-2xl text-center border-2 animate-pop ${
        result.is_correct
          ? "bg-emerald-50 border-emerald-200"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        {result.is_correct ? (
          <Check size={20} className="text-emerald-600" strokeWidth={3} />
        ) : (
          <X size={20} className="text-amber-600" strokeWidth={3} />
        )}
        <p
          className={`text-base font-bold ${
            result.is_correct ? "text-emerald-700" : "text-amber-700"
          }`}
        >
          {result.is_correct ? `Correct! +${result.points_earned} points` : "Not quite!"}
        </p>
      </div>
      {!result.is_correct && (
        <p className="text-sm text-amber-600 font-medium">
          The answer is: <strong>{result.correct_answer}</strong>
        </p>
      )}
    </div>
  );
}

// =============================================================================
// MAIN PLAY PAGE
// =============================================================================

function ExercisePlayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get("studentId");
  const gameId = searchParams.get("gameId");
  const { mode, setMode } = useGameMode();

  const [session, setSession] = useState<ExerciseSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [lastResult, setLastResult] = useState<ExerciseItemResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [textInput, setTextInput] = useState("");
  const [pointsPopup, setPointsPopup] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);

  const startSession = useCallback(async () => {
    if (!studentId || !gameId) {
      setError("Missing student or game ID");
      setLoading(false);
      return;
    }
    try {
      const s = await api.startSession(studentId, gameId);
      setSession(s);
      setStartTime(Date.now());
      setStreak(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setLoading(false);
    }
  }, [studentId, gameId]);

  useEffect(() => { startSession(); }, [startSession]);

  // Start music based on game type — memory games get memory.mp3, everything else gets boss track
  useEffect(() => {
    if (!session || session.items.length === 0) return;
    const firstType = session.items[0].item_type;
    const MEMORY_TYPES = ["grid_memory", "pattern_match", "sequence_tap", "tracking", "dual_task", "memory_recall"];
    const track: MusicTrack = MEMORY_TYPES.includes(firstType) ? "memory" : "boss";
    MusicManager.play(track);
    return () => { MusicManager.stop(); };
  }, [session]);

  const bossKilledRef = useRef(false);

  const handleSubmit = async (answer?: string) => {
    if (!session) return;
    const finalAnswer = answer || selectedAnswer || textInput;
    if (!finalAnswer) return;

    setSubmitting(true);
    const responseTime = Date.now() - startTime;

    try {
      const result = await api.submitAnswer(session.id, currentIndex, finalAnswer, responseTime);
      setLastResult(result);

      if (result.is_correct) {
        UISounds.correct();
        setStreak(prev => prev + 1);
        setPointsPopup(result.points_earned);
        setTimeout(() => setPointsPopup(null), 1000);
      } else {
        UISounds.wrong();
        setStreak(0);
      }

      const delay = 1500;
      setTimeout(() => {
        if (bossKilledRef.current) return;

        if (currentIndex < session.items.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else if (mode === "phaser") {
          setCurrentIndex(0);
        } else {
          completeSession();
        }
        setSelectedAnswer("");
        setTextInput("");
        setLastResult(null);
        setStartTime(Date.now());
        setSubmitting(false);
      }, delay);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  const completingRef = useRef(false);
  const completeSession = async () => {
    if (!session || completingRef.current) return;
    completingRef.current = true;
    try {
      const result = await api.completeSession(session.id);
      setSession(result);
      setCompleted(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplay = () => {
    completingRef.current = false;
    bossKilledRef.current = false;
    setCompleted(false);
    setCurrentIndex(0);
    setSelectedAnswer("");
    setTextInput("");
    setLastResult(null);
    setLoading(true);
    startSession();
  };

  if (loading) {
    return (
      <div className="student-ui flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[#FF5A39] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-400 font-semibold">Preparing your exercise...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-ui flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
            <X size={28} className="text-red-400" />
          </div>
          <p className="text-red-500 mb-4 font-bold">{error}</p>
          <button onClick={() => router.back()} className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const currentItem = session.items[currentIndex];
  const areaColor = DEFICIT_AREA_COLORS[session.deficit_area] || "#6366f1";
  const areaLabel = DEFICIT_AREA_LABELS[session.deficit_area] || session.deficit_area;
  const asset = getGameAsset(session.game_id);

  // ─── Completed: Show Celebration ──────────────────────
  if (completed) {
    return (
      <div className="student-ui">
        <CelebrationModal
          isOpen
          accuracy={session.accuracy * 100}
          correct={session.correct_count}
          total={session.total_items}
          points={session.points_earned}
          badges={session.badges_earned}
          onReplay={handleReplay}
          onBack={() => router.back()}
        />
      </div>
    );
  }

  // ─── PHASER ENGINE MODE ─────────────────────────────────
  if (mode === "phaser") {
    return (
      <PhaserGame
        item={currentItem}
        lastResult={lastResult}
        submitting={submitting}
        selectedAnswer={selectedAnswer}
        textInput={textInput}
        onSelectAnswer={setSelectedAnswer}
        onTextInput={setTextInput}
        onSubmit={handleSubmit}
        maxProgress={session.items.length}
        streak={streak}
        points={session.points_earned}
        deficitArea={session.deficit_area}
        onExit={() => router.back()}
        onSwitchMode={() => setMode("classic")}
        onBossKilled={() => {
          bossKilledRef.current = true;
          completeSession();
        }}
        onGameOver={handleReplay}
        onBackToWorld={() => router.push("/student/map")}
      />
    );
  }

  // ─── CLASSIC Playing View ─────────────────────────────
  return (
    <div className="student-ui max-w-3xl mx-auto">
      {/* Session Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl"
              style={{ backgroundColor: `${areaColor}12`, color: areaColor }}
            >
              <GameIcon name={asset.icon} size={13} strokeWidth={2} />
              {areaLabel}
            </span>
            <span className="text-xs text-gray-400 font-semibold">Lv. {session.difficulty_level}</span>
            {Boolean(currentItem?.extra_data?.ai_generated) && (
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-xl bg-purple-50 text-purple-600">
                <Sparkles size={11} />
                AI
              </span>
            )}
            {streak >= 3 && (
              <span className="flex items-center gap-1 text-xs font-bold text-orange-500 animate-pulse">
                <Flame size={13} fill="currentColor" />
                {streak} streak!
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{session.game_name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <MuteButton />
          {/* Phaser game mode toggle */}
          <button
            onClick={() => setMode("phaser")}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full hover:from-purple-600 hover:to-pink-600 transition-all shadow-md"
            title="Switch to adventure mode"
          >
            <Gamepad2 size={14} />
            Adventure
          </button>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 font-semibold transition-colors"
          >
            <X size={16} />
            Exit
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-5">
        <ProgressBar
          value={currentIndex + 1}
          max={session.items.length}
          label={`${currentIndex + 1} of ${session.items.length}`}
          color={areaColor}
        />
      </div>

      {/* Points Popup */}
      {pointsPopup !== null && (
        <div className="fixed top-20 right-8 z-50 animate-bounce">
          <div className="flex items-center gap-1.5 bg-emerald-500 text-white px-4 py-2 rounded-2xl text-lg font-bold shadow-lg">
            <Star size={18} fill="currentColor" />
            +{pointsPopup} pts
          </div>
        </div>
      )}

      {/* Game Renderer */}
      <GameRenderer
        item={currentItem}
        lastResult={lastResult}
        submitting={submitting}
        selectedAnswer={selectedAnswer}
        textInput={textInput}
        areaColor={areaColor}
        onSelectAnswer={setSelectedAnswer}
        onTextInput={setTextInput}
        onSubmit={handleSubmit}
      />

      {/* Result Feedback */}
      {lastResult && <ResultFeedback result={lastResult} />}
    </div>
  );
}
// =============================================================================
// MAIN EXPORT
// =============================================================================

export default function ExercisePlayPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-3 border-[#FF5A39] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ExercisePlayContent />
    </Suspense>
  );
}

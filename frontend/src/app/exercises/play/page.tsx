"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ExerciseSession, ExerciseItem, ExerciseItemResult } from "@/types";
import { DEFICIT_AREA_LABELS, DEFICIT_AREA_COLORS } from "@/types";
import ProgressBar from "@/components/ProgressBar";
import GameIcon from "@/components/GameIcon";
import { getGameAsset } from "@/lib/game-assets";
import GamifiedRenderer from "@/components/gamified/GamifiedRenderer";
import { useGameMode } from "@/components/gamified/useGameMode";
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
  ArrowRight,
  Clock,
  Lightbulb,
  Play,
  Volume2,
  Gamepad2,
  BookOpen,
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
            onClick={onBack}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 text-sm font-bold rounded-2xl hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <button
            onClick={onReplay}
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
  const { mode, gamifiedMode, toggleGameMode, setMode } = useGameMode();

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
        setStreak(prev => prev + 1);
        setPointsPopup(result.points_earned);
        setTimeout(() => setPointsPopup(null), 1000);
      } else {
        setStreak(0);
      }

      // In Phaser mode, give extra time for kill sequence animation on last question
      const isLastQuestion = currentIndex >= session.items.length - 1;
      const delay = mode === "phaser" && isLastQuestion && result.is_correct ? 4000 : 1500;
      setTimeout(() => {
        if (currentIndex < session.items.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setSelectedAnswer("");
          setTextInput("");
          setLastResult(null);
          setStartTime(Date.now());
        } else {
          completeSession();
        }
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
        progress={currentIndex}
        maxProgress={session.items.length}
        streak={streak}
        points={session.points_earned}
        deficitArea={session.deficit_area}
        onExit={() => router.back()}
        onSwitchMode={() => setMode("classic")}
        onGameComplete={completeSession}
      />
    );
  }

  // ─── GAMIFIED MODE (legacy React/CSS) ──────────────────
  if (mode === "gamified") {
    return (
      <div className="fixed inset-0 z-[100] bg-black">
        {/* Floating mode toggle & exit */}
        <div className="fixed top-3 left-3 z-[200] flex gap-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 px-3 py-2 bg-black/40 backdrop-blur-sm text-white text-xs font-bold rounded-full hover:bg-black/50 transition-colors"
          >
            <X size={14} />
            Exit
          </button>
          <button
            onClick={() => setMode("phaser")}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full hover:bg-white/30 transition-colors"
            title="Switch to Phaser mode"
          >
            <Gamepad2 size={14} />
            Phaser
          </button>
          <button
            onClick={() => setMode("classic")}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full hover:bg-white/30 transition-colors"
            title="Switch to classic mode"
          >
            <BookOpen size={14} />
            Classic
          </button>
        </div>

        {/* Points Popup */}
        {pointsPopup !== null && (
          <div className="fixed top-16 right-6 z-[200] animate-float-up">
            <div className="flex items-center gap-1.5 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-2xl text-lg font-bold shadow-lg">
              <Star size={18} fill="currentColor" />
              +{pointsPopup}
            </div>
          </div>
        )}

        {/* Gamified Game View — fills entire screen */}
        <div className="w-full h-full">
          <GamifiedRenderer
            item={currentItem}
            lastResult={lastResult}
            submitting={submitting}
            selectedAnswer={selectedAnswer}
            textInput={textInput}
            onSelectAnswer={setSelectedAnswer}
            onTextInput={setTextInput}
            onSubmit={handleSubmit}
            progress={currentIndex}
            maxProgress={session.items.length}
            streak={streak}
            points={session.points_earned}
            deficitArea={session.deficit_area}
          />
        </div>
      </div>
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
// GAME RENDERER
// =============================================================================

interface GameRendererProps {
  item: ExerciseItem;
  lastResult: ExerciseItemResult | null;
  submitting: boolean;
  selectedAnswer: string;
  textInput: string;
  areaColor: string;
  onSelectAnswer: (answer: string) => void;
  onTextInput: (text: string) => void;
  onSubmit: (answer?: string) => void;
}

function GameRenderer(props: GameRendererProps) {
  const { item } = props;
  switch (item.item_type) {
    case "grid_memory": return <GridMemoryGame {...props} />;
    case "sequence_tap": return <SequenceTapGame {...props} />;
    case "speed_round": return <SpeedRoundGame {...props} />;
    case "sorting": return <SortingGame {...props} />;
    case "spot_target": return <SpotTargetGame {...props} />;
    case "timed_reading": return <TimedReadingGame {...props} />;
    case "word_building": return <WordBuildingGame {...props} />;
    case "fill_blank": return <FillBlankGame {...props} />;
    case "tracking": return <TrackingGame {...props} />;
    case "pattern_match": return <PatternMatchGame {...props} />;
    case "dual_task": return <DualTaskGame {...props} />;
    case "text_input": return <TextInputGame {...props} />;
    case "multiple_choice":
    default: return <MultipleChoiceGame {...props} />;
  }
}

// =============================================================================
// SUBMIT BUTTON (reusable)
// =============================================================================

function SubmitButton({
  onClick,
  disabled,
  submitting,
  label = "Submit Answer",
}: {
  onClick: () => void;
  disabled: boolean;
  submitting: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full mt-5 py-3.5 btn-kids bg-gradient-to-r from-[#FF5A39] to-[#FF9E75] text-white text-base disabled:opacity-40 min-h-[52px]"
    >
      {submitting ? (
        <span className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Checking...
        </span>
      ) : label}
    </button>
  );
}

// =============================================================================
// ANSWER OPTION (reusable for MC-style games)
// =============================================================================

function AnswerOption({
  option,
  index,
  isSelected,
  isCorrectAnswer,
  isWrongSelection,
  showResult,
  disabled,
  areaColor,
  onClick,
}: {
  option: string;
  index: number;
  isSelected: boolean;
  isCorrectAnswer: boolean;
  isWrongSelection: boolean;
  showResult: boolean;
  disabled: boolean;
  areaColor: string;
  onClick: () => void;
}) {
  let borderColor = "border-gray-100";
  let bgColor = "bg-white";
  if (showResult && isCorrectAnswer) { borderColor = "border-emerald-400"; bgColor = "bg-emerald-50"; }
  else if (showResult && isWrongSelection) { borderColor = "border-red-400"; bgColor = "bg-red-50 animate-shake"; }
  else if (isSelected) { borderColor = "border-[#475093]"; bgColor = "bg-[#475093]/[0.04]"; }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${borderColor} ${bgColor} ${
        !disabled ? "hover:border-[#475093]/40 active:scale-[0.99]" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{
            borderWidth: 2,
            borderColor: isSelected ? areaColor : "#E5E7EB",
            color: isSelected ? areaColor : "#9CA3AF",
            backgroundColor: isSelected ? `${areaColor}08` : "transparent",
          }}
        >
          {String.fromCharCode(65 + index)}
        </span>
        <span className="text-sm font-semibold text-gray-700">{option}</span>
        {showResult && isCorrectAnswer && <Check size={20} className="ml-auto text-emerald-500" strokeWidth={3} />}
        {showResult && isWrongSelection && <X size={20} className="ml-auto text-red-500" strokeWidth={3} />}
      </div>
    </button>
  );
}

// =============================================================================
// HINT COMPONENT
// =============================================================================

function HintSection({ hint }: { hint?: string }) {
  if (!hint) return null;
  return (
    <details className="mt-4">
      <summary className="flex items-center gap-1.5 text-sm text-[#475093] cursor-pointer hover:text-[#303FAE] font-semibold">
        <Lightbulb size={14} />
        Need a hint?
      </summary>
      <p className="text-sm text-gray-500 mt-2 p-3 bg-[#475093]/[0.04] rounded-xl font-medium">{hint}</p>
    </details>
  );
}

// =============================================================================
// MULTIPLE CHOICE GAME
// =============================================================================

function MultipleChoiceGame({ item, lastResult, submitting, selectedAnswer, areaColor, onSelectAnswer, onSubmit }: GameRendererProps) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
      <p className="text-lg text-gray-900 mb-5 leading-relaxed whitespace-pre-line font-semibold">{item.question}</p>
      <div className="space-y-2.5">
        {item.options.map((option, idx) => (
          <AnswerOption
            key={idx}
            option={option}
            index={idx}
            isSelected={selectedAnswer === option}
            isCorrectAnswer={lastResult !== null && option === lastResult.correct_answer}
            isWrongSelection={lastResult !== null && selectedAnswer === option && !lastResult.is_correct}
            showResult={lastResult !== null}
            disabled={submitting || lastResult !== null}
            areaColor={areaColor}
            onClick={() => { if (!submitting && !lastResult) onSelectAnswer(option); }}
          />
        ))}
      </div>
      <HintSection hint={item.hint} />
      {!lastResult && (
        <SubmitButton onClick={() => onSubmit()} disabled={submitting || !selectedAnswer} submitting={submitting} />
      )}
    </div>
  );
}

// =============================================================================
// GRID MEMORY GAME
// =============================================================================

function GridMemoryGame({ item, lastResult, submitting, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as { grid_size: number; pattern: number[]; cells_to_remember: number; show_duration_seconds: number };
  const gridSize = extra.grid_size || 4;
  const pattern = extra.pattern || [];
  const showDuration = (extra.show_duration_seconds || 3) * 1000;

  const [phase, setPhase] = useState<"showing" | "playing">("showing");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    setPhase("showing");
    setSelected(new Set());
    const timer = setTimeout(() => setPhase("playing"), showDuration);
    return () => clearTimeout(timer);
  }, [item.index, showDuration]);

  const toggleCell = (idx: number) => {
    if (phase !== "playing" || lastResult || submitting) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const total = gridSize * gridSize;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
      <div className="text-center mb-4">
        <p className="text-lg font-bold text-gray-900">
          {phase === "showing" ? "Memorize the pattern!" : "Tap the squares to recreate it!"}
        </p>
        {phase === "showing" && (
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#FF5A39] rounded-full animate-shrink" style={{ animationDuration: `${showDuration}ms` }} />
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`, maxWidth: `${gridSize * 56}px` }}>
          {Array.from({ length: total }, (_, idx) => {
            const isPattern = pattern.includes(idx);
            const isSelected = selected.has(idx);
            const showResult = lastResult !== null;
            const isCorrect = showResult && isPattern && isSelected;
            const isMissed = showResult && isPattern && !isSelected;
            const isWrong = showResult && !isPattern && isSelected;

            let bg = "bg-gray-100 hover:bg-gray-200";
            if (phase === "showing" && isPattern) bg = "bg-[#FF5A39]";
            else if (isCorrect) bg = "bg-emerald-400";
            else if (isMissed) bg = "bg-amber-300";
            else if (isWrong) bg = "bg-red-300";
            else if (isSelected) bg = "bg-[#475093]";

            return (
              <button
                key={idx}
                onClick={() => toggleCell(idx)}
                disabled={phase === "showing" || !!lastResult || submitting}
                className={`w-12 h-12 rounded-xl transition-all ${bg} ${phase === "playing" && !lastResult ? "cursor-pointer active:scale-95" : ""}`}
              />
            );
          })}
        </div>
      </div>

      {phase === "playing" && !lastResult && (
        <SubmitButton
          onClick={() => onSubmit(Array.from(selected).sort((a, b) => a - b).join(","))}
          disabled={submitting || selected.size === 0}
          submitting={submitting}
          label={`Check Pattern (${selected.size} selected)`}
        />
      )}
    </div>
  );
}

// =============================================================================
// SEQUENCE TAP GAME
// =============================================================================

function SequenceTapGame({ item, lastResult, submitting, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as { sequence?: number[]; show_duration_seconds?: number; tap_mode?: string; syllable_count?: number; max_taps?: number; available_numbers?: number[]; word?: string };
  const tapMode = extra.tap_mode || "repeat";

  if (tapMode === "count") {
    return <TapCountGame item={item} extra={extra} lastResult={lastResult} submitting={submitting} onSubmit={onSubmit} />;
  }
  return <TapRepeatGame item={item} extra={extra} lastResult={lastResult} submitting={submitting} onSubmit={onSubmit} />;
}

function TapCountGame({ item, extra, lastResult, submitting, onSubmit }: { item: ExerciseItem; extra: Record<string, unknown>; lastResult: ExerciseItemResult | null; submitting: boolean; onSubmit: (a?: string) => void }) {
  const [tapCount, setTapCount] = useState(0);
  const maxTaps = (extra.max_taps as number) || 6;

  useEffect(() => { setTapCount(0); }, [item.index]);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm text-center">
      <p className="text-lg font-bold text-gray-900 mb-2">{item.question}</p>
      <p className="text-4xl font-bold text-[#475093] mb-6">{extra.word as string}</p>

      <div className="flex justify-center gap-2 mb-4">
        {Array.from({ length: maxTaps }, (_, i) => (
          <div key={i} className={`w-10 h-10 rounded-full transition-all ${i < tapCount ? "bg-[#FF5A39] scale-110" : "bg-gray-200"}`} />
        ))}
      </div>

      <p className="text-2xl font-bold text-gray-700 mb-4">{tapCount} {tapCount === 1 ? "beat" : "beats"}</p>

      <div className="flex gap-3 justify-center">
        <button
          onClick={() => !lastResult && !submitting && setTapCount(prev => Math.min(prev + 1, maxTaps))}
          disabled={!!lastResult || submitting}
          className="btn-kids px-8 py-4 bg-[#475093]/[0.06] text-[#303FAE] text-lg disabled:opacity-40 min-h-0"
        >
          <Volume2 size={20} className="inline mr-2" />
          TAP!
        </button>
        <button
          onClick={() => !lastResult && !submitting && setTapCount(prev => Math.max(0, prev - 1))}
          disabled={!!lastResult || submitting || tapCount === 0}
          className="px-4 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 disabled:opacity-40"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {!lastResult && (
        <SubmitButton onClick={() => onSubmit(String(tapCount))} disabled={submitting || tapCount === 0} submitting={submitting} />
      )}
    </div>
  );
}

function TapRepeatGame({ item, extra, lastResult, submitting, onSubmit }: { item: ExerciseItem; extra: Record<string, unknown>; lastResult: ExerciseItemResult | null; submitting: boolean; onSubmit: (a?: string) => void }) {
  const sequence = (extra.sequence as number[]) || [];
  const showDuration = ((extra.show_duration_seconds as number) || 3) * 1000;
  const [phase, setPhase] = useState<"showing" | "playing">("showing");
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [tapped, setTapped] = useState<number[]>([]);

  useEffect(() => {
    setPhase("showing");
    setTapped([]);
    sequence.forEach((_, idx) => {
      setTimeout(() => setHighlightIdx(idx), idx * 600);
      setTimeout(() => setHighlightIdx(-1), idx * 600 + 400);
    });
    setTimeout(() => setPhase("playing"), showDuration);
  }, [item.index]);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm text-center">
      <p className="text-lg font-bold text-gray-900 mb-4">
        {phase === "showing" ? "Watch the sequence!" : "Now tap the numbers in order!"}
      </p>

      {phase === "showing" && (
        <div className="flex justify-center gap-2 mb-4">
          {sequence.map((num, idx) => (
            <div key={idx} className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${idx === highlightIdx ? "bg-[#FF5A39] text-white scale-110" : "bg-gray-100 text-gray-300"}`}>
              {idx === highlightIdx ? num : "?"}
            </div>
          ))}
        </div>
      )}

      {phase === "playing" && (
        <>
          <div className="flex justify-center gap-2 mb-4 min-h-[56px]">
            {tapped.map((num, idx) => (
              <div key={idx} className="w-12 h-12 rounded-xl bg-[#FF5A39] text-white flex items-center justify-center text-xl font-bold">{num}</div>
            ))}
            {Array.from({ length: sequence.length - tapped.length }, (_, i) => (
              <div key={`e-${i}`} className="w-12 h-12 rounded-xl border-2 border-dashed border-gray-300" />
            ))}
          </div>

          <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button key={num} onClick={() => phase === "playing" && !lastResult && !submitting && setTapped(prev => [...prev, num])} disabled={!!lastResult || submitting}
                className="w-12 h-12 rounded-xl bg-gray-100 text-gray-700 font-bold text-lg hover:bg-[#475093]/[0.06] active:scale-95 transition-all disabled:opacity-40">
                {num}
              </button>
            ))}
            <button onClick={() => setTapped(prev => prev.slice(0, -1))} disabled={!!lastResult || submitting || tapped.length === 0}
              className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 font-bold hover:bg-amber-200 disabled:opacity-40 flex items-center justify-center">
              <RotateCcw size={16} />
            </button>
          </div>

          {!lastResult && (
            <SubmitButton onClick={() => onSubmit(tapped.join(","))} disabled={submitting || tapped.length !== sequence.length} submitting={submitting} label="Submit Sequence" />
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// SPEED ROUND GAME
// =============================================================================

function SpeedRoundGame({ item, lastResult, submitting, selectedAnswer, areaColor, onSelectAnswer, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as { time_limit_seconds?: number; display_emoji?: string; display_item?: string };
  const timeLimit = (extra.time_limit_seconds || 8) * 1000;
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTimeLeft(timeLimit);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (!lastResult && !submitting) onSubmit("__timeout__");
          return 0;
        }
        return prev - 100;
      });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [item.index]);

  useEffect(() => {
    if (lastResult && timerRef.current) clearInterval(timerRef.current);
  }, [lastResult]);

  const progress = (timeLeft / timeLimit) * 100;
  const isUrgent = progress < 30;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
      {/* Timer bar */}
      <div className="mb-4">
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-100 ${isUrgent ? "bg-red-500" : "bg-[#FF5A39]"}`} style={{ width: `${progress}%` }} />
        </div>
        <p className={`flex items-center gap-1 text-xs mt-1 text-right font-bold ${isUrgent ? "text-red-500" : "text-gray-400"}`}>
          <Clock size={12} /> {Math.ceil(timeLeft / 1000)}s
        </p>
      </div>

      <p className="text-lg text-gray-900 mb-4 text-center font-bold">{item.question}</p>

      <div className="grid grid-cols-2 gap-3">
        {item.options.map((option, idx) => {
          const isSelected = selectedAnswer === option;
          const showResult = lastResult !== null;
          const isCorrectAnswer = showResult && option === lastResult.correct_answer;
          const isWrongSelection = showResult && isSelected && !lastResult.is_correct;

          let bg = "bg-gray-50 border-gray-100 hover:bg-[#475093]/[0.04] hover:border-[#475093]/30";
          if (showResult && isCorrectAnswer) bg = "bg-emerald-50 border-emerald-400";
          else if (showResult && isWrongSelection) bg = "bg-red-50 border-red-400";
          else if (isSelected) bg = "bg-[#475093]/[0.04] border-[#475093]";

          return (
            <button key={idx} onClick={() => { if (!submitting && !showResult) { onSelectAnswer(option); onSubmit(option); } }} disabled={submitting || showResult}
              className={`p-4 rounded-2xl border-2 text-center font-bold text-gray-700 transition-all active:scale-95 ${bg}`}>
              {option}
              {showResult && isCorrectAnswer && <Check size={16} className="inline ml-2 text-emerald-500" />}
              {showResult && isWrongSelection && <X size={16} className="inline ml-2 text-red-500" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// SORTING GAME
// =============================================================================

function SortingGame({ item, lastResult, submitting, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as { events: string[]; correct_order: string[]; num_events: number };
  const events = extra.events || [];
  const [ordered, setOrdered] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<string[]>([]);

  useEffect(() => {
    setOrdered([]);
    setRemaining([...events]);
  }, [item.index]);

  const selectEvent = (event: string) => {
    if (lastResult || submitting) return;
    setOrdered(prev => {
      const next = [...prev, event];
      setRemaining(events.filter((e, idx) => {
        const usedCount = next.filter(o => o === e).length;
        const totalCount = events.slice(0, idx + 1).filter(o => o === e).length;
        return totalCount > usedCount;
      }));
      return next;
    });
  };

  const undoLast = () => {
    if (ordered.length === 0 || lastResult || submitting) return;
    setOrdered(prev => {
      const next = prev.slice(0, -1);
      setRemaining(events.filter(e => !next.includes(e)));
      return next;
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
      <p className="text-lg font-bold text-gray-900 mb-4">{item.question}</p>

      <div className="mb-4 min-h-[60px]">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">Your order:</p>
        <div className="space-y-2">
          {ordered.map((event, idx) => (
            <div key={idx} className="flex items-center gap-2 p-3 bg-[#475093]/[0.04] border border-[#475093]/20 rounded-2xl">
              <span className="w-7 h-7 rounded-lg bg-[#FF5A39] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</span>
              <span className="text-sm font-semibold text-gray-700">{event}</span>
            </div>
          ))}
        </div>
        {ordered.length > 0 && !lastResult && (
          <button onClick={undoLast} className="flex items-center gap-1 mt-2 text-sm text-gray-500 hover:text-gray-700 font-semibold">
            <RotateCcw size={13} /> Undo last
          </button>
        )}
      </div>

      {remaining.length > 0 && !lastResult && (
        <div>
          <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">Tap to add next:</p>
          <div className="space-y-2">
            {remaining.map((event, idx) => (
              <button key={idx} onClick={() => selectEvent(event)} disabled={!!lastResult || submitting}
                className="w-full text-left p-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-[#475093]/[0.04] hover:border-[#475093]/20 transition-all active:scale-[0.98]">
                <span className="text-sm font-semibold text-gray-700">{event}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!lastResult && remaining.length === 0 && (
        <SubmitButton onClick={() => onSubmit(ordered.join("|"))} disabled={submitting} submitting={submitting} label="Submit Order" />
      )}
    </div>
  );
}

// =============================================================================
// SPOT TARGET GAME
// =============================================================================

function SpotTargetGame({ item, lastResult, submitting, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as { target: string; grid: string[]; grid_cols: number; grid_rows: number; target_positions: number[]; target_count: number };
  const grid = extra.grid || [];
  const cols = extra.grid_cols || 5;
  const targetPositions = extra.target_positions || [];
  const [tapped, setTapped] = useState<Set<number>>(new Set());

  useEffect(() => { setTapped(new Set()); }, [item.index]);

  const toggleCell = (idx: number) => {
    if (lastResult || submitting) return;
    setTapped(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm text-center">
      <p className="text-lg font-bold text-gray-900 mb-4">{item.question}</p>

      <div className="flex justify-center mb-4">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxWidth: `${cols * 52}px` }}>
          {grid.map((letter, idx) => {
            const isTapped = tapped.has(idx);
            const showResult = lastResult !== null;
            const isTarget = targetPositions.includes(idx);
            const isCorrectTap = showResult && isTarget && isTapped;
            const isMissed = showResult && isTarget && !isTapped;
            const isWrongTap = showResult && !isTarget && isTapped;

            let bg = "bg-gray-100 hover:bg-gray-200 text-gray-700";
            if (isCorrectTap) bg = "bg-emerald-400 text-white";
            else if (isMissed) bg = "bg-amber-300 text-amber-900";
            else if (isWrongTap) bg = "bg-red-300 text-red-900";
            else if (isTapped) bg = "bg-[#475093] text-white";

            return (
              <button key={idx} onClick={() => toggleCell(idx)} disabled={!!lastResult || submitting}
                className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold transition-all active:scale-90 ${bg}`}>
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-gray-500 font-semibold mb-3">{tapped.size} of {extra.target_count} found</p>

      {!lastResult && (
        <SubmitButton onClick={() => onSubmit(Array.from(tapped).sort((a, b) => a - b).join(","))} disabled={submitting || tapped.size === 0} submitting={submitting} label="Check!" />
      )}
    </div>
  );
}

// =============================================================================
// TIMED READING GAME
// =============================================================================

function TimedReadingGame({ item, lastResult, submitting, selectedAnswer, onSelectAnswer, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as { passage: string; reading_time_seconds: number; passage_visible_during_questions: boolean };
  const passage = extra.passage || "";
  const readingTime = (extra.reading_time_seconds || 10) * 1000;
  const staysVisible = extra.passage_visible_during_questions;

  const [phase, setPhase] = useState<"reading" | "answering">("reading");
  const [timeLeft, setTimeLeft] = useState(readingTime);

  useEffect(() => {
    setPhase("reading");
    setTimeLeft(readingTime);
    const timer = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 100) { clearInterval(timer); setPhase("answering"); return 0; } return prev - 100; });
    }, 100);
    return () => clearInterval(timer);
  }, [item.index, readingTime]);

  if (phase === "reading") {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <div className="mb-4">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#FF5A39] rounded-full transition-all duration-100" style={{ width: `${(timeLeft / readingTime) * 100}%` }} />
          </div>
          <p className="flex items-center gap-1 text-xs text-gray-400 mt-1 text-right font-bold"><Clock size={12} /> {Math.ceil(timeLeft / 1000)}s to read</p>
        </div>
        <p className="text-lg text-gray-900 leading-relaxed mb-6 font-medium">{passage}</p>
        <button onClick={() => setPhase("answering")} className="w-full py-3 bg-gray-100 text-gray-700 text-sm font-bold rounded-2xl hover:bg-gray-200 flex items-center justify-center gap-2">
          Ready! Show questions <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
      {staysVisible && <div className="p-4 bg-gray-50 rounded-2xl mb-4 text-sm text-gray-700 leading-relaxed italic font-medium">{passage}</div>}
      <p className="text-lg text-gray-900 mb-4 font-bold">{item.question}</p>
      <div className="space-y-2.5">
        {item.options.map((option, idx) => {
          const isSelected = selectedAnswer === option;
          const showResult = lastResult !== null;
          return (
            <AnswerOption key={idx} option={option} index={idx} isSelected={isSelected}
              isCorrectAnswer={showResult && option === lastResult.correct_answer}
              isWrongSelection={showResult && isSelected && !lastResult.is_correct}
              showResult={showResult} disabled={submitting || showResult} areaColor="#475093"
              onClick={() => !submitting && !showResult && onSelectAnswer(option)} />
          );
        })}
      </div>
      {!lastResult && (
        <SubmitButton onClick={() => onSubmit()} disabled={submitting || !selectedAnswer} submitting={submitting} />
      )}
    </div>
  );
}

// =============================================================================
// WORD BUILDING GAME
// =============================================================================

function WordBuildingGame({ item, lastResult, submitting, selectedAnswer, areaColor, onSelectAnswer, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as { sounds?: string[]; original_word?: string; old_sound?: string; new_sound?: string; letters?: string[]; build_mode?: string };
  const buildMode = extra.build_mode || "blend";

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
      {buildMode === "blend" && extra.sounds && (
        <div className="text-center mb-5">
          <p className="text-sm text-gray-400 mb-3 font-semibold">Blend these sounds:</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {extra.sounds.map((sound, idx) => (
              <span key={idx} className="px-4 py-2.5 bg-[#475093]/[0.06] text-[#303FAE] rounded-2xl font-bold text-lg">{sound}</span>
            ))}
          </div>
        </div>
      )}
      {buildMode === "swap" && (
        <div className="text-center mb-5">
          <p className="text-sm text-gray-400 mb-3 font-semibold">Change the sound:</p>
          <div className="flex justify-center items-center gap-3">
            <span className="px-4 py-2.5 bg-red-50 text-red-600 rounded-2xl font-bold text-2xl line-through">{extra.old_sound}</span>
            <ArrowRight size={24} className="text-gray-300" />
            <span className="px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-2xl font-bold text-2xl">{extra.new_sound}</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-800">
            {extra.letters?.map((l, idx) => (
              <span key={idx} className={l === extra.old_sound ? "text-red-500 underline" : ""}>{l}</span>
            ))}
          </p>
        </div>
      )}
      {buildMode === "ladder" && (
        <div className="text-center mb-5">
          <p className="text-sm text-gray-400 mb-3 font-semibold">Change one letter:</p>
          <div className="flex justify-center gap-1">
            {extra.letters?.map((l, idx) => (
              <span key={idx} className="w-12 h-14 flex items-center justify-center bg-gray-50 rounded-xl text-2xl font-bold text-gray-800 border-2 border-gray-200">{l}</span>
            ))}
          </div>
        </div>
      )}

      <p className="text-base text-gray-900 mb-4 text-center font-bold">{item.question}</p>
      <div className="grid grid-cols-2 gap-2.5">
        {item.options.map((option, idx) => {
          const isSelected = selectedAnswer === option;
          const showResult = lastResult !== null;
          let bg = "bg-gray-50 border-gray-100";
          if (showResult && option === lastResult.correct_answer) bg = "bg-emerald-50 border-emerald-400";
          else if (showResult && isSelected && !lastResult.is_correct) bg = "bg-red-50 border-red-400";
          else if (isSelected) bg = "bg-[#475093]/[0.04] border-[#475093]";

          return (
            <button key={idx} onClick={() => !submitting && !showResult && onSelectAnswer(option)} disabled={submitting || showResult}
              className={`p-3.5 rounded-2xl border-2 text-center font-bold text-gray-700 transition-all hover:border-[#475093]/30 active:scale-95 ${bg}`}>
              {option}
            </button>
          );
        })}
      </div>
      <HintSection hint={item.hint} />
      {!lastResult && (
        <SubmitButton onClick={() => onSubmit()} disabled={submitting || !selectedAnswer} submitting={submitting} />
      )}
    </div>
  );
}

// =============================================================================
// FILL BLANK GAME
// =============================================================================

function FillBlankGame({ item, lastResult, submitting, selectedAnswer, onSelectAnswer, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as { partial_word?: string[]; sentence?: string };
  const hasOptions = item.options && item.options.length > 0;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm text-center">
      {extra.sentence && <div className="p-4 bg-gray-50 rounded-2xl mb-4 text-base text-gray-700 leading-relaxed font-medium">{extra.sentence}</div>}
      {extra.partial_word && (
        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-3 font-semibold">{item.question}</p>
          <div className="flex justify-center gap-1.5">
            {extra.partial_word.map((letter, idx) => (
              <span key={idx} className={`w-10 h-12 flex items-center justify-center rounded-xl text-xl font-bold ${letter === "_" ? "bg-amber-50 border-2 border-dashed border-amber-300 text-amber-400" : "bg-gray-50 border border-gray-200 text-gray-800"}`}>
                {letter === "_" ? "?" : letter}
              </span>
            ))}
          </div>
        </div>
      )}
      {!extra.partial_word && <p className="text-lg text-gray-900 mb-4 font-bold">{item.question}</p>}

      {hasOptions ? (
        <div className="grid grid-cols-2 gap-2.5">
          {item.options.map((option, idx) => {
            const isSelected = selectedAnswer === option;
            const showResult = lastResult !== null;
            let bg = "bg-gray-50 border-gray-100";
            if (showResult && option === lastResult.correct_answer) bg = "bg-emerald-50 border-emerald-400";
            else if (showResult && isSelected && !lastResult.is_correct) bg = "bg-red-50 border-red-400";
            else if (isSelected) bg = "bg-[#475093]/[0.04] border-[#475093]";

            return (
              <button key={idx} onClick={() => !submitting && !showResult && onSelectAnswer(option)} disabled={submitting || showResult}
                className={`p-3 rounded-2xl border-2 text-sm font-bold text-gray-700 transition-all hover:border-[#475093]/30 ${bg}`}>
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        <input type="text" value={selectedAnswer} onChange={(e) => onSelectAnswer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="Type the complete word..." disabled={submitting || !!lastResult}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-base text-center font-semibold focus:ring-2 focus:ring-[#FF5A39]/15 focus:border-[#FF5A39] outline-none" />
      )}
      <HintSection hint={item.hint} />
      {!lastResult && (
        <SubmitButton onClick={() => onSubmit()} disabled={submitting || !selectedAnswer} submitting={submitting} />
      )}
    </div>
  );
}

// =============================================================================
// TRACKING GAME
// =============================================================================

function TrackingGame({ item, lastResult, submitting, selectedAnswer, onSelectAnswer, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as { directions: string[]; direction_emojis: Record<string, string>; step_count: number };
  const directions = extra.directions || [];
  const emojis = extra.direction_emojis || {};
  const [revealedSteps, setRevealedSteps] = useState(0);

  useEffect(() => {
    setRevealedSteps(0);
    directions.forEach((_, idx) => {
      setTimeout(() => setRevealedSteps(idx + 1), (idx + 1) * 500);
    });
  }, [item.index]);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm text-center">
      <p className="text-lg font-bold text-gray-900 mb-4">{item.question}</p>
      <div className="flex justify-center gap-1.5 flex-wrap mb-6">
        {directions.map((dir, idx) => (
          <div key={idx} className={`flex items-center gap-1 transition-all duration-300 ${idx < revealedSteps ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
            <span className="text-2xl">{emojis[dir] || dir}</span>
            {idx < directions.length - 1 && <ArrowRight size={14} className="text-gray-300" />}
          </div>
        ))}
      </div>

      {revealedSteps >= directions.length && (
        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
          {["up", "down", "left", "right"].map(dir => {
            const isSelected = selectedAnswer === dir;
            const showResult = lastResult !== null;
            const isCorrect = showResult && dir === lastResult.correct_answer;
            const isWrong = showResult && isSelected && !lastResult.is_correct;

            let bg = "bg-gray-50 hover:bg-[#475093]/[0.04]";
            if (isCorrect) bg = "bg-emerald-50";
            else if (isWrong) bg = "bg-red-50";
            else if (isSelected) bg = "bg-[#475093]/[0.04]";

            return (
              <button key={dir} onClick={() => !submitting && !showResult && onSelectAnswer(dir)} disabled={submitting || showResult}
                className={`p-4 rounded-2xl text-center font-bold transition-all active:scale-95 border-2 border-transparent ${bg}`}>
                <span className="text-2xl block">{emojis[dir]}</span>
                <span className="text-xs text-gray-600 capitalize font-semibold">{dir}</span>
              </button>
            );
          })}
        </div>
      )}

      {revealedSteps >= directions.length && !lastResult && (
        <SubmitButton onClick={() => onSubmit()} disabled={submitting || !selectedAnswer} submitting={submitting} />
      )}
    </div>
  );
}

// =============================================================================
// PATTERN MATCH GAME
// =============================================================================

function PatternMatchGame({ item, lastResult, submitting, selectedAnswer, onSelectAnswer, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as { target_pattern: string; study_time_seconds: number };
  const studyTime = (extra.study_time_seconds || 3) * 1000;
  const [phase, setPhase] = useState<"study" | "match">("study");

  useEffect(() => {
    setPhase("study");
    const timer = setTimeout(() => setPhase("match"), studyTime);
    return () => clearTimeout(timer);
  }, [item.index, studyTime]);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm text-center">
      {phase === "study" ? (
        <>
          <p className="text-lg font-bold text-gray-900 mb-2">Study this pattern!</p>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-[#FF5A39] rounded-full animate-shrink" style={{ animationDuration: `${studyTime}ms` }} />
          </div>
          <p className="text-4xl tracking-wide mb-4 font-bold">{extra.target_pattern}</p>
          <button onClick={() => setPhase("match")} className="text-sm text-gray-500 hover:text-gray-700 font-bold flex items-center gap-1 mx-auto">
            Ready <ArrowRight size={14} />
          </button>
        </>
      ) : (
        <>
          <p className="text-lg font-bold text-gray-900 mb-4">Which pattern matches?</p>
          <div className="space-y-3">
            {item.options.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const showResult = lastResult !== null;
              let bg = "bg-gray-50 border-gray-100 hover:border-[#475093]/30";
              if (showResult && option === lastResult.correct_answer) bg = "bg-emerald-50 border-emerald-400";
              else if (showResult && isSelected && !lastResult.is_correct) bg = "bg-red-50 border-red-400";
              else if (isSelected) bg = "bg-[#475093]/[0.04] border-[#475093]";

              return (
                <button key={idx} onClick={() => !submitting && !showResult && onSelectAnswer(option)} disabled={submitting || showResult}
                  className={`w-full p-4 rounded-2xl border-2 text-2xl tracking-wider transition-all font-bold ${bg}`}>
                  {option}
                </button>
              );
            })}
          </div>
          {!lastResult && (
            <SubmitButton onClick={() => onSubmit()} disabled={submitting || !selectedAnswer} submitting={submitting} />
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// DUAL TASK GAME
// =============================================================================

function DualTaskGame({ item, lastResult, submitting, selectedAnswer, onSelectAnswer, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as {
    remember_word: string; math_problem: string; math_answer: string;
    word_options: string[]; correct_word: string;
  };
  const [gamePhase, setGamePhase] = useState<"remember" | "math" | "recall">("remember");
  const [mathAnswer, setMathAnswer] = useState("");

  useEffect(() => {
    setGamePhase("remember");
    setMathAnswer("");
    const timer = setTimeout(() => setGamePhase("math"), 3000);
    return () => clearTimeout(timer);
  }, [item.index]);

  const submitMath = () => {
    setMathAnswer(selectedAnswer);
    setGamePhase("recall");
    onSelectAnswer("");
  };

  const submitRecall = (word: string) => {
    onSubmit(extra.math_answer);
  };

  if (gamePhase === "remember") {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm text-center">
        <p className="text-sm text-gray-400 mb-2 font-semibold">Remember this word!</p>
        <p className="text-5xl font-bold text-[#475093] mb-4 animate-pulse">{extra.remember_word}</p>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#FF5A39] rounded-full animate-shrink" style={{ animationDuration: "3000ms" }} />
        </div>
      </div>
    );
  }

  if (gamePhase === "math") {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm text-center">
        <p className="flex items-center justify-center gap-1 text-xs text-amber-600 font-bold mb-2">
          <Lightbulb size={13} /> Don&apos;t forget the word!
        </p>
        <p className="text-sm text-gray-400 mb-2 font-semibold">Now solve:</p>
        <p className="text-4xl font-bold text-gray-900 mb-6">{extra.math_problem} = ?</p>
        <div className="grid grid-cols-2 gap-2.5 max-w-xs mx-auto">
          {item.options.map((option, idx) => (
            <button key={idx} onClick={() => onSelectAnswer(option)}
              className={`p-3.5 rounded-2xl border-2 text-lg font-bold transition-all active:scale-95 ${selectedAnswer === option ? "bg-[#475093]/[0.06] border-[#475093] text-[#303FAE]" : "bg-gray-50 border-gray-100 text-gray-700 hover:border-[#475093]/30"}`}>
              {option}
            </button>
          ))}
        </div>
        <SubmitButton onClick={submitMath} disabled={!selectedAnswer} submitting={false} label="Next" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm text-center">
      <p className="text-lg font-bold text-gray-900 mb-4">What was the word?</p>
      <div className="grid grid-cols-2 gap-2.5 max-w-sm mx-auto">
        {(extra.word_options || []).map((word, idx) => {
          const showResult = lastResult !== null;
          return (
            <button key={idx} onClick={() => !submitting && !showResult && submitRecall(word)} disabled={submitting || showResult}
              className={`p-3.5 rounded-2xl border-2 text-base font-bold transition-all active:scale-95 ${showResult && word === extra.correct_word ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "bg-gray-50 border-gray-100 text-gray-700 hover:border-[#475093]/30"}`}>
              {word}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// TEXT INPUT GAME
// =============================================================================

function TextInputGame({ item, lastResult, submitting, textInput, onTextInput, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as { original_word?: string; letter_count?: number };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm text-center">
      {extra.original_word && (
        <p className="text-4xl font-bold text-[#475093] mb-2">{extra.original_word}</p>
      )}
      <p className="text-lg text-gray-900 mb-5 font-bold">{item.question}</p>
      {extra.letter_count && <p className="text-sm text-gray-400 mb-3 font-semibold">{extra.letter_count} letters</p>}
      <input type="text" value={textInput} onChange={(e) => onTextInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder="Type your answer..." disabled={submitting || !!lastResult}
        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl text-lg text-center font-mono tracking-widest focus:ring-2 focus:ring-[#FF5A39]/15 focus:border-[#FF5A39] outline-none"
        autoFocus />
      <HintSection hint={item.hint} />
      {!lastResult && (
        <SubmitButton onClick={() => onSubmit()} disabled={submitting || !textInput} submitting={submitting} />
      )}
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

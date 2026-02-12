"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ExerciseSession, ExerciseItem, ExerciseItemResult } from "@/types";
import { DEFICIT_AREA_LABELS, DEFICIT_AREA_COLORS } from "@/types";
import ProgressBar from "@/components/ProgressBar";

// =============================================================================
// MAIN PLAY PAGE
// =============================================================================

function ExercisePlayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get("studentId");
  const gameId = searchParams.get("gameId");

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

  // Points animation
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
      const result = await api.submitAnswer(
        session.id,
        currentIndex,
        finalAnswer,
        responseTime
      );
      setLastResult(result);

      // Points popup & streak
      if (result.is_correct) {
        setStreak(prev => prev + 1);
        setPointsPopup(result.points_earned);
        setTimeout(() => setPointsPopup(null), 1000);
      } else {
        setStreak(0);
      }

      // Show result for 1.5 seconds, then move on
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
      }, 1500);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  const completeSession = async () => {
    if (!session) return;
    try {
      const result = await api.completeSession(session.id);
      setSession(result);
      setCompleted(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading your exercise...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => router.back()} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200">
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

  // ─── Completed View ──────────────────────────────────────────────────────
  if (completed) {
    const accuracy = session.accuracy * 100;
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="text-6xl mb-4">
            {accuracy >= 90 ? "🌟" : accuracy >= 70 ? "👏" : accuracy >= 50 ? "💪" : "🤗"}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Session Complete!</h1>
          <p className="text-slate-500 mb-6">{session.game_name}</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-3xl font-bold text-slate-900">{session.correct_count}/{session.total_items}</p>
              <p className="text-xs text-slate-400 mt-1">Correct</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-3xl font-bold text-slate-900">{Math.round(accuracy)}%</p>
              <p className="text-xs text-slate-400 mt-1">Accuracy</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-3xl font-bold text-indigo-600">+{session.points_earned}</p>
              <p className="text-xs text-slate-400 mt-1">Points</p>
            </div>
          </div>

          {session.badges_earned.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-amber-900 mb-2">New Badges Earned!</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {session.badges_earned.map((b) => (
                  <span key={b} className="px-3 py-1 bg-amber-100 text-amber-800 text-sm rounded-full font-medium">
                    {b.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Link
              href={`/students/${session.student_id}`}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              Back to Student
            </Link>
            <button
              onClick={() => {
                setCompleted(false);
                setCurrentIndex(0);
                setSelectedAnswer("");
                setTextInput("");
                setLastResult(null);
                setLoading(true);
                startSession();
              }}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Playing View ────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      {/* Session Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ backgroundColor: `${areaColor}15`, color: areaColor }}
            >
              {areaLabel}
            </span>
            <span className="text-xs text-slate-400">Lv. {session.difficulty_level}</span>
            {Boolean(currentItem?.extra_data?.ai_generated) && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600" title="AI-generated content">
                ✨ AI
              </span>
            )}
            {streak >= 3 && (
              <span className="text-xs font-bold text-orange-500 animate-pulse">
                🔥 {streak} streak!
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-900">{session.game_name}</h1>
        </div>
        <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-600">
          Exit
        </button>
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
          <div className="bg-emerald-500 text-white px-4 py-2 rounded-full text-lg font-bold shadow-lg">
            +{pointsPopup} pts
          </div>
        </div>
      )}

      {/* Game Renderer - dispatches to correct interactive component */}
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
      {lastResult && (
        <div className={`mt-4 p-4 rounded-xl text-center ${lastResult.is_correct ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
          <p className={`text-lg font-semibold ${lastResult.is_correct ? "text-emerald-700" : "text-amber-700"}`}>
            {lastResult.is_correct
              ? `Correct! +${lastResult.points_earned} points ⭐`
              : `Not quite. The answer is: ${lastResult.correct_answer}`}
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// GAME RENDERER - dispatches to the right interactive component
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
  const type = item.item_type;

  switch (type) {
    case "grid_memory":
      return <GridMemoryGame {...props} />;
    case "sequence_tap":
      return <SequenceTapGame {...props} />;
    case "speed_round":
      return <SpeedRoundGame {...props} />;
    case "sorting":
      return <SortingGame {...props} />;
    case "spot_target":
      return <SpotTargetGame {...props} />;
    case "timed_reading":
      return <TimedReadingGame {...props} />;
    case "word_building":
      return <WordBuildingGame {...props} />;
    case "fill_blank":
      return <FillBlankGame {...props} />;
    case "tracking":
      return <TrackingGame {...props} />;
    case "pattern_match":
      return <PatternMatchGame {...props} />;
    case "dual_task":
      return <DualTaskGame {...props} />;
    case "text_input":
      return <TextInputGame {...props} />;
    case "multiple_choice":
    default:
      return <MultipleChoiceGame {...props} />;
  }
}

// =============================================================================
// MULTIPLE CHOICE GAME (classic)
// =============================================================================

function MultipleChoiceGame({ item, lastResult, submitting, selectedAnswer, areaColor, onSelectAnswer, onSubmit }: GameRendererProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <p className="text-lg text-slate-900 mb-5 leading-relaxed whitespace-pre-line">{item.question}</p>
      <div className="space-y-2.5">
        {item.options.map((option, idx) => {
          const isSelected = selectedAnswer === option;
          const showResult = lastResult !== null;
          const isCorrectAnswer = showResult && option === lastResult.correct_answer;
          const isWrongSelection = showResult && isSelected && !lastResult.is_correct;

          let borderColor = "border-slate-200";
          let bgColor = "bg-white";
          if (showResult && isCorrectAnswer) { borderColor = "border-emerald-400"; bgColor = "bg-emerald-50"; }
          else if (showResult && isWrongSelection) { borderColor = "border-red-400"; bgColor = "bg-red-50"; }
          else if (isSelected) { borderColor = "border-indigo-400"; bgColor = "bg-indigo-50"; }

          return (
            <button
              key={idx}
              onClick={() => { if (!submitting && !showResult) onSelectAnswer(option); }}
              disabled={submitting || showResult}
              className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${borderColor} ${bgColor} ${!submitting && !showResult ? "hover:border-indigo-300 cursor-pointer" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ borderColor: isSelected ? areaColor : "#cbd5e1", color: isSelected ? areaColor : "#94a3b8" }}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-sm font-medium text-slate-700">{option}</span>
                {showResult && isCorrectAnswer && <span className="ml-auto text-emerald-500 text-lg">✓</span>}
                {showResult && isWrongSelection && <span className="ml-auto text-red-500 text-lg">✗</span>}
              </div>
            </button>
          );
        })}
      </div>
      {item.hint && !lastResult && (
        <details className="mt-4">
          <summary className="text-sm text-indigo-600 cursor-pointer hover:text-indigo-700">Need a hint?</summary>
          <p className="text-sm text-slate-500 mt-2 p-3 bg-indigo-50 rounded-lg">{item.hint}</p>
        </details>
      )}
      {!lastResult && (
        <button
          onClick={() => onSubmit()}
          disabled={submitting || !selectedAnswer}
          className="w-full mt-5 py-3 bg-indigo-600 text-white text-base font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {submitting ? "Checking..." : "Submit Answer"}
        </button>
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
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSubmit = () => {
    const answer = Array.from(selected).sort((a, b) => a - b).join(",");
    onSubmit(answer);
  };

  const total = gridSize * gridSize;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="text-center mb-4">
        <p className="text-lg font-semibold text-slate-900">
          {phase === "showing" ? "🧠 Memorize the pattern!" : "Tap the squares to recreate it!"}
        </p>
        {phase === "showing" && (
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full animate-shrink" style={{ animationDuration: `${showDuration}ms` }} />
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`, maxWidth: `${gridSize * 56}px` }}
        >
          {Array.from({ length: total }, (_, idx) => {
            const isPattern = pattern.includes(idx);
            const isSelected = selected.has(idx);
            const showResult = lastResult !== null;
            const isCorrect = showResult && isPattern && isSelected;
            const isMissed = showResult && isPattern && !isSelected;
            const isWrong = showResult && !isPattern && isSelected;

            let bg = "bg-slate-100 hover:bg-slate-200";
            if (phase === "showing" && isPattern) bg = "bg-indigo-500";
            else if (isCorrect) bg = "bg-emerald-400";
            else if (isMissed) bg = "bg-amber-300";
            else if (isWrong) bg = "bg-red-300";
            else if (isSelected) bg = "bg-indigo-400";

            return (
              <button
                key={idx}
                onClick={() => toggleCell(idx)}
                disabled={phase === "showing" || !!lastResult || submitting}
                className={`w-12 h-12 rounded-lg transition-all ${bg} ${phase === "playing" && !lastResult ? "cursor-pointer active:scale-95" : ""}`}
              />
            );
          })}
        </div>
      </div>

      {phase === "playing" && !lastResult && (
        <button
          onClick={handleSubmit}
          disabled={submitting || selected.size === 0}
          className="w-full mt-5 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {submitting ? "Checking..." : `Check Pattern (${selected.size} selected)`}
        </button>
      )}
    </div>
  );
}

// =============================================================================
// SEQUENCE TAP GAME
// =============================================================================

function SequenceTapGame({ item, lastResult, submitting, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as { sequence?: number[]; show_duration_seconds?: number; tap_mode?: string; syllable_count?: number; max_taps?: number; available_numbers?: number[] };
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
    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
      <p className="text-lg font-semibold text-slate-900 mb-2">{item.question}</p>
      <p className="text-4xl font-bold text-indigo-600 mb-6">{extra.word as string}</p>

      <div className="flex justify-center gap-2 mb-4">
        {Array.from({ length: maxTaps }, (_, i) => (
          <div
            key={i}
            className={`w-10 h-10 rounded-full transition-all ${i < tapCount ? "bg-indigo-500 scale-110" : "bg-slate-200"}`}
          />
        ))}
      </div>

      <p className="text-2xl font-bold text-slate-700 mb-4">{tapCount} {tapCount === 1 ? "beat" : "beats"}</p>

      <div className="flex gap-3 justify-center">
        <button
          onClick={() => !lastResult && !submitting && setTapCount(prev => Math.min(prev + 1, maxTaps))}
          disabled={!!lastResult || submitting}
          className="px-8 py-4 bg-indigo-100 text-indigo-700 font-bold text-lg rounded-xl hover:bg-indigo-200 active:scale-95 transition-all disabled:opacity-40"
        >
          🥁 TAP!
        </button>
        <button
          onClick={() => !lastResult && !submitting && setTapCount(prev => Math.max(0, prev - 1))}
          disabled={!!lastResult || submitting || tapCount === 0}
          className="px-4 py-4 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 disabled:opacity-40"
        >
          Undo
        </button>
      </div>

      {!lastResult && (
        <button
          onClick={() => onSubmit(String(tapCount))}
          disabled={submitting || tapCount === 0}
          className="w-full mt-5 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {submitting ? "Checking..." : "Submit"}
        </button>
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
    // Animate showing sequence one by one
    sequence.forEach((_, idx) => {
      setTimeout(() => setHighlightIdx(idx), idx * 600);
      setTimeout(() => setHighlightIdx(-1), idx * 600 + 400);
    });
    setTimeout(() => setPhase("playing"), showDuration);
  }, [item.index]);

  const handleTap = (num: number) => {
    if (phase !== "playing" || lastResult || submitting) return;
    setTapped(prev => [...prev, num]);
  };

  const handleUndo = () => {
    setTapped(prev => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    onSubmit(tapped.join(","));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
      <p className="text-lg font-semibold text-slate-900 mb-4">
        {phase === "showing" ? "🔢 Watch the sequence!" : "Now tap the numbers in order!"}
      </p>

      {phase === "showing" && (
        <div className="flex justify-center gap-2 mb-4">
          {sequence.map((num, idx) => (
            <div
              key={idx}
              className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${idx === highlightIdx ? "bg-indigo-500 text-white scale-110" : "bg-slate-100 text-slate-300"}`}
            >
              {idx === highlightIdx ? num : "?"}
            </div>
          ))}
        </div>
      )}

      {phase === "playing" && (
        <>
          {/* Tapped so far */}
          <div className="flex justify-center gap-2 mb-4 min-h-[56px]">
            {tapped.map((num, idx) => (
              <div key={idx} className="w-12 h-12 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xl font-bold">
                {num}
              </div>
            ))}
            {Array.from({ length: sequence.length - tapped.length }, (_, i) => (
              <div key={`empty-${i}`} className="w-12 h-12 rounded-lg border-2 border-dashed border-slate-300" />
            ))}
          </div>

          {/* Number pad */}
          <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleTap(num)}
                disabled={!!lastResult || submitting}
                className="w-12 h-12 rounded-lg bg-slate-100 text-slate-700 font-bold text-lg hover:bg-indigo-100 active:scale-95 transition-all disabled:opacity-40"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleUndo}
              disabled={!!lastResult || submitting || tapped.length === 0}
              className="w-12 h-12 rounded-lg bg-amber-100 text-amber-700 font-bold text-sm hover:bg-amber-200 disabled:opacity-40"
            >
              ↩
            </button>
          </div>

          {!lastResult && (
            <button
              onClick={handleSubmit}
              disabled={submitting || tapped.length !== sequence.length}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              {submitting ? "Checking..." : "Submit Sequence"}
            </button>
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
          // Auto-submit empty if time runs out
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
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      {/* Timer bar */}
      <div className="mb-4">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ${isUrgent ? "bg-red-500" : "bg-indigo-500"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className={`text-xs mt-1 text-right font-medium ${isUrgent ? "text-red-500" : "text-slate-400"}`}>
          {Math.ceil(timeLeft / 1000)}s
        </p>
      </div>

      {/* Display area */}
      {extra.display_emoji && (
        <div className="text-center mb-4">
          <span className="text-7xl">{extra.display_emoji}</span>
        </div>
      )}

      <p className="text-lg text-slate-900 mb-4 text-center font-semibold">{item.question}</p>

      {/* Quick-tap options (bigger buttons for speed) */}
      <div className="grid grid-cols-2 gap-3">
        {item.options.map((option, idx) => {
          const isSelected = selectedAnswer === option;
          const showResult = lastResult !== null;
          const isCorrectAnswer = showResult && option === lastResult.correct_answer;
          const isWrongSelection = showResult && isSelected && !lastResult.is_correct;

          let bg = "bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300";
          if (showResult && isCorrectAnswer) bg = "bg-emerald-50 border-emerald-400";
          else if (showResult && isWrongSelection) bg = "bg-red-50 border-red-400";
          else if (isSelected) bg = "bg-indigo-50 border-indigo-400";

          return (
            <button
              key={idx}
              onClick={() => {
                if (!submitting && !showResult) {
                  onSelectAnswer(option);
                  // Auto-submit on click for speed rounds
                  onSubmit(option);
                }
              }}
              disabled={submitting || showResult}
              className={`p-4 rounded-xl border-2 text-center font-semibold text-slate-700 transition-all active:scale-95 ${bg}`}
            >
              {option}
              {showResult && isCorrectAnswer && <span className="ml-2">✓</span>}
              {showResult && isWrongSelection && <span className="ml-2">✗</span>}
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
      // Update remaining based on new ordered list
      setRemaining(events.filter((e, idx) => {
        // For each event in the original list, check if it's already been used
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

  const handleSubmit = () => {
    onSubmit(ordered.join("|"));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <p className="text-lg font-semibold text-slate-900 mb-4">{item.question}</p>

      {/* Ordered area */}
      <div className="mb-4 min-h-[60px]">
        <p className="text-xs text-slate-400 mb-2 uppercase font-medium">Your order:</p>
        <div className="space-y-2">
          {ordered.map((event, idx) => (
            <div key={idx} className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <span className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {idx + 1}
              </span>
              <span className="text-sm font-medium text-slate-700">{event}</span>
            </div>
          ))}
        </div>
        {ordered.length > 0 && !lastResult && (
          <button onClick={undoLast} className="mt-2 text-sm text-slate-500 hover:text-slate-700">↩ Undo last</button>
        )}
      </div>

      {/* Available events to pick from */}
      {remaining.length > 0 && !lastResult && (
        <div>
          <p className="text-xs text-slate-400 mb-2 uppercase font-medium">Tap to add next:</p>
          <div className="space-y-2">
            {remaining.map((event, idx) => (
              <button
                key={idx}
                onClick={() => selectEvent(event)}
                disabled={!!lastResult || submitting}
                className="w-full text-left p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all active:scale-[0.98]"
              >
                <span className="text-sm font-medium text-slate-700">{event}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!lastResult && remaining.length === 0 && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full mt-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {submitting ? "Checking..." : "Submit Order"}
        </button>
      )}
    </div>
  );
}

// =============================================================================
// SPOT TARGET GAME
// =============================================================================

function SpotTargetGame({ item, lastResult, submitting, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as { target: string; grid: string[]; grid_cols: number; grid_rows: number; target_positions: number[]; target_count: number; mirror?: string };
  const grid = extra.grid || [];
  const cols = extra.grid_cols || 5;
  const targetPositions = extra.target_positions || [];
  const [tapped, setTapped] = useState<Set<number>>(new Set());

  useEffect(() => { setTapped(new Set()); }, [item.index]);

  const toggleCell = (idx: number) => {
    if (lastResult || submitting) return;
    setTapped(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSubmit = () => {
    onSubmit(Array.from(tapped).sort((a, b) => a - b).join(","));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
      <p className="text-lg font-semibold text-slate-900 mb-4">{item.question}</p>

      <div className="flex justify-center mb-4">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxWidth: `${cols * 52}px` }}>
          {grid.map((letter, idx) => {
            const isTapped = tapped.has(idx);
            const showResult = lastResult !== null;
            const isTarget = targetPositions.includes(idx);
            const isCorrectTap = showResult && isTarget && isTapped;
            const isMissed = showResult && isTarget && !isTapped;
            const isWrongTap = showResult && !isTarget && isTapped;

            let bg = "bg-slate-100 hover:bg-slate-200 text-slate-700";
            if (isCorrectTap) bg = "bg-emerald-400 text-white";
            else if (isMissed) bg = "bg-amber-300 text-amber-900";
            else if (isWrongTap) bg = "bg-red-300 text-red-900";
            else if (isTapped) bg = "bg-indigo-400 text-white";

            return (
              <button
                key={idx}
                onClick={() => toggleCell(idx)}
                disabled={!!lastResult || submitting}
                className={`w-11 h-11 rounded-lg flex items-center justify-center text-lg font-bold transition-all active:scale-90 ${bg}`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-slate-500 mb-3">{tapped.size} of {extra.target_count} found</p>

      {!lastResult && (
        <button
          onClick={handleSubmit}
          disabled={submitting || tapped.size === 0}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {submitting ? "Checking..." : "Check!"}
        </button>
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
      setTimeLeft(prev => {
        if (prev <= 100) {
          clearInterval(timer);
          setPhase("answering");
          return 0;
        }
        return prev - 100;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [item.index, readingTime]);

  const skipToQuestions = () => setPhase("answering");

  if (phase === "reading") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="mb-4">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-100" style={{ width: `${(timeLeft / readingTime) * 100}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-1 text-right">{Math.ceil(timeLeft / 1000)}s to read</p>
        </div>
        <p className="text-lg text-slate-900 leading-relaxed mb-6">{passage}</p>
        <button onClick={skipToQuestions} className="w-full py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200">
          Ready! Show questions →
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      {staysVisible && (
        <div className="p-4 bg-slate-50 rounded-xl mb-4 text-sm text-slate-700 leading-relaxed italic">
          {passage}
        </div>
      )}
      <p className="text-lg text-slate-900 mb-4">{item.question}</p>
      <div className="space-y-2.5">
        {item.options.map((option, idx) => {
          const isSelected = selectedAnswer === option;
          const showResult = lastResult !== null;
          const isCorrectAnswer = showResult && option === lastResult.correct_answer;
          const isWrongSelection = showResult && isSelected && !lastResult.is_correct;

          let bg = "bg-slate-50 border-slate-200 hover:bg-indigo-50";
          if (showResult && isCorrectAnswer) bg = "bg-emerald-50 border-emerald-400";
          else if (showResult && isWrongSelection) bg = "bg-red-50 border-red-400";
          else if (isSelected) bg = "bg-indigo-50 border-indigo-400";

          return (
            <button
              key={idx}
              onClick={() => !submitting && !showResult && onSelectAnswer(option)}
              disabled={submitting || showResult}
              className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${bg}`}
            >
              <span className="text-sm font-medium text-slate-700">{option}</span>
              {showResult && isCorrectAnswer && <span className="float-right text-emerald-500">✓</span>}
              {showResult && isWrongSelection && <span className="float-right text-red-500">✗</span>}
            </button>
          );
        })}
      </div>
      {!lastResult && (
        <button
          onClick={() => onSubmit()}
          disabled={submitting || !selectedAnswer}
          className="w-full mt-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          Submit
        </button>
      )}
    </div>
  );
}

// =============================================================================
// WORD BUILDING GAME
// =============================================================================

function WordBuildingGame({ item, lastResult, submitting, selectedAnswer, onSelectAnswer, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as { sounds?: string[]; original_word?: string; old_sound?: string; new_sound?: string; letters?: string[]; build_mode?: string; start_word?: string; target_word?: string };
  const buildMode = extra.build_mode || "blend";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      {/* Visual display of the word/sounds */}
      {buildMode === "blend" && extra.sounds && (
        <div className="text-center mb-5">
          <p className="text-sm text-slate-500 mb-3">Blend these sounds:</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {extra.sounds.map((sound, idx) => (
              <span key={idx} className="px-4 py-2.5 bg-indigo-100 text-indigo-700 rounded-xl font-bold text-lg">
                {sound}
              </span>
            ))}
          </div>
          <div className="flex justify-center items-center gap-1 mt-2">
            {extra.sounds.map((_, idx) => (
              <span key={idx} className="text-indigo-400">{idx < (extra.sounds?.length || 0) - 1 ? "→" : ""}</span>
            ))}
          </div>
        </div>
      )}

      {buildMode === "swap" && (
        <div className="text-center mb-5">
          <p className="text-sm text-slate-500 mb-3">Change the sound:</p>
          <div className="flex justify-center items-center gap-3">
            <span className="px-4 py-2.5 bg-red-100 text-red-600 rounded-xl font-bold text-2xl line-through">
              {extra.old_sound}
            </span>
            <span className="text-2xl text-slate-400">→</span>
            <span className="px-4 py-2.5 bg-emerald-100 text-emerald-600 rounded-xl font-bold text-2xl">
              {extra.new_sound}
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-800">
            {extra.letters?.map((l, idx) => (
              <span key={idx} className={l === extra.old_sound ? "text-red-500 underline" : ""}>
                {l}
              </span>
            ))}
          </p>
        </div>
      )}

      {buildMode === "ladder" && (
        <div className="text-center mb-5">
          <p className="text-sm text-slate-500 mb-3">Change one letter:</p>
          <div className="flex justify-center gap-1">
            {extra.letters?.map((l, idx) => (
              <span key={idx} className="w-12 h-14 flex items-center justify-center bg-slate-100 rounded-lg text-2xl font-bold text-slate-800 border-2 border-slate-200">
                {l}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-base text-slate-900 mb-4 text-center">{item.question}</p>

      {/* Multiple choice options */}
      <div className="grid grid-cols-2 gap-2.5">
        {item.options.map((option, idx) => {
          const isSelected = selectedAnswer === option;
          const showResult = lastResult !== null;
          const isCorrectAnswer = showResult && option === lastResult.correct_answer;
          const isWrongSelection = showResult && isSelected && !lastResult.is_correct;

          let bg = "bg-slate-50 border-slate-200";
          if (showResult && isCorrectAnswer) bg = "bg-emerald-50 border-emerald-400";
          else if (showResult && isWrongSelection) bg = "bg-red-50 border-red-400";
          else if (isSelected) bg = "bg-indigo-50 border-indigo-400";

          return (
            <button
              key={idx}
              onClick={() => !submitting && !showResult && onSelectAnswer(option)}
              disabled={submitting || showResult}
              className={`p-3.5 rounded-xl border-2 text-center font-semibold text-slate-700 transition-all hover:border-indigo-300 active:scale-95 ${bg}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {item.hint && !lastResult && (
        <details className="mt-3">
          <summary className="text-sm text-indigo-600 cursor-pointer">Hint</summary>
          <p className="text-sm text-slate-500 mt-1 p-2 bg-indigo-50 rounded-lg">{item.hint}</p>
        </details>
      )}

      {!lastResult && (
        <button
          onClick={() => onSubmit()}
          disabled={submitting || !selectedAnswer}
          className="w-full mt-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {submitting ? "Checking..." : "Submit"}
        </button>
      )}
    </div>
  );
}

// =============================================================================
// FILL BLANK GAME
// =============================================================================

function FillBlankGame({ item, lastResult, submitting, selectedAnswer, onSelectAnswer, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as { partial_word?: string[]; partial_display?: string; blank_positions?: number[]; full_word?: string; sentence?: string; target_word?: string; word_highlighted?: boolean };

  // If it has options, render as selection; otherwise as text input
  const hasOptions = item.options && item.options.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
      {extra.sentence && (
        <div className="p-4 bg-slate-50 rounded-xl mb-4 text-base text-slate-700 leading-relaxed">
          {extra.sentence}
        </div>
      )}

      {extra.partial_word && (
        <div className="mb-6">
          <p className="text-sm text-slate-500 mb-3">{item.question}</p>
          <div className="flex justify-center gap-1.5">
            {extra.partial_word.map((letter, idx) => (
              <span
                key={idx}
                className={`w-10 h-12 flex items-center justify-center rounded-lg text-xl font-bold ${
                  letter === "_"
                    ? "bg-amber-100 border-2 border-dashed border-amber-400 text-amber-400"
                    : "bg-slate-100 border border-slate-200 text-slate-800"
                }`}
              >
                {letter === "_" ? "?" : letter}
              </span>
            ))}
          </div>
        </div>
      )}

      {!extra.partial_word && <p className="text-lg text-slate-900 mb-4">{item.question}</p>}

      {hasOptions ? (
        <div className="grid grid-cols-2 gap-2.5">
          {item.options.map((option, idx) => {
            const isSelected = selectedAnswer === option;
            const showResult = lastResult !== null;
            const isCorrectAnswer = showResult && option === lastResult.correct_answer;
            const isWrongSelection = showResult && isSelected && !lastResult.is_correct;

            let bg = "bg-slate-50 border-slate-200";
            if (showResult && isCorrectAnswer) bg = "bg-emerald-50 border-emerald-400";
            else if (showResult && isWrongSelection) bg = "bg-red-50 border-red-400";
            else if (isSelected) bg = "bg-indigo-50 border-indigo-400";

            return (
              <button
                key={idx}
                onClick={() => !submitting && !showResult && onSelectAnswer(option)}
                disabled={submitting || showResult}
                className={`p-3 rounded-xl border-2 text-sm font-medium text-slate-700 transition-all hover:border-indigo-300 ${bg}`}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        <input
          type="text"
          value={selectedAnswer}
          onChange={(e) => onSelectAnswer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="Type the complete word..."
          disabled={submitting || !!lastResult}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-base text-center font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        />
      )}

      {item.hint && !lastResult && (
        <details className="mt-3">
          <summary className="text-sm text-indigo-600 cursor-pointer">Hint</summary>
          <p className="text-sm text-slate-500 mt-1 p-2 bg-indigo-50 rounded-lg">{item.hint}</p>
        </details>
      )}

      {!lastResult && (
        <button
          onClick={() => onSubmit()}
          disabled={submitting || !selectedAnswer}
          className="w-full mt-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          Submit
        </button>
      )}
    </div>
  );
}

// =============================================================================
// TRACKING GAME
// =============================================================================

function TrackingGame({ item, lastResult, submitting, selectedAnswer, onSelectAnswer, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as { directions: string[]; direction_emojis: Record<string, string>; step_count: number; path_positions: [number, number][] };
  const directions = extra.directions || [];
  const emojis = extra.direction_emojis || {};
  const [revealedSteps, setRevealedSteps] = useState(0);

  useEffect(() => {
    setRevealedSteps(0);
    // Animate path step by step
    directions.forEach((_, idx) => {
      setTimeout(() => setRevealedSteps(idx + 1), (idx + 1) * 500);
    });
  }, [item.index]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
      <p className="text-lg font-semibold text-slate-900 mb-4">{item.question}</p>

      {/* Animated path */}
      <div className="flex justify-center gap-1.5 flex-wrap mb-6">
        {directions.map((dir, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1 transition-all duration-300 ${idx < revealedSteps ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}
          >
            <span className="text-2xl">{emojis[dir] || dir}</span>
            {idx < directions.length - 1 && <span className="text-slate-300">→</span>}
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

            let bg = "bg-slate-100 hover:bg-indigo-100";
            if (isCorrect) bg = "bg-emerald-100";
            else if (isWrong) bg = "bg-red-100";
            else if (isSelected) bg = "bg-indigo-100";

            return (
              <button
                key={dir}
                onClick={() => !submitting && !showResult && onSelectAnswer(dir)}
                disabled={submitting || showResult}
                className={`p-4 rounded-xl text-center font-semibold transition-all active:scale-95 ${bg}`}
              >
                <span className="text-2xl block">{emojis[dir]}</span>
                <span className="text-xs text-slate-600 capitalize">{dir}</span>
              </button>
            );
          })}
        </div>
      )}

      {revealedSteps >= directions.length && !lastResult && (
        <button
          onClick={() => onSubmit()}
          disabled={submitting || !selectedAnswer}
          className="w-full mt-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          Submit
        </button>
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
    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
      {phase === "study" ? (
        <>
          <p className="text-lg font-semibold text-slate-900 mb-2">Study this pattern!</p>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-indigo-500 rounded-full animate-shrink" style={{ animationDuration: `${studyTime}ms` }} />
          </div>
          <p className="text-4xl tracking-wide mb-4">{extra.target_pattern}</p>
          <button onClick={() => setPhase("match")} className="text-sm text-slate-500 hover:text-slate-700">Ready →</button>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold text-slate-900 mb-4">Which pattern matches?</p>
          <div className="space-y-3">
            {item.options.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const showResult = lastResult !== null;
              const isCorrect = showResult && option === lastResult.correct_answer;
              const isWrong = showResult && isSelected && !lastResult.is_correct;

              let bg = "bg-slate-50 border-slate-200 hover:border-indigo-300";
              if (isCorrect) bg = "bg-emerald-50 border-emerald-400";
              else if (isWrong) bg = "bg-red-50 border-red-400";
              else if (isSelected) bg = "bg-indigo-50 border-indigo-400";

              return (
                <button
                  key={idx}
                  onClick={() => !submitting && !showResult && onSelectAnswer(option)}
                  disabled={submitting || showResult}
                  className={`w-full p-4 rounded-xl border-2 text-2xl tracking-wider transition-all ${bg}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {!lastResult && (
            <button
              onClick={() => onSubmit()}
              disabled={submitting || !selectedAnswer}
              className="w-full mt-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              Submit
            </button>
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
    word_options: string[]; correct_word: string; phase: string;
  };
  const [gamePhase, setGamePhase] = useState<"remember" | "math" | "recall">("remember");
  const [mathAnswer, setMathAnswer] = useState("");

  useEffect(() => {
    setGamePhase("remember");
    setMathAnswer("");
    // Show word for 3 seconds, then switch to math
    const timer = setTimeout(() => setGamePhase("math"), 3000);
    return () => clearTimeout(timer);
  }, [item.index]);

  const submitMath = () => {
    setMathAnswer(selectedAnswer);
    setGamePhase("recall");
    onSelectAnswer(""); // Reset for word selection
  };

  const submitRecall = (word: string) => {
    // Combine answers: math|word
    const combined = `${mathAnswer}|${word}`;
    // For scoring, we just check if math answer is correct
    onSubmit(extra.math_answer);
  };

  if (gamePhase === "remember") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-500 mb-2">Remember this word!</p>
        <p className="text-5xl font-bold text-indigo-600 mb-4 animate-pulse">{extra.remember_word}</p>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full animate-shrink" style={{ animationDuration: "3000ms" }} />
        </div>
      </div>
    );
  }

  if (gamePhase === "math") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
        <p className="text-xs text-amber-600 font-medium mb-2">💭 Don&apos;t forget the word!</p>
        <p className="text-sm text-slate-500 mb-2">Now solve:</p>
        <p className="text-4xl font-bold text-slate-900 mb-6">{extra.math_problem} = ?</p>
        <div className="grid grid-cols-2 gap-2.5 max-w-xs mx-auto">
          {item.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelectAnswer(option);
              }}
              className={`p-3.5 rounded-xl border-2 text-lg font-bold transition-all active:scale-95 ${
                selectedAnswer === option ? "bg-indigo-50 border-indigo-400 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <button
          onClick={submitMath}
          disabled={!selectedAnswer}
          className="w-full mt-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          Next
        </button>
      </div>
    );
  }

  // Recall phase
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
      <p className="text-lg font-semibold text-slate-900 mb-4">What was the word?</p>
      <div className="grid grid-cols-2 gap-2.5 max-w-sm mx-auto">
        {(extra.word_options || []).map((word, idx) => {
          const showResult = lastResult !== null;

          return (
            <button
              key={idx}
              onClick={() => !submitting && !showResult && submitRecall(word)}
              disabled={submitting || showResult}
              className={`p-3.5 rounded-xl border-2 text-base font-semibold transition-all active:scale-95 ${
                showResult && word === extra.correct_word
                  ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300"
              }`}
            >
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
    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
      {extra.original_word && (
        <p className="text-4xl font-bold text-indigo-600 mb-2">{extra.original_word}</p>
      )}
      <p className="text-lg text-slate-900 mb-5">{item.question}</p>
      {extra.letter_count && (
        <p className="text-sm text-slate-400 mb-3">{extra.letter_count} letters</p>
      )}
      <input
        type="text"
        value={textInput}
        onChange={(e) => onTextInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder="Type your answer..."
        disabled={submitting || !!lastResult}
        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-lg text-center font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        autoFocus
      />
      {item.hint && !lastResult && (
        <details className="mt-3">
          <summary className="text-sm text-indigo-600 cursor-pointer">Hint</summary>
          <p className="text-sm text-slate-500 mt-1 p-2 bg-indigo-50 rounded-lg">{item.hint}</p>
        </details>
      )}
      {!lastResult && (
        <button
          onClick={() => onSubmit()}
          disabled={submitting || !textInput}
          className="w-full mt-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {submitting ? "Checking..." : "Submit"}
        </button>
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
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ExercisePlayContent />
    </Suspense>
  );
}

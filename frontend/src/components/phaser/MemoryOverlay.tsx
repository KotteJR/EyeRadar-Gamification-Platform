"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  eventBus,
  GameEvents,
  type AnswerResultPayload,
} from "@/lib/phaser/EventBus";
import type { ExerciseItem, ExerciseItemResult } from "@/types";
import { RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import { UISounds } from "@/lib/ui-sounds";

interface MemoryOverlayProps {
  item: ExerciseItem;
  lastResult: ExerciseItemResult | null;
  submitting: boolean;
  onSubmit: (answer?: string) => void;
  onSelectAnswer: (answer: string) => void;
}

const MEMORY_ITEM_TYPES = [
  "grid_memory",
  "sequence_tap",
  "tracking",
  "pattern_match",
  "dual_task",
];

export function isMemoryItemType(type: string): boolean {
  return MEMORY_ITEM_TYPES.includes(type);
}

export default function MemoryOverlay({
  item,
  lastResult,
  submitting,
  onSubmit,
  onSelectAnswer,
}: MemoryOverlayProps) {
  useEffect(() => {
    if (!lastResult) return;
    const payload: AnswerResultPayload = {
      isCorrect: lastResult.is_correct,
      correctAnswer: lastResult.correct_answer,
      pointsEarned: lastResult.points_earned,
      studentAnswer: lastResult.student_answer,
    };
    eventBus.emit(GameEvents.ANSWER_RESULT, payload);
  }, [lastResult]);

  let content: React.ReactNode = null;
  switch (item.item_type) {
    case "grid_memory":
      content = <GridMemory item={item} lastResult={lastResult} submitting={submitting} onSubmit={onSubmit} />;
      break;
    case "sequence_tap":
      content = <SequenceTap item={item} lastResult={lastResult} submitting={submitting} onSubmit={onSubmit} />;
      break;
    case "tracking":
      content = <Tracking item={item} lastResult={lastResult} submitting={submitting} onSubmit={onSubmit} onSelectAnswer={onSelectAnswer} />;
      break;
    case "pattern_match":
      content = <PatternMatch item={item} lastResult={lastResult} submitting={submitting} onSubmit={onSubmit} onSelectAnswer={onSelectAnswer} />;
      break;
    case "dual_task":
      content = <DualTask item={item} lastResult={lastResult} submitting={submitting} onSubmit={onSubmit} onSelectAnswer={onSelectAnswer} />;
      break;
  }

  if (!content) return null;

  return (
    <>
      {/* Full-screen table-on-grass background — covers the Phaser canvas */}
      <div className="mem-bg" />
      {content}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   GRID MEMORY — Show pattern → Hide → User recreates it
   ═══════════════════════════════════════════════════════════════════════ */

function GridMemory({ item, lastResult, submitting, onSubmit }: {
  item: ExerciseItem; lastResult: ExerciseItemResult | null; submitting: boolean; onSubmit: (a?: string) => void;
}) {
  const gridSize = (item.extra_data?.grid_size as number) || 4;
  const pattern = (item.extra_data?.pattern as number[]) || [];
  const showDuration = ((item.extra_data?.show_duration_seconds as number) || 3) * 1000;

  const [phase, setPhase] = useState<"show" | "play" | "result">("show");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [timeProgress, setTimeProgress] = useState(100);

  useEffect(() => {
    setPhase("show");
    setSelected(new Set());
    setTimeProgress(100);
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.max(0, 100 - (elapsed / showDuration) * 100);
      setTimeProgress(pct);
      if (pct <= 0) { clearInterval(interval); setPhase("play"); }
    }, 50);
    return () => clearInterval(interval);
  }, [item.index, showDuration]);

  useEffect(() => { if (lastResult) setPhase("result"); }, [lastResult]);

  const toggleCell = (idx: number) => {
    if (phase !== "play" || submitting || lastResult) return;
    UISounds.tile();
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const totalCells = gridSize * gridSize;

  const showSubmit = phase === "play" && !lastResult && selected.size > 0;

  return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-center px-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Phase label */}
          <div className="mem-phase-label mb-3">
            <p className="mem-phase-text">
              {phase === "show" ? "Memorize the pattern!" : phase === "play" ? "Now tap to recreate it!" : lastResult?.is_correct ? "Correct!" : "Not quite!"}
            </p>
            {phase === "show" && (
              <div className="mt-2 h-1.5 bg-black/30 rounded-full overflow-hidden mx-4">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-75" style={{ width: `${timeProgress}%` }} />
              </div>
            )}
          </div>

          {/* Cards directly on the table */}
          <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
            {Array.from({ length: totalCells }, (_, idx) => {
              const isPattern = pattern.includes(idx);
              const isSel = selected.has(idx);
              const showActive = phase === "show" && isPattern;
              const showCorrect = phase === "result" && isPattern && isSel;
              const showMissed = phase === "result" && isPattern && !isSel;
              const showWrong = phase === "result" && !isPattern && isSel;

              let cardClass = "mem-card";
              if (showActive) cardClass += " mem-card-active";
              else if (showCorrect) cardClass += " mem-card-correct";
              else if (showMissed) cardClass += " mem-card-missed";
              else if (showWrong) cardClass += " mem-card-wrong";
              else if (isSel) cardClass += " mem-card-selected";

              return (
                <button
                  key={idx}
                  onClick={() => toggleCell(idx)}
                  disabled={phase !== "play" || !!lastResult || submitting}
                  className={cardClass}
                />
              );
            })}
          </div>

          {/* Submit — fixed height so it doesn't shift cards */}
          <div className="h-[52px] flex items-center justify-center mt-3">
            {showSubmit && (
              <button
                onClick={() => { UISounds.submit(); onSubmit(Array.from(selected).sort((a, b) => a - b).join(",")); }}
                disabled={submitting}
                className="mem-submit-btn"
              >
                {submitting ? "Checking..." : `Submit (${selected.size} selected)`}
              </button>
            )}
          </div>
        </div>
      </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SEQUENCE TAP — Show sequence → User taps it back / count syllables
   ═══════════════════════════════════════════════════════════════════════ */

function SequenceTap({ item, lastResult, submitting, onSubmit }: {
  item: ExerciseItem; lastResult: ExerciseItemResult | null; submitting: boolean; onSubmit: (a?: string) => void;
}) {
  const tapMode = (item.extra_data?.tap_mode as string) || "repeat";
  if (tapMode === "count") return <TapCount item={item} lastResult={lastResult} submitting={submitting} onSubmit={onSubmit} />;
  return <TapRepeat item={item} lastResult={lastResult} submitting={submitting} onSubmit={onSubmit} />;
}

function TapCount({ item, lastResult, submitting, onSubmit }: {
  item: ExerciseItem; lastResult: ExerciseItemResult | null; submitting: boolean; onSubmit: (a?: string) => void;
}) {
  const word = (item.extra_data?.word as string) || "";
  const maxTaps = (item.extra_data?.max_taps as number) || 6;
  const [count, setCount] = useState(0);

  useEffect(() => { setCount(0); }, [item.index]);

  return (
    <div className="absolute inset-x-0 top-[76px] z-20 flex flex-col items-center pointer-events-none">
      <div className="pointer-events-auto max-w-md w-full px-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="mem-question-panel mb-3">
          <p className="mem-question-text">{item.question}</p>
          <p className="text-2xl font-bold text-amber-300 mt-2" style={{ fontFamily: "'Fredoka', sans-serif", textShadow: "0 0 8px rgba(255,215,0,0.4)" }}>{word}</p>
        </div>

        {/* Beat indicators */}
        <div className="flex justify-center gap-2 mb-3">
          {Array.from({ length: maxTaps }, (_, i) => (
            <div key={i} className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${i < count ? "bg-amber-400 border-amber-600 scale-110" : "bg-black/30 border-white/20"}`} />
          ))}
        </div>

        <p className="text-center text-white/80 text-lg font-bold mb-3" style={{ fontFamily: "'Fredoka', sans-serif" }}>
          {count} {count === 1 ? "beat" : "beats"}
        </p>

        <div className="flex gap-2 justify-center mb-3">
          <button
            onClick={() => { if (!lastResult && !submitting) { UISounds.click(); setCount(p => Math.min(p + 1, maxTaps)); } }}
            disabled={!!lastResult || submitting}
            className="mem-submit-btn px-8"
          >
            🥁 TAP!
          </button>
          <button
            onClick={() => { if (!lastResult && !submitting) { UISounds.click(); setCount(p => Math.max(0, p - 1)); } }}
            disabled={!!lastResult || submitting || count === 0}
            className="mem-undo-btn"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {!lastResult && count > 0 && (
          <button onClick={() => { UISounds.submit(); onSubmit(String(count)); }} disabled={submitting} className="mem-submit-btn w-full">
            {submitting ? "Checking..." : "Submit Count"}
          </button>
        )}

        {lastResult && (
          <div className={`mem-result ${lastResult.is_correct ? "mem-result-correct" : "mem-result-wrong"}`}>
            {lastResult.is_correct ? `✓ Correct! +${lastResult.points_earned}` : `✗ Answer: ${lastResult.correct_answer}`}
          </div>
        )}
      </div>
    </div>
  );
}

function TapRepeat({ item, lastResult, submitting, onSubmit }: {
  item: ExerciseItem; lastResult: ExerciseItemResult | null; submitting: boolean; onSubmit: (a?: string) => void;
}) {
  const sequence = (item.extra_data?.sequence as number[]) || [];
  const showDuration = ((item.extra_data?.show_duration_seconds as number) || 3) * 1000;
  const [phase, setPhase] = useState<"show" | "play">("show");
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [tapped, setTapped] = useState<number[]>([]);

  useEffect(() => {
    setPhase("show");
    setTapped([]);
    setHighlightIdx(-1);
    sequence.forEach((_, idx) => {
      setTimeout(() => setHighlightIdx(idx), idx * 600);
      setTimeout(() => setHighlightIdx(-1), idx * 600 + 400);
    });
    setTimeout(() => setPhase("play"), showDuration);
  }, [item.index]);

  return (
    <div className="absolute inset-x-0 top-[76px] z-20 flex flex-col items-center pointer-events-none">
      <div className="pointer-events-auto max-w-md w-full px-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="mem-question-panel mb-3">
          <p className="mem-question-text">
            {phase === "show" ? "⚡ Watch the sequence!" : "Now tap the numbers in order!"}
          </p>
        </div>

        {/* Show phase: numbers revealed one by one */}
        {phase === "show" && (
          <div className="flex justify-center gap-2 mb-3">
            {sequence.map((num, idx) => (
              <div
                key={idx}
                className={`mem-seq-cell transition-all duration-200 ${idx === highlightIdx ? "mem-seq-active" : "mem-seq-hidden"}`}
              >
                {idx === highlightIdx ? num : "?"}
              </div>
            ))}
          </div>
        )}

        {/* Play phase: number pad + tapped sequence */}
        {phase === "play" && (
          <>
            <div className="flex justify-center gap-1.5 mb-3 min-h-[44px]">
              {tapped.map((num, idx) => (
                <div key={idx} className="mem-seq-cell mem-seq-tapped">{num}</div>
              ))}
              {Array.from({ length: sequence.length - tapped.length }, (_, i) => (
                <div key={`e-${i}`} className="mem-seq-cell mem-seq-empty" />
              ))}
            </div>

            <div className="grid grid-cols-5 gap-1.5 max-w-[260px] mx-auto mb-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => { if (!lastResult && !submitting) { UISounds.tile(); setTapped(p => [...p, num]); } }}
                  disabled={!!lastResult || submitting}
                  className="mem-numpad-btn"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setTapped(p => p.slice(0, -1))}
                disabled={!!lastResult || submitting || tapped.length === 0}
                className="mem-undo-btn"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {!lastResult && tapped.length === sequence.length && (
              <button onClick={() => { UISounds.submit(); onSubmit(tapped.join(",")); }} disabled={submitting} className="mem-submit-btn w-full">
                {submitting ? "Checking..." : "⚔ Submit Sequence"}
              </button>
            )}
          </>
        )}

        {lastResult && (
          <div className={`mem-result ${lastResult.is_correct ? "mem-result-correct" : "mem-result-wrong"}`}>
            {lastResult.is_correct ? `✓ Correct! +${lastResult.points_earned}` : `✗ Answer: ${lastResult.correct_answer}`}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TRACKING — Show arrows → User selects final direction
   ═══════════════════════════════════════════════════════════════════════ */

const DIR_ICONS: Record<string, React.ReactNode> = {
  up: <ArrowUp size={28} />,
  down: <ArrowDown size={28} />,
  left: <ArrowLeft size={28} />,
  right: <ArrowRight size={28} />,
};

function Tracking({ item, lastResult, submitting, onSubmit, onSelectAnswer }: {
  item: ExerciseItem; lastResult: ExerciseItemResult | null; submitting: boolean; onSubmit: (a?: string) => void; onSelectAnswer: (a: string) => void;
}) {
  const directions = (item.extra_data?.directions as string[]) || [];
  const [revealedSteps, setRevealedSteps] = useState(0);
  const [phase, setPhase] = useState<"showing" | "answering">("showing");
  const [selectedDir, setSelectedDir] = useState("");

  useEffect(() => {
    setRevealedSteps(0);
    setPhase("showing");
    setSelectedDir("");
    directions.forEach((_, idx) => {
      setTimeout(() => setRevealedSteps(idx + 1), (idx + 1) * 600);
    });
    // After all arrows shown, wait 1.2s then hide them
    const hideDelay = directions.length * 600 + 1200;
    const hideTimer = setTimeout(() => setPhase("answering"), hideDelay);
    return () => clearTimeout(hideTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.index]);

  return (
    <div className="absolute inset-x-0 top-[76px] z-20 flex flex-col items-center pointer-events-none">
      <div className="pointer-events-auto max-w-md w-full px-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">

        {phase === "showing" ? (
          <>
            <div className="mem-question-panel mb-3">
              <p className="mem-question-text">Follow the trail!</p>
            </div>

            {/* Direction arrows — visible during show phase */}
            <div className="flex justify-center gap-2 flex-wrap mb-4">
              {directions.map((dir, idx) => (
                <div
                  key={idx}
                  className={`mem-arrow-cell transition-all duration-300 ${idx < revealedSteps ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}
                >
                  {DIR_ICONS[dir] || dir}
                </div>
              ))}
            </div>

            <p className="text-center text-white/50 text-sm font-semibold" style={{ fontFamily: "'Fredoka', sans-serif" }}>
              Remember the last direction...
            </p>
          </>
        ) : (
          <>
            <div className="mem-question-panel mb-3">
              <p className="mem-question-text">What was the LAST direction?</p>
            </div>

            {/* Answer selection — arrows are now hidden */}
            {!lastResult && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {["up", "down", "left", "right"].map(dir => (
                  <button
                    key={dir}
                    onClick={() => { UISounds.select(); setSelectedDir(dir); onSelectAnswer(dir); }}
                    disabled={submitting || !!lastResult}
                    className={`mem-dir-btn ${selectedDir === dir ? "mem-dir-selected" : ""}`}
                  >
                    {DIR_ICONS[dir]}
                    <span className="text-xs capitalize font-bold">{dir}</span>
                  </button>
                ))}
              </div>
            )}

            {!lastResult && selectedDir && (
              <button onClick={() => { UISounds.submit(); onSubmit(selectedDir); }} disabled={submitting} className="mem-submit-btn w-full">
                {submitting ? "Checking..." : "Submit Direction"}
              </button>
            )}

            {lastResult && (
              <div className={`mem-result ${lastResult.is_correct ? "mem-result-correct" : "mem-result-wrong"}`}>
                {lastResult.is_correct ? `✓ Correct! +${lastResult.points_earned}` : `✗ Answer: ${lastResult.correct_answer}`}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PATTERN MATCH — Study pattern → Pick matching one
   ═══════════════════════════════════════════════════════════════════════ */

function PatternMatch({ item, lastResult, submitting, onSubmit, onSelectAnswer }: {
  item: ExerciseItem; lastResult: ExerciseItemResult | null; submitting: boolean; onSubmit: (a?: string) => void; onSelectAnswer: (a: string) => void;
}) {
  const targetPattern = (item.extra_data?.target_pattern as string) || "";
  const studyTime = ((item.extra_data?.study_time_seconds as number) || 3) * 1000;
  const [phase, setPhase] = useState<"study" | "match">("study");
  const [selectedOpt, setSelectedOpt] = useState("");
  const [timeProgress, setTimeProgress] = useState(100);

  useEffect(() => {
    setPhase("study");
    setSelectedOpt("");
    setTimeProgress(100);
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.max(0, 100 - (elapsed / studyTime) * 100);
      setTimeProgress(pct);
      if (pct <= 0) { clearInterval(interval); setPhase("match"); }
    }, 50);
    return () => clearInterval(interval);
  }, [item.index, studyTime]);

  return (
    <div className="absolute inset-x-0 top-[76px] z-20 flex flex-col items-center pointer-events-none">
      <div className="pointer-events-auto max-w-md w-full px-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
        {phase === "study" ? (
          <>
            <div className="mem-question-panel mb-3">
              <p className="mem-question-text">⚡ Study this pattern!</p>
              <div className="mt-2 h-1.5 bg-black/20 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-75" style={{ width: `${timeProgress}%` }} />
              </div>
            </div>
            <div className="mem-pattern-display">
              <span className="text-3xl tracking-widest">{targetPattern}</span>
            </div>
            <button onClick={() => setPhase("match")} className="mem-skip-btn mt-2">
              Ready →
            </button>
          </>
        ) : (
          <>
            <div className="mem-question-panel mb-3">
              <p className="mem-question-text">Which pattern matches?</p>
            </div>
            <div className="space-y-2">
              {(item.options || []).map((opt, i) => {
                const isSel = selectedOpt === opt;
                const showResult = lastResult !== null;
                const isCorrect = showResult && opt === lastResult.correct_answer;
                const isWrong = showResult && isSel && !lastResult.is_correct;

                let cls = "mem-pattern-option";
                if (isCorrect) cls += " mem-pattern-correct";
                else if (isWrong) cls += " mem-pattern-wrong";
                else if (isSel) cls += " mem-pattern-selected";

                return (
                  <button
                    key={i}
                    onClick={() => { if (!submitting && !lastResult) { UISounds.select(); setSelectedOpt(opt); onSelectAnswer(opt); } }}
                    disabled={submitting || !!lastResult}
                    className={cls}
                  >
                    <span className="mem-answer-letter mr-3">{String.fromCharCode(65 + i)}</span>
                    <span className="text-lg tracking-wider">{opt}</span>
                  </button>
                );
              })}
            </div>
            {!lastResult && selectedOpt && (
              <button onClick={() => { UISounds.submit(); onSubmit(selectedOpt); }} disabled={submitting} className="mem-submit-btn w-full mt-3">
                {submitting ? "Checking..." : "Submit Answer"}
              </button>
            )}
            {lastResult && (
              <div className={`mem-result mt-3 ${lastResult.is_correct ? "mem-result-correct" : "mem-result-wrong"}`}>
                {lastResult.is_correct ? `✓ Correct! +${lastResult.points_earned}` : `✗ Answer: ${lastResult.correct_answer}`}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DUAL TASK — Remember word → Solve math → Recall word
   ═══════════════════════════════════════════════════════════════════════ */

function DualTask({ item, lastResult, submitting, onSubmit, onSelectAnswer }: {
  item: ExerciseItem; lastResult: ExerciseItemResult | null; submitting: boolean; onSubmit: (a?: string) => void; onSelectAnswer: (a: string) => void;
}) {
  const extra = item.extra_data as {
    remember_word?: string;
    math_problem?: string;
    math_answer?: string;
    word_options?: string[];
    correct_word?: string;
  };
  const [gamePhase, setGamePhase] = useState<"remember" | "math" | "recall">("remember");
  const [mathSelected, setMathSelected] = useState("");
  const [timeProgress, setTimeProgress] = useState(100);

  useEffect(() => {
    setGamePhase("remember");
    setMathSelected("");
    setTimeProgress(100);
    const startTime = Date.now();
    const duration = 3000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setTimeProgress(pct);
      if (pct <= 0) { clearInterval(interval); setGamePhase("math"); }
    }, 50);
    return () => clearInterval(interval);
  }, [item.index]);

  if (gamePhase === "remember") {
    return (
      <div className="absolute inset-x-0 top-[76px] z-20 flex flex-col items-center pointer-events-none">
        <div className="pointer-events-auto max-w-md w-full px-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="mem-question-panel">
            <p className="mem-question-text">🧠 Remember this word!</p>
            <p className="text-3xl font-bold text-amber-300 mt-3 animate-pulse" style={{ fontFamily: "'Fredoka', sans-serif", textShadow: "0 0 12px rgba(255,215,0,0.5)" }}>
              {extra.remember_word}
            </p>
            <div className="mt-3 h-1.5 bg-black/20 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all duration-75" style={{ width: `${timeProgress}%` }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gamePhase === "math") {
    return (
      <div className="absolute inset-x-0 top-[76px] z-20 flex flex-col items-center pointer-events-none">
        <div className="pointer-events-auto max-w-md w-full px-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="mem-question-panel mb-3">
            <p className="text-xs text-amber-300/70 font-bold mb-1" style={{ fontFamily: "'Fredoka', sans-serif" }}>💡 Don&apos;t forget the word!</p>
            <p className="mem-question-text">Solve this:</p>
            <p className="text-2xl font-bold text-amber-300 mt-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
              {extra.math_problem} = ?
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {(item.options || []).map((opt, i) => (
              <button
                key={i}
                onClick={() => { UISounds.select(); setMathSelected(opt); }}
                className={`mem-option-btn ${mathSelected === opt ? "mem-option-selected" : ""}`}
              >
                {opt}
              </button>
            ))}
          </div>
          {mathSelected && (
            <button onClick={() => setGamePhase("recall")} className="mem-submit-btn w-full">
              Next →
            </button>
          )}
        </div>
      </div>
    );
  }

  // Recall phase
  return (
    <div className="absolute inset-x-0 top-[76px] z-20 flex flex-col items-center pointer-events-none">
      <div className="pointer-events-auto max-w-md w-full px-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="mem-question-panel mb-3">
          <p className="mem-question-text">🧠 What was the word?</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(extra.word_options || []).map((word, i) => {
            const showResult = lastResult !== null;
            const isCorrect = showResult && word === extra.correct_word;
            const isWrong = showResult && word !== extra.correct_word;

            return (
              <button
                key={i}
                onClick={() => { if (!submitting && !lastResult) { UISounds.submit(); onSubmit(extra.math_answer || ""); } }}
                disabled={submitting || !!lastResult}
                className={`mem-option-btn ${isCorrect ? "mem-option-correct" : ""} ${isWrong && lastResult ? "opacity-50" : ""}`}
              >
                {word}
              </button>
            );
          })}
        </div>
        {lastResult && (
          <div className={`mem-result mt-3 ${lastResult.is_correct ? "mem-result-correct" : "mem-result-wrong"}`}>
            {lastResult.is_correct ? `✓ Correct! +${lastResult.points_earned}` : `✗ Answer: ${lastResult.correct_answer}`}
          </div>
        )}
      </div>
    </div>
  );
}

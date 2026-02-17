"use client";

import { useState, useEffect, useRef } from "react";
import { RotateCcw, ArrowRight, Clock, Volume2, Check, X, Lightbulb } from "lucide-react";
import type { ExerciseItem, ExerciseItemResult } from "@/types";
import { SubmitButton, AnswerOption, HintSection, type GameRendererProps } from "./shared";
import { UISounds } from "@/lib/ui-sounds";

export type { GameRendererProps };
export { SubmitButton, AnswerOption, HintSection };

export default function GameRenderer(props: GameRendererProps) {
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
// MULTIPLE CHOICE GAME
// =============================================================================

function MultipleChoiceGame({ item, lastResult, submitting, selectedAnswer, areaColor, onSelectAnswer, onSubmit }: GameRendererProps) {
  return (
    <div className="game-card">
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
    UISounds.tile();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const total = gridSize * gridSize;

  return (
    <div className="game-card">
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
    <div className="game-card text-center">
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
          onClick={() => { if (!lastResult && !submitting) { UISounds.click(); setTapCount(prev => Math.min(prev + 1, maxTaps)); } }}
          disabled={!!lastResult || submitting}
          className="btn-kids px-8 py-4 bg-[#475093]/[0.06] text-[#303FAE] text-lg disabled:opacity-40 min-h-0"
        >
          <Volume2 size={20} className="inline mr-2" />
          TAP!
        </button>
        <button
          onClick={() => { if (!lastResult && !submitting) { UISounds.click(); setTapCount(prev => Math.max(0, prev - 1)); } }}
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.index]);

  return (
    <div className="game-card text-center">
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

function SpeedRoundGame({ item, lastResult, submitting, selectedAnswer, onSelectAnswer, onSubmit }: GameRendererProps) {
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
          setTimeout(() => onSubmit("__timeout__"), 0);
          return 0;
        }
        return prev - 100;
      });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.index]);

  useEffect(() => {
    if (lastResult && timerRef.current) clearInterval(timerRef.current);
  }, [lastResult]);

  const progress = (timeLeft / timeLimit) * 100;
  const isUrgent = progress < 30;

  return (
    <div className="game-card">
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
            <button key={idx} onClick={() => { if (!submitting && !showResult) { UISounds.select(); onSelectAnswer(option); onSubmit(option); } }} disabled={submitting || showResult}
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="game-card">
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
    UISounds.tile();
    setTapped(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  return (
    <div className="game-card text-center">
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
      <div className="game-card">
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
    <div className="game-card">
      {staysVisible && <div className="p-4 bg-gray-50 rounded-2xl mb-4 text-sm text-gray-700 leading-relaxed italic font-medium">{passage}</div>}
      <p className="text-lg text-gray-900 mb-4 font-bold">{item.question}</p>
      <div className="space-y-2.5">
        {item.options.map((option, idx) => {
          const isSelected = selectedAnswer === option;
          const showResult = lastResult !== null;
          return (
            <AnswerOption key={idx} option={option} index={idx} isSelected={isSelected}
              isCorrectAnswer={showResult && option === lastResult!.correct_answer}
              isWrongSelection={showResult && isSelected && !lastResult!.is_correct}
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

function WordBuildingGame({ item, lastResult, submitting, selectedAnswer, onSelectAnswer, onSubmit }: GameRendererProps) {
  const extra = item.extra_data as { sounds?: string[]; original_word?: string; old_sound?: string; new_sound?: string; letters?: string[]; build_mode?: string };
  const buildMode = extra.build_mode || "blend";

  return (
    <div className="game-card">
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
            <button key={idx} onClick={() => { if (!submitting && !showResult) { UISounds.select(); onSelectAnswer(option); } }} disabled={submitting || showResult}
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
    <div className="game-card text-center">
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
              <button key={idx} onClick={() => { if (!submitting && !showResult) { UISounds.select(); onSelectAnswer(option); } }} disabled={submitting || showResult}
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.index]);

  return (
    <div className="game-card text-center">
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
              <button key={dir} onClick={() => { if (!submitting && !showResult) { UISounds.select(); onSelectAnswer(dir); } }} disabled={submitting || showResult}
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
    <div className="game-card text-center">
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

  const submitRecall = () => {
    onSubmit(extra.math_answer);
  };

  if (gamePhase === "remember") {
    return (
      <div className="game-card text-center p-8">
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
      <div className="game-card text-center">
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
    <div className="game-card text-center">
      <p className="text-lg font-bold text-gray-900 mb-4">What was the word?</p>
      <div className="grid grid-cols-2 gap-2.5 max-w-sm mx-auto">
        {(extra.word_options || []).map((word, idx) => {
          const showResult = lastResult !== null;
          return (
            <button key={idx} onClick={() => !submitting && !showResult && submitRecall()} disabled={submitting || showResult}
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
    <div className="game-card text-center">
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

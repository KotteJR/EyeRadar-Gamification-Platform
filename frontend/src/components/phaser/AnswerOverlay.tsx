"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  eventBus,
  GameEvents,
  type PhaseChangePayload,
  type AnswerResultPayload,
} from "@/lib/phaser/EventBus";
import type { ExerciseItem, ExerciseItemResult } from "@/types";
import { UISounds } from "@/lib/ui-sounds";

interface AnswerOverlayProps {
  item: ExerciseItem;
  lastResult: ExerciseItemResult | null;
  submitting: boolean;
  onSubmit: (answer?: string) => void;
  onSelectAnswer: (answer: string) => void;
}

// ─── Interactive grid for spot_target — tap cells to select them ────────
function InteractiveGridAnswer({
  item,
  onSubmit,
  disabled,
}: {
  item: ExerciseItem;
  onSubmit: (answer: string) => void;
  disabled: boolean;
}) {
  const ed = item.extra_data || {};
  const grid = (ed.grid as string[]) || [];
  const cols = (typeof ed.grid_cols === "number" ? ed.grid_cols : 5) as number;
  const target = typeof ed.target === "string" ? (ed.target as string) : "";
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);

  useEffect(() => {
    setSelected(new Set());
  }, [item]);

  const isTarget = (cell: string) =>
    cell.toLowerCase() === target.toLowerCase();

  const toggleCell = (index: number) => {
    if (disabled) return;
    const cell = grid[index];

    if (!isTarget(cell)) {
      setWrongFlash(index);
      setTimeout(() => setWrongFlash(null), 400);
      return;
    }

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const totalTargets = grid.filter((c) => isTarget(c)).length;
  const selectedCount = selected.size;

  const handleDone = () => {
    if (disabled || selectedCount === 0) return;
    onSubmit(String(selectedCount));
  };

  return (
    <>
      <div className="qa-problem-block">
        {target && (
          <p className="qa-hint-text">
            Find: <span className="qa-accent">{target}</span>
          </p>
        )}
        <div
          className="qa-letter-grid"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {grid.map((cell, i) => {
            const tapped = selected.has(i);
            const flashing = wrongFlash === i;
            return (
              <button
                key={i}
                onClick={() => { UISounds.tile(); toggleCell(i); }}
                disabled={disabled}
                className={`qa-grid-cell qa-grid-cell-btn ${
                  tapped
                    ? "qa-grid-cell-correct"
                    : flashing
                    ? "qa-grid-cell-wrong"
                    : ""
                } ${disabled ? "opacity-60 cursor-default" : ""}`}
              >
                {cell}
              </button>
            );
          })}
        </div>
        <p className="qa-hint-sub mt-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
          {selectedCount > 0
            ? `${selectedCount} / ${totalTargets} found`
            : "Tap the matching letters"}
        </p>
      </div>
      <div className="mt-3 flex justify-center">
        <button
          onClick={() => { UISounds.submit(); handleDone(); }}
          disabled={disabled || selectedCount === 0}
          className="qa-btn-submit disabled:opacity-40"
        >
          Done ({selectedCount})
        </button>
      </div>
    </>
  );
}

// ─── Render the problem content that the question references ─────────────
function ProblemDisplay({ item }: { item: ExerciseItem }) {
  const ed = item.extra_data || {};
  const type = item.item_type;

  if (type === "timed_reading" && typeof ed.passage === "string") {
    return (
      <div className="qa-problem-block">
        <p className="qa-passage">{ed.passage}</p>
      </div>
    );
  }

  if (type === "word_building" && typeof ed.original_word === "string") {
    return (
      <div className="qa-problem-block">
        <p className="qa-word-display">{ed.original_word}</p>
        {typeof ed.old_sound === "string" && typeof ed.new_sound === "string" && (
          <p className="qa-hint-text">
            Change <span className="qa-accent">&apos;{ed.old_sound}&apos;</span> to{" "}
            <span className="qa-accent">&apos;{ed.new_sound}&apos;</span>
          </p>
        )}
      </div>
    );
  }

  if (type === "word_building" && typeof ed.start_word === "string") {
    return (
      <div className="qa-problem-block">
        <p className="qa-word-display">{ed.start_word}</p>
        {typeof ed.target_word === "string" && (
          <p className="qa-hint-text">
            Change to: <span className="qa-accent">{ed.target_word}</span>
          </p>
        )}
      </div>
    );
  }

  if (type === "word_building" && Array.isArray(ed.sounds)) {
    return (
      <div className="qa-problem-block">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {(ed.sounds as string[]).map((s, i) => (
            <span key={i} className="qa-sound-chip">{s}</span>
          ))}
        </div>
        <p className="qa-hint-text">Blend these sounds together</p>
      </div>
    );
  }

  if (type === "fill_blank" && typeof ed.partial_display === "string") {
    return (
      <div className="qa-problem-block">
        <p className="qa-word-display" style={{ letterSpacing: "0.2em" }}>
          {ed.partial_display}
        </p>
        <p className="qa-hint-text">Fill in the missing letters</p>
      </div>
    );
  }

  if (type === "fill_blank" && typeof ed.sentence === "string") {
    const sentence = ed.sentence as string;
    const target = typeof ed.target_word === "string" ? (ed.target_word as string) : null;
    if (target) {
      const idx = sentence.toLowerCase().indexOf(target.toLowerCase());
      if (idx >= 0) {
        return (
          <div className="qa-problem-block">
            <p className="qa-passage">
              {sentence.slice(0, idx)}
              <span className="qa-accent-underline">{sentence.slice(idx, idx + target.length)}</span>
              {sentence.slice(idx + target.length)}
            </p>
          </div>
        );
      }
    }
    return (
      <div className="qa-problem-block">
        <p className="qa-passage">{sentence}</p>
      </div>
    );
  }

  if (type === "text_input" && typeof ed.original_word === "string") {
    return (
      <div className="qa-problem-block">
        <p className="qa-word-display">{ed.original_word}</p>
        <p className="qa-hint-text">Spell this word backwards</p>
      </div>
    );
  }

  if (type === "speed_round") {
    const display = ed.display_item || ed.target_word || ed.display_emoji;
    if (typeof display === "string") {
      return (
        <div className="qa-problem-block">
          <p className="qa-word-display">{display}</p>
          {typeof ed.time_limit_seconds === "number" && (
            <p className="qa-hint-text">{ed.time_limit_seconds}s time limit</p>
          )}
        </div>
      );
    }
  }

  if (type === "sorting" && Array.isArray(ed.events)) {
    return (
      <div className="qa-problem-block">
        <p className="qa-hint-text">Put these events in order:</p>
        <div className="flex flex-col gap-1.5 mt-1">
          {(ed.events as string[]).map((ev, i) => (
            <div key={i} className="qa-event-chip">{ev}</div>
          ))}
        </div>
      </div>
    );
  }

  const word = ed.word ?? ed.display_item ?? ed.target_word ?? ed.original_word;
  const target = ed.target;
  const passage = ed.passage ?? ed.sentence;

  if (typeof passage === "string") {
    return (
      <div className="qa-problem-block">
        <p className="qa-passage">{passage}</p>
      </div>
    );
  }
  if (typeof word === "string") {
    return (
      <div className="qa-problem-block">
        <p className="qa-word-display">{word}</p>
      </div>
    );
  }
  if (typeof target === "string") {
    return (
      <div className="qa-problem-block">
        <p className="qa-hint-text">
          Target: <span className="qa-accent">{target}</span>
        </p>
      </div>
    );
  }

  return null;
}

// ─── Main Overlay ─────────────────────────────────────────────────────────
export default function AnswerOverlay({
  item,
  lastResult,
  submitting,
  onSubmit,
  onSelectAnswer,
}: AnswerOverlayProps) {
  const [animating, setAnimating] = useState(false);
  const prevItemRef = useRef(item);

  useEffect(() => {
    if (prevItemRef.current !== item) {
      prevItemRef.current = item;
      setAnimating(false);
    }
  }, [item]);

  useEffect(() => {
    const unsub = eventBus.on(GameEvents.PHASE_CHANGE, (detail) => {
      const d = detail as PhaseChangePayload;
      if (d.phase === "correct" || d.phase === "incorrect") {
        setAnimating(true);
      } else if (d.phase === "ready") {
        setAnimating(false);
      }
    });
    return () => unsub();
  }, []);

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

  const handleAnswer = useCallback(
    (answer: string) => {
      if (submitting || lastResult) return;
      onSelectAnswer(answer);
      onSubmit(answer);
    },
    [submitting, lastResult, onSelectAnswer, onSubmit]
  );

  const showQuestion = !lastResult && !animating && !submitting;
  const showResult = !!lastResult;

  const options = item.options || [];
  const needsTextInput = ["text_input", "fill_blank"].includes(item.item_type);
  const hasOptions = options.length > 0;
  const isGridType =
    item.item_type === "spot_target" && Array.isArray(item.extra_data?.grid);

  return (
    <div className="absolute inset-x-0 top-[76px] z-20 flex flex-col items-center pointer-events-none">
      {showQuestion && (
        <div className="pointer-events-auto max-w-lg w-full px-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* ══ Question panel — uses dialog-question.png as CSS background ══ */}
          <div className="qa-dialog">
            <p className="qa-question">{item.question}</p>

            {isGridType ? (
              <InteractiveGridAnswer
                item={item}
                onSubmit={handleAnswer}
                disabled={submitting}
              />
            ) : (
              <ProblemDisplay item={item} />
            )}
          </div>

          {/* ══ Answer buttons — each uses answer-btn-normal.png as background ══ */}
          {!isGridType && (
            <div className="mt-3">
              {needsTextInput ? (
                <TextInputAnswer
                  onSubmit={handleAnswer}
                  disabled={submitting}
                />
              ) : hasOptions ? (
                <div
                  className={`grid gap-2.5 ${
                    options.length <= 2
                      ? "grid-cols-2"
                      : options.length === 3
                      ? "grid-cols-3"
                      : "grid-cols-2"
                  }`}
                >
                  {options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => { UISounds.select(); handleAnswer(opt); }}
                      disabled={submitting}
                      className={`qa-answer-btn-px ${
                        submitting ? "opacity-50 pointer-events-none" : ""
                      }`}
                    >
                      <span className="qa-answer-btn-text">{opt}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <TextInputAnswer
                  onSubmit={handleAnswer}
                  disabled={submitting}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ Result feedback — dedicated correct/wrong panel images ══ */}
      {showResult && lastResult && (
        <div className="pointer-events-auto animate-in zoom-in duration-150 mt-4">
          <div className={`qa-result-panel ${lastResult.is_correct ? "qa-result-correct" : "qa-result-wrong"}`}>
            {lastResult.is_correct ? (
              <span className="qa-result-text">
                Correct! +{lastResult.points_earned}
              </span>
            ) : (
              <div className="text-center">
                <p className="qa-result-text">Wrong</p>
                <p className="qa-result-sub">
                  Answer: {lastResult.correct_answer}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TextInputAnswer({
  onSubmit,
  disabled,
}: {
  onSubmit: (answer: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="flex gap-2 max-w-sm mx-auto">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) onSubmit(value.trim());
        }}
        placeholder="Type your answer..."
        disabled={disabled}
        className="qa-input flex-1"
        autoFocus
      />
      <button
        onClick={() => { if (value.trim()) { UISounds.submit(); onSubmit(value.trim()); } }}
        disabled={disabled || !value.trim()}
        className="qa-btn-submit disabled:opacity-40"
      >
        Submit
      </button>
    </div>
  );
}

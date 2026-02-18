"use client";

import { useState, useEffect } from "react";
import { Check, X, ImageIcon, Brain } from "lucide-react";
import { UISounds } from "@/lib/ui-sounds";
import { SubmitButton, type GameRendererProps } from "./shared";

/**
 * Memory Recall
 *
 * extra_data shape:
 * {
 *   mode: "pick_seen" | "pick_unseen" | "match_pairs"
 *   seen_images?: { id: string; url: string; label: string }[]   — images from earlier in session
 *   all_images?: { id: string; url: string; label: string }[]    — all choices (seen + distractors)
 *   pick_count?: number — how many to select (default: number of seen_images)
 *   grid_cols?: number  — columns (default 3)
 * }
 *
 * After completing earlier exercises (like word-image matching or RAN),
 * the child must recall which images they saw during the session.
 *
 * Modes:
 * - pick_seen: Select the images you remember seeing
 * - pick_unseen: Select the images you did NOT see
 * - match_pairs: Not yet implemented (future)
 */

type RecallImage = {
  id: string;
  url: string;
  label: string;
};

export default function MemoryRecallGame({
  item,
  lastResult,
  submitting,
  onSubmit,
}: GameRendererProps) {
  const extra = item.extra_data as {
    mode?: "pick_seen" | "pick_unseen";
    seen_images?: RecallImage[];
    all_images?: RecallImage[];
    pick_count?: number;
    grid_cols?: number;
  };

  const mode = extra.mode || "pick_seen";
  const allImages = extra.all_images || [];
  const seenImages = extra.seen_images || [];
  const pickCount = extra.pick_count || seenImages.length;
  const cols = extra.grid_cols || 3;

  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [item.index]);

  const toggleImage = (id: string) => {
    if (lastResult || submitting) return;
    UISounds.tile();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size < pickCount) {
          next.add(id);
        }
      }
      return next;
    });
  };

  const handleSubmit = () => {
    const answer = Array.from(selected).sort().join(",");
    onSubmit(answer);
  };

  const showResult = lastResult !== null;
  const seenIds = new Set(seenImages.map((i) => i.id));

  return (
    <div className="game-card">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-bold mb-2">
          <Brain size={14} />
          Memory Challenge
        </div>
        <p className="text-lg font-bold text-gray-900">
          {item.question ||
            (mode === "pick_seen"
              ? "Which images did you see earlier?"
              : "Which images did you NOT see?")}
        </p>
        <p className="text-sm text-gray-400 font-medium mt-1">
          Select {pickCount} image{pickCount !== 1 ? "s" : ""}
          {" "}({selected.size}/{pickCount} chosen)
        </p>
      </div>

      {/* Image grid */}
      <div
        className="grid gap-3 justify-center mb-4"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          maxWidth: `${cols * 120}px`,
          margin: "0 auto",
        }}
      >
        {allImages.map((img) => {
          const isSelected = selected.has(img.id);
          const isSeen = seenIds.has(img.id);
          const isCorrectPick =
            showResult &&
            ((mode === "pick_seen" && isSeen && isSelected) ||
              (mode === "pick_unseen" && !isSeen && isSelected));
          const isMissed =
            showResult &&
            ((mode === "pick_seen" && isSeen && !isSelected) ||
              (mode === "pick_unseen" && !isSeen && !isSelected));
          const isWrongPick =
            showResult &&
            ((mode === "pick_seen" && !isSeen && isSelected) ||
              (mode === "pick_unseen" && isSeen && isSelected));

          let border = "border-gray-100";
          let bg = "bg-white";
          if (isCorrectPick) {
            border = "border-emerald-400";
            bg = "bg-emerald-50";
          } else if (isWrongPick) {
            border = "border-red-400";
            bg = "bg-red-50";
          } else if (isMissed) {
            border = "border-amber-300";
            bg = "bg-amber-50";
          } else if (isSelected) {
            border = "border-[#475093]";
            bg = "bg-[#475093]/[0.04]";
          }

          return (
            <button
              key={img.id}
              onClick={() => toggleImage(img.id)}
              disabled={submitting || showResult}
              className={`relative rounded-2xl border-3 p-2 transition-all active:scale-95 ${border} ${bg}`}
            >
              {img.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img.url}
                  alt={img.label}
                  className="w-full aspect-square object-contain rounded-xl"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-gray-50 rounded-xl">
                  <ImageIcon size={28} className="text-gray-300" />
                </div>
              )}

              <p className="text-xs font-semibold text-gray-500 mt-1 truncate">
                {img.label}
              </p>

              {/* Selection indicator */}
              {isSelected && !showResult && (
                <div className="absolute top-1 right-1 w-6 h-6 bg-[#475093] rounded-full flex items-center justify-center">
                  <Check size={14} className="text-white" strokeWidth={3} />
                </div>
              )}

              {/* Result indicators */}
              {isCorrectPick && (
                <div className="absolute top-1 right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Check size={14} className="text-white" strokeWidth={3} />
                </div>
              )}
              {isWrongPick && (
                <div className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <X size={14} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!lastResult && (
        <SubmitButton
          onClick={handleSubmit}
          disabled={submitting || selected.size === 0}
          submitting={submitting}
          label={`Check Memory (${selected.size}/${pickCount})`}
        />
      )}

      {showResult && (
        <div
          className={`mt-3 p-3 rounded-2xl border-2 text-center ${
            lastResult.is_correct
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <p
            className={`text-sm font-bold ${
              lastResult.is_correct ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {lastResult.is_correct
              ? `Excellent memory! +${lastResult.points_earned} points`
              : "Some images were missed. Keep training your memory!"}
          </p>
        </div>
      )}
    </div>
  );
}

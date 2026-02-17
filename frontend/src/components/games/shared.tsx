"use client";

import { Check, X, Lightbulb } from "lucide-react";
import type { ExerciseItem, ExerciseItemResult } from "@/types";
import { UISounds } from "@/lib/ui-sounds";

export interface GameRendererProps {
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

export function SubmitButton({
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
      onClick={() => { UISounds.submit(); onClick(); }}
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

export function AnswerOption({
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
      onClick={() => { UISounds.select(); onClick(); }}
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

export function HintSection({ hint }: { hint?: string }) {
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

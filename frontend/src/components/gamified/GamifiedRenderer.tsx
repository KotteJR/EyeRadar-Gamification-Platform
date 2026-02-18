"use client";

import React from "react";
import dynamic from "next/dynamic";
import CardDealer from "./CardDealer";
import MemoryBlocks from "./MemoryBlocks";
import RunnerMode from "./RunnerMode";
import PuzzleBridge from "./PuzzleBridge";
import type { ExerciseItem, ExerciseItemResult, DeficitArea } from "@/types";
import { DEFICIT_AREA_THEME, type WorldTheme } from "@/lib/level-config";

const DragonBattle = dynamic(() => import("./DragonBattle"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

interface GamifiedRendererProps {
  item: ExerciseItem;
  lastResult: ExerciseItemResult | null;
  submitting: boolean;
  selectedAnswer: string;
  textInput: string;
  onSelectAnswer: (answer: string) => void;
  onTextInput: (text: string) => void;
  onSubmit: (answer?: string) => void;
  progress: number;
  maxProgress: number;
  streak: number;
  points: number;
  deficitArea?: DeficitArea;
}

export default function GamifiedRenderer(props: GamifiedRendererProps) {
  const { item, deficitArea } = props;
  const type = item.item_type;

  // Determine world theme from deficit area
  const worldTheme: WorldTheme = deficitArea
    ? DEFICIT_AREA_THEME[deficitArea]
    : "grassland";

  switch (type) {
    case "multiple_choice":
    case "yes_no":
    case "image_match":
    case "sound_matching":
    case "word_sound_match":
    case "word_image_match":
      return (
        <DragonBattle
          item={item}
          lastResult={props.lastResult}
          submitting={props.submitting}
          selectedAnswer={props.selectedAnswer}
          onSelectAnswer={props.onSelectAnswer}
          onSubmit={props.onSubmit}
          progress={props.progress}
          maxProgress={props.maxProgress}
          streak={props.streak}
          points={props.points}
          worldTheme={worldTheme}
        />
      );

    case "pattern_match":
    case "memory_recall":
      return (
        <CardDealer
          item={item}
          lastResult={props.lastResult}
          submitting={props.submitting}
          onSelectAnswer={props.onSelectAnswer}
          onSubmit={props.onSubmit}
          progress={props.progress}
          maxProgress={props.maxProgress}
          streak={props.streak}
          points={props.points}
          worldTheme={worldTheme}
        />
      );

    case "grid_memory":
      return (
        <MemoryBlocks
          item={item}
          lastResult={props.lastResult}
          submitting={props.submitting}
          onSubmit={props.onSubmit}
          progress={props.progress}
          maxProgress={props.maxProgress}
          streak={props.streak}
          points={props.points}
          worldTheme={worldTheme}
        />
      );

    case "speed_round":
    case "spot_target":
    case "tracking":
    case "timed_reading":
    case "grid_naming":
    case "voice_input":
    case "rapid_naming":
      return (
        <RunnerMode
          item={item}
          lastResult={props.lastResult}
          submitting={props.submitting}
          onSubmit={props.onSubmit}
          progress={props.progress}
          maxProgress={props.maxProgress}
          streak={props.streak}
          points={props.points}
          timeLimit={type === "timed_reading" ? 30 : type === "speed_round" ? 8 : type === "rapid_naming" ? 30 : 15}
          worldTheme={worldTheme}
        />
      );

    case "word_building":
    case "sorting":
    case "fill_blank":
    case "text_input":
    case "sequence_tap":
    case "dual_task":
    case "read_aloud":
      return (
        <PuzzleBridge
          item={item}
          lastResult={props.lastResult}
          submitting={props.submitting}
          onSubmit={props.onSubmit}
          progress={props.progress}
          maxProgress={props.maxProgress}
          streak={props.streak}
          points={props.points}
          worldTheme={worldTheme}
        />
      );

    default:
      return (
        <DragonBattle
          item={item}
          lastResult={props.lastResult}
          submitting={props.submitting}
          selectedAnswer={props.selectedAnswer}
          onSelectAnswer={props.onSelectAnswer}
          onSubmit={props.onSubmit}
          progress={props.progress}
          maxProgress={props.maxProgress}
          streak={props.streak}
          points={props.points}
          worldTheme={worldTheme}
        />
      );
  }
}

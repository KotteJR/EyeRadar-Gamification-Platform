"use client";

import React from "react";
import BossEncounter from "./BossEncounter";
import CardDealer from "./CardDealer";
import MemoryBlocks from "./MemoryBlocks";
import RunnerMode from "./RunnerMode";
import PuzzleBridge from "./PuzzleBridge";
import type { ExerciseItem, ExerciseItemResult, DeficitArea } from "@/types";
import { DEFICIT_AREA_THEME, type WorldTheme } from "@/lib/level-config";

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
      return (
        <BossEncounter
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
          timeLimit={type === "timed_reading" ? 30 : type === "speed_round" ? 8 : 15}
          worldTheme={worldTheme}
        />
      );

    case "word_building":
    case "sorting":
    case "fill_blank":
    case "text_input":
    case "sequence_tap":
    case "dual_task":
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
        <BossEncounter
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

import Link from "next/link";
import type { GameDefinition, GameType } from "@/types";
import { DEFICIT_AREA_LABELS, DEFICIT_AREA_COLORS } from "@/types";

const GAME_TYPE_LABELS: Record<GameType, { label: string; emoji: string }> = {
  multiple_choice: { label: "Quiz", emoji: "📝" },
  grid_memory: { label: "Memory Grid", emoji: "🧠" },
  sequence_tap: { label: "Tap Sequence", emoji: "🔢" },
  text_input: { label: "Type It", emoji: "⌨️" },
  sorting: { label: "Sort & Order", emoji: "📋" },
  speed_round: { label: "Speed Round", emoji: "⚡" },
  word_building: { label: "Word Builder", emoji: "🧩" },
  timed_reading: { label: "Timed Read", emoji: "⏱️" },
  spot_target: { label: "Spot It", emoji: "🔍" },
  fill_blank: { label: "Fill In", emoji: "✏️" },
  tracking: { label: "Track Path", emoji: "👁️" },
  pattern_match: { label: "Match Pattern", emoji: "🎨" },
  dual_task: { label: "Dual Task", emoji: "🧠" },
};

interface GameCardProps {
  game: GameDefinition;
  studentId?: string;
}

export default function GameCard({ game, studentId }: GameCardProps) {
  const areaColor = DEFICIT_AREA_COLORS[game.deficit_area];
  const areaLabel = DEFICIT_AREA_LABELS[game.deficit_area];
  const gameTypeInfo = GAME_TYPE_LABELS[game.game_type] || {
    label: "Game",
    emoji: "🎮",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden card-hover shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl">{game.icon}</span>
          <div className="flex flex-col gap-1.5 items-end">
            <span
              className="text-[11px] font-medium px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: `${areaColor}12`,
                color: areaColor,
              }}
            >
              {areaLabel}
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500">
              {gameTypeInfo.emoji} {gameTypeInfo.label}
            </span>
          </div>
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          {game.name}
        </h3>
        <p className="text-sm text-slate-400 line-clamp-2 mb-3">
          {game.description}
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="px-2 py-0.5 rounded-md bg-slate-50">
            Ages {game.age_range_min}–{game.age_range_max}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-50">
            {game.mechanics}
          </span>
        </div>
      </div>
      {studentId && (
        <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/40">
          <Link
            href={`/exercises/play?studentId=${studentId}&gameId=${game.id}`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Play Now &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

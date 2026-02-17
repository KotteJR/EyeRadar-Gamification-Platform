import Link from "next/link";
import type { GameDefinition, GameType } from "@/types";
import { DEFICIT_AREA_LABELS, DEFICIT_AREA_COLORS } from "@/types";
import GameIcon from "@/components/GameIcon";
import { getGameAsset, GAME_TYPE_ICONS } from "@/lib/game-assets";
import { Play, Lock } from "lucide-react";

const GAME_TYPE_LABELS: Record<GameType, string> = {
  multiple_choice: "Quiz",
  grid_memory: "Memory Grid",
  sequence_tap: "Tap Sequence",
  text_input: "Type It",
  sorting: "Sort & Order",
  speed_round: "Speed Round",
  word_building: "Word Builder",
  timed_reading: "Timed Read",
  spot_target: "Spot It",
  fill_blank: "Fill In",
  tracking: "Track Path",
  pattern_match: "Match Pattern",
  dual_task: "Dual Task",
  yes_no: "Yes / No",
  voice_input: "Read Aloud",
  image_match: "Image Match",
  grid_naming: "Speed Naming",
};

interface GameCardProps {
  game: GameDefinition;
  studentId?: string;
  locked?: boolean;
}

export default function GameCard({ game, studentId, locked }: GameCardProps) {
  const areaColor = DEFICIT_AREA_COLORS[game.deficit_area];
  const areaLabel = DEFICIT_AREA_LABELS[game.deficit_area];
  const asset = getGameAsset(game.id);
  const gameTypeLabel = GAME_TYPE_LABELS[game.game_type] || "Game";
  const gameTypeIcon = GAME_TYPE_ICONS[game.game_type] || "Gamepad2";

  const cardContent = (
    <div
      className={`game-card-kids relative group ${locked ? "opacity-60 grayscale" : ""}`}
    >
      {/* Image area */}
      <div
        className="relative h-44 overflow-hidden rounded-t-[15px]"
        style={{ background: `linear-gradient(135deg, ${asset.gradient[0]}, ${asset.gradient[1]})` }}
      >
        <div className="absolute inset-0" style={{
          backgroundImage: `url(${asset.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }} />

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" />

        {/* Lock overlay */}
        {locked && (
          <div className="absolute inset-0 bg-neutral-900/40 flex items-center justify-center z-10">
            <Lock size={32} className="text-white/80" strokeWidth={1.5} />
          </div>
        )}

        {/* Type badge — top right */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/85 backdrop-blur-sm rounded-full px-2 py-1 z-[2]">
          <GameIcon name={gameTypeIcon} size={12} color="#525252" strokeWidth={2} />
          <span className="text-[10px] font-medium text-neutral-600">{gameTypeLabel}</span>
        </div>

        {/* Play button — bottom right */}
        {studentId && !locked && (
          <div className="absolute bottom-2.5 right-3 z-[2]">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm transition-transform group-hover:scale-110">
              <Play size={14} className="text-neutral-800 ml-0.5" fill="currentColor" />
            </div>
          </div>
        )}

        {/* Title on image */}
        <div className="absolute bottom-2.5 left-3 right-14 z-[2]">
          <h3 className="text-sm font-semibold text-white leading-snug drop-shadow-sm">
            {game.name}
          </h3>
        </div>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3">
        <p className="text-xs text-neutral-400 line-clamp-2 mb-2 leading-relaxed">
          {game.description}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${areaColor}10`, color: areaColor }}
          >
            {areaLabel}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white text-neutral-400">
            Ages {game.age_range_min}-{game.age_range_max}
          </span>
        </div>
      </div>
    </div>
  );

  if (studentId && !locked) {
    return (
      <Link href={`/exercises/play?studentId=${studentId}&gameId=${game.id}`}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

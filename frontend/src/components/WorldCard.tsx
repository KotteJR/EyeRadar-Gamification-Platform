import type { WorldSummary } from "@/lib/map-utils";
import { CATEGORY_ASSETS } from "@/lib/game-assets";
import { Star, Lock, ChevronRight } from "lucide-react";

interface WorldCardProps {
  world: WorldSummary;
  onClick: () => void;
}

export default function WorldCard({ world, onClick }: WorldCardProps) {
  const catAsset = CATEGORY_ASSETS[world.area];
  const progressPercent =
    world.totalLevels > 0
      ? Math.round((world.completedLevels / world.totalLevels) * 100)
      : 0;
  const isLocked = false; // All worlds unlocked for now
  const isCompleted = world.completedLevels === world.totalLevels && world.totalLevels > 0;

  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={`group relative w-full overflow-hidden rounded-2xl text-left transition-all duration-200 ${
        isLocked
          ? "opacity-50 cursor-not-allowed grayscale"
          : "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
      }`}
    >
      {/* Background image */}
      <div className="relative h-36 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${catAsset.gradient[0]}, ${catAsset.gradient[1]})`,
          }}
        />
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundImage: `url(${catAsset.image})` }}
        />

        {/* Dark overlay for text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

        {/* World number badge */}
        <div
          className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white z-[2]"
          style={{ backgroundColor: world.color }}
        >
          {world.worldNumber}
        </div>

        {/* Stars earned */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1 z-[2]">
          <Star size={12} className="text-amber-400" fill="currentColor" />
          <span className="text-[11px] font-semibold text-white">
            {world.totalStars}/{world.maxStars}
          </span>
        </div>

        {/* Completion badge */}
        {isCompleted && (
          <div className="absolute top-3 left-14 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full z-[2]">
            Complete
          </div>
        )}

        {/* World name on image */}
        <div className="absolute bottom-3 left-3 right-3 z-[2]">
          <h3 className="text-[15px] font-bold text-white drop-shadow-sm leading-tight">
            {world.worldName}
          </h3>
          <p className="text-[11px] text-white/70 font-medium mt-0.5">
            {world.label}
          </p>
        </div>
      </div>

      {/* Bottom info */}
      <div className="bg-cream px-4 py-3">
        {/* Progress bar */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-neutral-500">
            {world.completedLevels}/{world.totalLevels} levels
          </span>
          <span className="text-[11px] font-semibold text-neutral-700">
            {progressPercent}%
          </span>
        </div>
        <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: world.color,
            }}
          />
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[12px] font-medium text-neutral-400">
            {world.completedLevels === 0
              ? "Start adventure"
              : isCompleted
              ? "Replay levels"
              : "Continue playing"}
          </span>
          <ChevronRight size={14} className="text-neutral-400 group-hover:text-neutral-700 transition-colors" />
        </div>
      </div>
    </button>
  );
}

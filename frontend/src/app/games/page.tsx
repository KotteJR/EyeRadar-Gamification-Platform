"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { GameDefinition, DeficitArea } from "@/types";
import { DEFICIT_AREA_LABELS, DEFICIT_AREA_COLORS } from "@/types";

const ALL_AREAS: DeficitArea[] = [
  "phonological_awareness",
  "rapid_naming",
  "working_memory",
  "visual_processing",
  "reading_fluency",
  "comprehension",
];

export default function GamesPage() {
  const [games, setGames] = useState<GameDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeArea, setActiveArea] = useState<DeficitArea | "all">("all");

  useEffect(() => {
    api
      .getGames()
      .then(setGames)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredGames =
    activeArea === "all"
      ? games
      : games.filter((g) => g.deficit_area === activeArea);

  const areaCount = (area: DeficitArea) =>
    games.filter((g) => g.deficit_area === area).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Game Catalog</h1>
        <p className="text-neutral-400 mt-0.5 text-[13px]">
          {games.length} games across 6 deficit areas.
        </p>
      </div>

      {/* Pill Tab Filters */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        <button
          onClick={() => setActiveArea("all")}
          className={`pill-tab ${activeArea === "all" ? "active" : ""}`}
        >
          All ({games.length})
        </button>
        {ALL_AREAS.map((area) => {
          const count = areaCount(area);
          if (count === 0) return null;
          return (
            <button
              key={area}
              onClick={() => setActiveArea(area)}
              className={`pill-tab ${activeArea === area ? "active" : ""}`}
            >
              {DEFICIT_AREA_LABELS[area]} ({count})
            </button>
          );
        })}
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGames.map((game) => {
          const color = DEFICIT_AREA_COLORS[game.deficit_area] || "#6366f1";
          const areaLabel =
            DEFICIT_AREA_LABELS[game.deficit_area] || game.deficit_area;
          return (
            <div
              key={game.id}
              className="bg-cream rounded-xl overflow-hidden card-hover"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{game.icon}</span>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${color}10`, color }}
                  >
                    {areaLabel}
                  </span>
                </div>
                <h3 className="text-[14px] font-semibold text-neutral-900 mb-1">
                  {game.name}
                </h3>
                <p className="text-xs text-neutral-400 line-clamp-2 mb-3">
                  {game.description}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <span className="px-2 py-0.5 rounded bg-white">
                    Ages {game.age_range_min}–{game.age_range_max}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white capitalize">
                    {game.game_type.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              <div className="px-4 py-2.5">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span>{game.difficulty_levels} difficulty levels</span>
                  <span className="capitalize">{game.mechanics}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Game Catalog</h1>
        <p className="text-slate-400 mt-1 text-sm">
          {games.length} games across 6 deficit areas.
        </p>
      </div>

      {/* Area Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setActiveArea("all")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeArea === "all"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          All ({games.length})
        </button>
        {ALL_AREAS.map((area) => {
          const color = DEFICIT_AREA_COLORS[area];
          const isActive = activeArea === area;
          const count = areaCount(area);
          if (count === 0) return null;
          return (
            <button
              key={area}
              onClick={() => setActiveArea(area)}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all border"
              style={{
                backgroundColor: isActive ? color : "white",
                color: isActive ? "white" : color,
                borderColor: isActive ? color : `${color}30`,
              }}
            >
              {DEFICIT_AREA_LABELS[area]} ({count})
            </button>
          );
        })}
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredGames.map((game) => {
          const color = DEFICIT_AREA_COLORS[game.deficit_area] || "#6366f1";
          const areaLabel =
            DEFICIT_AREA_LABELS[game.deficit_area] || game.deficit_area;
          return (
            <div
              key={game.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden card-hover shadow-sm"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{game.icon}</span>
                  <span
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: `${color}12`, color }}
                  >
                    {areaLabel}
                  </span>
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
                  <span className="px-2 py-0.5 rounded-md bg-slate-50 capitalize">
                    {game.game_type.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/60">
                <div className="flex items-center justify-between text-xs text-slate-400">
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

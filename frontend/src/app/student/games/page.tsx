"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { GameDefinition, DeficitArea } from "@/types";
import { DEFICIT_AREA_LABELS, DEFICIT_AREA_COLORS } from "@/types";
import GameCard from "@/components/GameCard";

const ALL_AREAS: DeficitArea[] = [
  "phonological_awareness",
  "rapid_naming",
  "working_memory",
  "visual_processing",
  "reading_fluency",
  "comprehension",
];

const AREA_DESCRIPTIONS: Record<string, string> = {
  phonological_awareness: "Sound and letter games",
  rapid_naming: "Quick naming challenges",
  working_memory: "Memory and recall",
  visual_processing: "Eye and pattern training",
  reading_fluency: "Speed reading practice",
  comprehension: "Understanding text",
};

export default function StudentGamesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<GameDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeArea, setActiveArea] = useState<DeficitArea | "all">("all");
  const [generating, setGenerating] = useState(false);
  const [selectedAreaForGen, setSelectedAreaForGen] = useState<DeficitArea | "">("");

  useEffect(() => {
    api
      .getGames()
      .then(setGames)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  const ageGames = games.filter(
    (g) => g.age_range_min <= user.age && g.age_range_max >= user.age
  );
  const filtered =
    activeArea === "all"
      ? ageGames
      : ageGames.filter((g) => g.deficit_area === activeArea);

  const handleQuickPlay = async (area: DeficitArea) => {
    if (!user.studentId) return;
    setGenerating(true);
    try {
      const areaGames = ageGames.filter((g) => g.deficit_area === area);
      if (areaGames.length === 0) {
        alert("No games available for this area and your age.");
        setGenerating(false);
        return;
      }
      const game = areaGames[Math.floor(Math.random() * areaGames.length)];
      router.push(`/exercises/play?studentId=${user.studentId}&gameId=${game.id}`);
    } catch {
      setGenerating(false);
    }
  };

  const handleGenerateRandom = async () => {
    if (!user.studentId || ageGames.length === 0) return;
    setGenerating(true);
    let pool = ageGames;
    if (selectedAreaForGen) {
      pool = ageGames.filter((g) => g.deficit_area === selectedAreaForGen);
    }
    if (pool.length === 0) pool = ageGames;
    const game = pool[Math.floor(Math.random() * pool.length)];
    router.push(`/exercises/play?studentId=${user.studentId}&gameId=${game.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link href="/student" className="hover:text-indigo-600 transition-colors">
          Dashboard
        </Link>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-700 font-medium">Games</span>
      </div>

      {/* Generate Game Section */}
      <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/60 rounded-2xl border border-indigo-100/60 p-6 mb-8">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Generate a Game
            </h2>
            <p className="text-sm text-slate-500">
              Pick a skill area and we&apos;ll create a personalized game just for you!
            </p>
          </div>
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
            AI Powered
          </span>
        </div>

        {/* Skill Area Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {ALL_AREAS.map((area) => {
            const color = DEFICIT_AREA_COLORS[area];
            const count = ageGames.filter((g) => g.deficit_area === area).length;
            return (
              <button
                key={area}
                onClick={() => handleQuickPlay(area)}
                disabled={generating || count === 0}
                className="p-4 rounded-xl border-2 text-left transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                style={{ borderColor: `${color}30` }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 text-xs font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {count}
                </div>
                <p className="text-xs font-semibold text-slate-800 leading-tight">
                  {DEFICIT_AREA_LABELS[area]}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {AREA_DESCRIPTIONS[area]}
                </p>
              </button>
            );
          })}
        </div>

        {/* Random Generate Button */}
        <div className="flex items-center gap-3">
          <select
            value={selectedAreaForGen}
            onChange={(e) =>
              setSelectedAreaForGen(e.target.value as DeficitArea | "")
            }
            className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-700"
          >
            <option value="">Any skill area</option>
            {ALL_AREAS.map((area) => (
              <option key={area} value={area}>
                {DEFICIT_AREA_LABELS[area]}
              </option>
            ))}
          </select>
          <button
            onClick={handleGenerateRandom}
            disabled={generating || ageGames.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-indigo-200"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Surprise Me!
              </>
            )}
          </button>
        </div>
      </div>

      {/* Browse All Games */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Browse All Games</h1>
        <p className="text-slate-400 mt-1 text-sm">
          {ageGames.length} games available for your age.
        </p>
      </div>

      {/* Area Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveArea("all")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeArea === "all"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          All ({ageGames.length})
        </button>
        {ALL_AREAS.map((area) => {
          const color = DEFICIT_AREA_COLORS[area];
          const count = ageGames.filter((g) => g.deficit_area === area).length;
          if (count === 0) return null;
          return (
            <button
              key={area}
              onClick={() => setActiveArea(area)}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all border"
              style={{
                backgroundColor: activeArea === area ? color : "white",
                color: activeArea === area ? "white" : color,
                borderColor: activeArea === area ? color : `${color}30`,
              }}
            >
              {DEFICIT_AREA_LABELS[area]} ({count})
            </button>
          );
        })}
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((game) => (
          <GameCard key={game.id} game={game} studentId={user.studentId} />
        ))}
      </div>
    </div>
  );
}

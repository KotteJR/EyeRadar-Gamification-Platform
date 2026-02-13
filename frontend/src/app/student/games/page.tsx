"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { GameDefinition, DeficitArea } from "@/types";
import { DEFICIT_AREA_LABELS, DEFICIT_AREA_COLORS } from "@/types";
import GameCard from "@/components/GameCard";
import { CATEGORY_ASSETS } from "@/lib/game-assets";
import {
  Sparkles,
  ChevronRight,
  Shuffle,
} from "lucide-react";

const ALL_AREAS: DeficitArea[] = [
  "phonological_awareness",
  "rapid_naming",
  "working_memory",
  "visual_processing",
  "reading_fluency",
  "comprehension",
];

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
      <div className="student-ui flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="student-ui">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-neutral-400 mb-6 font-medium">
        <Link href="/student" className="hover:text-neutral-900 transition-colors">
          Dashboard
        </Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900 font-semibold">Games</span>
      </div>

      {/* ─── Generate Game Section ──────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 tracking-tight">
              Generate a Game
            </h2>
            <p className="text-[13px] text-neutral-400 mt-0.5">
              Pick a skill area and we&apos;ll create a personalized game just for you.
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-500">
            <Sparkles size={12} />
            AI Powered
          </span>
        </div>

        {/* Skill Area Image Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {ALL_AREAS.map((area) => {
            const catAsset = CATEGORY_ASSETS[area];
            const count = ageGames.filter((g) => g.deficit_area === area).length;
            return (
              <button
                key={area}
                onClick={() => handleQuickPlay(area)}
                disabled={generating || count === 0}
                className="group relative overflow-hidden rounded-2xl aspect-[4/3] transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(135deg, ${catAsset.gradient[0]}, ${catAsset.gradient[1]})` }}
                />
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                  style={{ backgroundImage: `url(${catAsset.image})` }}
                />
                <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2.5 z-[1]">
                  <p className="text-[12px] font-semibold text-white leading-tight drop-shadow-sm">
                    {DEFICIT_AREA_LABELS[area]}
                  </p>
                  <p className="text-[10px] text-white/60 font-medium">
                    {count} {count === 1 ? "game" : "games"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Random Generate */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedAreaForGen}
              onChange={(e) =>
                setSelectedAreaForGen(e.target.value as DeficitArea | "")
              }
              className="text-[13px] appearance-none bg-transparent text-neutral-500 font-medium pr-5 cursor-pointer hover:text-neutral-900 transition-colors focus:outline-none"
            >
              <option value="">Any skill area</option>
              {ALL_AREAS.map((area) => (
                <option key={area} value={area}>
                  {DEFICIT_AREA_LABELS[area]}
                </option>
              ))}
            </select>
            <ChevronRight size={13} className="absolute right-0 top-1/2 -translate-y-1/2 rotate-90 text-neutral-400 pointer-events-none" />
          </div>
          <button
            onClick={handleGenerateRandom}
            disabled={generating || ageGames.length === 0}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Shuffle size={15} />
                Surprise Me!
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Browse All Games ──────────────────────────────── */}
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-neutral-900 tracking-tight">Browse All Games</h2>
        <p className="text-neutral-400 mt-0.5 text-[13px]">
          {ageGames.length} games available for your age.
        </p>
      </div>

      {/* Pill Tab Filters */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        <button
          onClick={() => setActiveArea("all")}
          className={`pill-tab ${activeArea === "all" ? "active" : ""}`}
        >
          All ({ageGames.length})
        </button>
        {ALL_AREAS.map((area) => {
          const count = ageGames.filter((g) => g.deficit_area === area).length;
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
        {filtered.map((game) => (
          <GameCard key={game.id} game={game} studentId={user.studentId} />
        ))}
      </div>
    </div>
  );
}

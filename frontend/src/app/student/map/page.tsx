"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { GameDefinition, ExerciseSession, DeficitArea, AdventureMap as AdventureMapType } from "@/types";
import {
  computeAllWorldsSummary,
  computeCustomWorldsSummary,
  type WorldSummary,
} from "@/lib/map-utils";
import WorldMap from "@/components/WorldMap";
import { CloudBorder } from "@/components/MapDecorations";
import { WORLD_BIOMES } from "@/components/WorldBiomes";
import { Star, Trophy, Coins, ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

// ─── World positions as percentages (0-100) of the canvas ───────────
// The road S-curve flows through these points.
const WORLD_PCT: { x: number; y: number }[] = [
  { x: 9,  y: 72 },  // 1 — bottom-left
  { x: 26, y: 32 },  // 2 — upper-left
  { x: 44, y: 65 },  // 3 — center-low
  { x: 62, y: 28 },  // 4 — center-high
  { x: 78, y: 60 },  // 5 — right-low
  { x: 93, y: 26 },  // 6 — top-right
];

// Build SVG path from percentage positions (relative to a 1000x500 viewBox)
function buildCurvedPath(pcts: { x: number; y: number }[]): string {
  if (pcts.length < 2) return "";
  const pts = pcts.map((p) => ({ x: p.x * 10, y: p.y * 5 }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const dx = curr.x - prev.x;
    d += ` C ${prev.x + dx * 0.45},${prev.y} ${curr.x - dx * 0.45},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

// ─── World biome node ────────────────────────────────────────────────
function WorldBiomeNode({
  world,
  pct,
  onClick,
}: {
  world: WorldSummary;
  pct: { x: number; y: number };
  onClick: () => void;
}) {
  const BiomeScene = WORLD_BIOMES[world.area];
  const progressPercent =
    world.totalLevels > 0
      ? Math.round((world.completedLevels / world.totalLevels) * 100)
      : 0;
  const isCompleted =
    world.completedLevels === world.totalLevels && world.totalLevels > 0;

  return (
    <div
      className="absolute"
      style={{
        left: `${pct.x}%`,
        top: `${pct.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: 3,
      }}
    >
      <button
        onClick={onClick}
        className="group relative flex flex-col items-center cursor-pointer focus:outline-none"
      >
        {/* Biome illustration — offset upward so badge sits on road */}
        <div className="w-[140px] h-[120px] relative -mb-6">
          {BiomeScene && <BiomeScene className="w-full h-full" />}
        </div>

        {/* Number badge — at the center = on the road */}
        <div
          className="relative w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-extrabold shadow-lg border-[3px] border-white/80 group-hover:shadow-xl transition-all -mt-4 z-[4]"
          style={{ backgroundColor: world.color }}
        >
          {world.worldNumber}

          {/* Stars pill */}
          <div className="absolute -top-5 -right-6 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 shadow-sm border border-neutral-100">
            <Star size={9} className="text-amber-400" fill="currentColor" />
            <span className="text-[8px] font-bold text-neutral-600">
              {world.totalStars}/{world.maxStars}
            </span>
          </div>

          {isCompleted && (
            <div className="absolute -top-4 -left-4 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm border-2 border-white">
              <span className="text-white text-[8px] font-bold">✓</span>
            </div>
          )}
        </div>

        {/* Name + progress */}
        <div className="mt-1.5 text-center">
          <h3 className="text-[11px] font-bold text-neutral-800 leading-tight whitespace-nowrap">
            {world.worldName}
          </h3>
          <p className="text-[9px] text-neutral-400 font-medium mt-0.5 whitespace-nowrap">
            {world.label}
          </p>
          <div className="mt-1 w-20 mx-auto">
            <div className="h-[3px] bg-neutral-200/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%`, backgroundColor: world.color }}
              />
            </div>
            <p className="text-[8px] text-neutral-400 mt-0.5 font-medium">
              {world.completedLevels}/{world.totalLevels} levels
            </p>
          </div>
          <div className="mt-1 flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[9px] font-semibold" style={{ color: world.color }}>Play</span>
            <ChevronRight size={9} style={{ color: world.color }} />
          </div>
        </div>
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
export default function AdventureMapPage() {
  const { user } = useAuth();
  const [games, setGames] = useState<GameDefinition[]>([]);
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorld, setSelectedWorld] = useState<DeficitArea | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [adventure, setAdventure] = useState<AdventureMapType | null>(null);

  useEffect(() => {
    if (!user?.studentId) return;
    async function load() {
      const [g, s, gamification, adv] = await Promise.all([
        api.getGames().catch(() => []),
        api.getStudentSessions(user!.studentId).catch(() => []),
        api.getGamificationSummary(user!.studentId).catch(() => null),
        api.getStudentAdventure(user!.studentId).catch(() => null),
      ]);
      setGames(g);
      setSessions(s);
      if (gamification) setTotalPoints(gamification.total_points);
      if (adv) {
        setAdventure(adv);
        // Auto-update adventure theme if student has interests but theme is still default
        if (
          user?.interests &&
          user.interests.length > 0 &&
          (!adv.theme_config?.color_palette || adv.theme_config.color_palette === "default")
        ) {
          const interestToPalette: Record<string, { color_palette: string; decoration_style: string }> = {
            dinosaurs: { color_palette: "warm", decoration_style: "prehistoric" },
            space: { color_palette: "cosmic", decoration_style: "space" },
            animals: { color_palette: "nature", decoration_style: "wildlife" },
            music: { color_palette: "vibrant", decoration_style: "musical" },
            sports: { color_palette: "energetic", decoration_style: "athletic" },
            art: { color_palette: "rainbow", decoration_style: "creative" },
            nature: { color_palette: "forest", decoration_style: "nature" },
            ocean: { color_palette: "aquatic", decoration_style: "underwater" },
            robots: { color_palette: "tech", decoration_style: "futuristic" },
            "fairy tales": { color_palette: "magical", decoration_style: "fantasy" },
            cooking: { color_palette: "warm", decoration_style: "culinary" },
            cars: { color_palette: "energetic", decoration_style: "racing" },
            superheroes: { color_palette: "vibrant", decoration_style: "heroic" },
            magic: { color_palette: "magical", decoration_style: "fantasy" },
            science: { color_palette: "tech", decoration_style: "futuristic" },
          };
          let matched: { color_palette: string; decoration_style: string } | null = null;
          for (const interest of user.interests) {
            const key = interest.toLowerCase();
            for (const [keyword, theme] of Object.entries(interestToPalette)) {
              if (key.includes(keyword)) { matched = theme; break; }
            }
            if (matched) break;
          }
          if (matched) {
            const updatedTheme = {
              primary_interest: user.interests[0].toLowerCase(),
              color_palette: matched.color_palette,
              decoration_style: matched.decoration_style,
            };
            api.updateAdventure(adv.id, { theme_config: updatedTheme }).then((updated) => {
              setAdventure(updated);
            }).catch(() => {});
          }
        }
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const worlds = useMemo(() => {
    if (!user) return [];
    if (adventure && adventure.worlds.length > 0) {
      return computeCustomWorldsSummary(adventure.worlds, games, sessions);
    }
    return computeAllWorldsSummary(games, sessions, user.age);
  }, [games, sessions, user, adventure]);

  // Theme-based background gradient — derived from adventure config OR student interests
  const themeGradient = useMemo(() => {
    // First try adventure theme config, then derive from student interests
    let palette = adventure?.theme_config?.color_palette || "";

    if (!palette || palette === "default") {
      // Derive palette from student's current interests
      const interestToPalette: Record<string, string> = {
        dinosaurs: "warm", space: "cosmic", animals: "nature", music: "vibrant",
        sports: "energetic", art: "rainbow", nature: "forest", ocean: "aquatic",
        robots: "tech", "fairy tales": "magical", cooking: "warm", cars: "energetic",
        superheroes: "vibrant", magic: "magical", science: "tech",
      };
      const interests = user?.interests || [];
      for (const interest of interests) {
        const key = interest.toLowerCase();
        for (const [keyword, pal] of Object.entries(interestToPalette)) {
          if (key.includes(keyword)) { palette = pal; break; }
        }
        if (palette && palette !== "default") break;
      }
    }

    const PALETTE_GRADIENTS: Record<string, string> = {
      warm: "from-[#FEF7F0] via-[#FEFCE8]/40 to-[#FFF1F2]/30",
      cosmic: "from-[#F0F0FF] via-[#EDE9FE]/40 to-[#E0E7FF]/30",
      nature: "from-[#F0FDF4] via-[#ECFDF5]/40 to-[#F0F9FF]/30",
      forest: "from-[#F0FDF4] via-[#DCFCE7]/40 to-[#D1FAE5]/30",
      vibrant: "from-[#FFF7ED] via-[#FEF3C7]/30 to-[#FCE7F3]/20",
      aquatic: "from-[#EFF6FF] via-[#DBEAFE]/40 to-[#E0F2FE]/30",
      tech: "from-[#F0F9FF] via-[#E0E7FF]/40 to-[#F5F3FF]/30",
      magical: "from-[#FDF4FF] via-[#FAE8FF]/40 to-[#FEF3C7]/20",
      energetic: "from-[#FFF7ED] via-[#FFEDD5]/30 to-[#FEF9C3]/20",
      rainbow: "from-[#FEF9C3] via-[#FBCFE8]/20 to-[#DBEAFE]/20",
    };
    return PALETTE_GRADIENTS[palette] || "from-[#FEF7F0] via-[#FEFCE8]/30 to-[#EFF6FF]/40";
  }, [adventure, user]);

  const positions = WORLD_PCT.slice(0, worlds.length);
  const pathD = useMemo(() => buildCurvedPath(positions), [positions]);

  const totalStars = worlds.reduce((s, w) => s + w.totalStars, 0);
  const maxStars = worlds.reduce((s, w) => s + w.maxStars, 0);
  const totalCompleted = worlds.reduce((s, w) => s + w.completedLevels, 0);
  const totalLevels = worlds.reduce((s, w) => s + w.totalLevels, 0);

  if (!user) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-sky-50 to-amber-50">
        <CloudBorder />
        <div className="flex flex-col items-center gap-3 z-[50]">
          <div className="w-10 h-10 border-3 border-neutral-300 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-[13px] text-neutral-400 font-medium">Loading adventure map...</p>
        </div>
      </div>
    );
  }

  if (selectedWorld) {
    // If adventure exists, only show the games assigned to this world
    const adventureWorld = adventure?.worlds.find((w) => w.deficit_area === selectedWorld);
    const worldGames = adventureWorld
      ? games.filter((g) => adventureWorld.game_ids.includes(g.id))
      : games.filter(
          (g) =>
            g.deficit_area === selectedWorld &&
            g.age_range_min <= user.age &&
            g.age_range_max >= user.age
        );
    return (
      <WorldMap
        area={selectedWorld}
        games={worldGames}
        sessions={sessions}
        studentId={user.studentId}
        avatarConfig={user.avatarConfig}
        avatarSeed={user.username}
        totalPoints={totalPoints}
        onBack={() => setSelectedWorld(null)}
        themeConfig={adventure?.theme_config}
      />
    );
  }

  // ─── Overworld ────────────────────────────────────────────────────
  return (
    <div className={`fixed inset-0 bg-gradient-to-br ${themeGradient} flex flex-col overflow-hidden`}>
      <CloudBorder />

      {/* Header — frosted glass bar matching the world map navbar */}
      <header className="relative z-[50] flex-shrink-0 px-4 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between bg-white/70 backdrop-blur-xl rounded-2xl px-4 py-2 shadow-sm border border-white/50">
          <div className="flex items-center gap-3">
            <Link
              href="/student"
              className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
            >
              <ArrowLeft size={16} className="text-neutral-600" />
            </Link>
            <div>
              <h1 className="text-[14px] font-semibold text-neutral-900 leading-tight">Adventure Map</h1>
              <p className="text-[10px] text-neutral-400 font-medium">Choose a world to explore</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Star size={14} className="text-amber-400" fill="currentColor" />
              <span className="text-[12px] font-bold text-neutral-700">{totalStars}<span className="text-neutral-400 font-medium">/{maxStars}</span></span>
            </div>
            <div className="w-px h-5 bg-neutral-200/60" />
            <div className="flex items-center gap-1.5">
              <Trophy size={14} className="text-purple-400" />
              <span className="text-[12px] font-bold text-neutral-700">{totalCompleted}<span className="text-neutral-400 font-medium">/{totalLevels}</span></span>
            </div>
            <div className="w-px h-5 bg-neutral-200/60" />
            <div className="flex items-center gap-1.5">
              <Coins size={14} className="text-amber-500" />
              <span className="text-[12px] font-bold text-neutral-700">{totalPoints}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Map area — fills remaining space, centers the aspect-ratio box */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10 min-h-0">
        {/* Aspect-ratio container — matches SVG viewBox ratio exactly */}
        <div
          className="relative max-w-full max-h-full"
          style={{ aspectRatio: "2 / 1", width: "min(100%, calc((100vh - 80px) * 2))" }}
        >
          {/* Dot grid */}
          <div
            className="absolute inset-0 opacity-[0.03] rounded-3xl"
            style={{
              backgroundImage: "radial-gradient(circle, #666 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />

          {/* Road SVG — stretches to fill container exactly (no letterbox) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 1000 500"
            preserveAspectRatio="none"
            style={{ zIndex: 1 }}
          >
            <path d={pathD} fill="none" stroke="#00000008" strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
            <path d={pathD} fill="none" stroke="#00000010" strokeWidth={15} strokeLinecap="round" strokeLinejoin="round" />
            <path d={pathD} fill="none" stroke="#E8DCC8" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
            <path d={pathD} fill="none" stroke="#D4C9B5" strokeWidth={1.5} strokeDasharray="8 6" strokeLinecap="round" opacity={0.5} className="map-road-dash" />

            {/* ─── Scattered decorations — randomly distributed ─── */}

            {/* Pine trees — varied sizes, spread across canvas */}
            <g opacity="0.55">
              <g transform="translate(35,200) scale(0.7)"><rect x="-3" y="18" width="6" height="12" rx="1" fill="#8B6914" /><polygon points="0,0 14,14 -14,14" fill="#4AAE4A" /><polygon points="0,5 12,17 -12,17" fill="#3D9140" /><polygon points="0,10 10,20 -10,20" fill="#2E7D32" /></g>
              <g transform="translate(155,450) scale(1.1)"><rect x="-3" y="18" width="6" height="12" rx="1" fill="#8B6914" /><polygon points="0,0 14,14 -14,14" fill="#4AAE4A" /><polygon points="0,5 12,17 -12,17" fill="#3D9140" /><polygon points="0,10 10,20 -10,20" fill="#2E7D32" /></g>
              <g transform="translate(310,58) scale(0.65)"><rect x="-3" y="18" width="6" height="12" rx="1" fill="#8B6914" /><polygon points="0,0 14,14 -14,14" fill="#4AAE4A" /><polygon points="0,5 12,17 -12,17" fill="#3D9140" /><polygon points="0,10 10,20 -10,20" fill="#2E7D32" /></g>
              <g transform="translate(505,470) scale(0.85)"><rect x="-3" y="18" width="6" height="12" rx="1" fill="#8B6914" /><polygon points="0,0 14,14 -14,14" fill="#4AAE4A" /><polygon points="0,5 12,17 -12,17" fill="#3D9140" /><polygon points="0,10 10,20 -10,20" fill="#2E7D32" /></g>
              <g transform="translate(670,55) scale(0.75)"><rect x="-3" y="18" width="6" height="12" rx="1" fill="#8B6914" /><polygon points="0,0 14,14 -14,14" fill="#4AAE4A" /><polygon points="0,5 12,17 -12,17" fill="#3D9140" /><polygon points="0,10 10,20 -10,20" fill="#2E7D32" /></g>
              <g transform="translate(850,440) scale(0.95)"><rect x="-3" y="18" width="6" height="12" rx="1" fill="#8B6914" /><polygon points="0,0 14,14 -14,14" fill="#4AAE4A" /><polygon points="0,5 12,17 -12,17" fill="#3D9140" /><polygon points="0,10 10,20 -10,20" fill="#2E7D32" /></g>
              <g transform="translate(970,250) scale(0.6)"><rect x="-3" y="18" width="6" height="12" rx="1" fill="#8B6914" /><polygon points="0,0 14,14 -14,14" fill="#4AAE4A" /><polygon points="0,5 12,17 -12,17" fill="#3D9140" /><polygon points="0,10 10,20 -10,20" fill="#2E7D32" /></g>
            </g>

            {/* Round trees — scattered */}
            <g opacity="0.5">
              <g transform="translate(75,440) scale(0.9)"><rect x="-3" y="10" width="6" height="14" rx="1" fill="#8B6914" /><circle cx="0" cy="0" r="12" fill="#66BB6A" /><circle cx="-5" cy="-3" r="7" fill="#81C784" opacity="0.7" /></g>
              <g transform="translate(240,260) scale(0.7)"><rect x="-3" y="10" width="6" height="14" rx="1" fill="#8B6914" /><circle cx="0" cy="0" r="12" fill="#4CAF50" /><circle cx="5" cy="-2" r="6" fill="#66BB6A" opacity="0.7" /></g>
              <g transform="translate(430,55) scale(0.65)"><rect x="-3" y="10" width="6" height="14" rx="1" fill="#8B6914" /><circle cx="0" cy="0" r="12" fill="#66BB6A" /><circle cx="-5" cy="-3" r="7" fill="#81C784" opacity="0.7" /></g>
              <g transform="translate(590,455) scale(0.8)"><rect x="-3" y="10" width="6" height="14" rx="1" fill="#8B6914" /><circle cx="0" cy="0" r="12" fill="#4CAF50" /><circle cx="5" cy="-2" r="6" fill="#66BB6A" opacity="0.7" /></g>
              <g transform="translate(780,65) scale(0.6)"><rect x="-3" y="10" width="6" height="14" rx="1" fill="#8B6914" /><circle cx="0" cy="0" r="12" fill="#66BB6A" /><circle cx="-5" cy="-3" r="7" fill="#81C784" opacity="0.7" /></g>
              <g transform="translate(940,370) scale(0.75)"><rect x="-3" y="10" width="6" height="14" rx="1" fill="#8B6914" /><circle cx="0" cy="0" r="12" fill="#4CAF50" /><circle cx="5" cy="-2" r="6" fill="#66BB6A" opacity="0.7" /></g>
            </g>

            {/* Rocks — randomly scattered */}
            <g opacity="0.4">
              <g transform="translate(120,290) scale(0.65)"><polygon points="-8,8 -4,-2 2,-5 8,-1 10,8" fill="#9E9E9E" /><polygon points="-4,-2 2,-5 3,2 -2,4" fill="#BDBDBD" opacity="0.6" /></g>
              <g transform="translate(380,460) scale(0.8)"><polygon points="-8,8 -4,-2 2,-5 8,-1 10,8" fill="#9E9E9E" /><polygon points="-4,-2 2,-5 3,2 -2,4" fill="#BDBDBD" opacity="0.6" /></g>
              <g transform="translate(560,240) scale(0.55)"><polygon points="-8,8 -4,-2 2,-5 8,-1 10,8" fill="#9E9E9E" /><polygon points="-4,-2 2,-5 3,2 -2,4" fill="#BDBDBD" opacity="0.6" /></g>
              <g transform="translate(730,460) scale(0.7)"><polygon points="-8,8 -4,-2 2,-5 8,-1 10,8" fill="#9E9E9E" /><polygon points="-4,-2 2,-5 3,2 -2,4" fill="#BDBDBD" opacity="0.6" /></g>
              <g transform="translate(910,105) scale(0.6)"><polygon points="-8,8 -4,-2 2,-5 8,-1 10,8" fill="#9E9E9E" /><polygon points="-4,-2 2,-5 3,2 -2,4" fill="#BDBDBD" opacity="0.6" /></g>
            </g>

            {/* Bushes — scattered */}
            <g opacity="0.45">
              <g transform="translate(55,330) scale(0.7)"><ellipse cx="-5" cy="0" rx="8" ry="6" fill="#66BB6A" /><ellipse cx="6" cy="-1" rx="9" ry="7" fill="#4CAF50" /><ellipse cx="0" cy="-2" rx="6" ry="7" fill="#81C784" /></g>
              <g transform="translate(200,475) scale(0.85)"><ellipse cx="-5" cy="0" rx="8" ry="6" fill="#66BB6A" /><ellipse cx="6" cy="-1" rx="9" ry="7" fill="#4CAF50" /><ellipse cx="0" cy="-2" rx="6" ry="7" fill="#81C784" /></g>
              <g transform="translate(450,135) scale(0.6)"><ellipse cx="-5" cy="0" rx="8" ry="6" fill="#66BB6A" /><ellipse cx="6" cy="-1" rx="9" ry="7" fill="#4CAF50" /><ellipse cx="0" cy="-2" rx="6" ry="7" fill="#81C784" /></g>
              <g transform="translate(645,470) scale(0.75)"><ellipse cx="-5" cy="0" rx="8" ry="6" fill="#66BB6A" /><ellipse cx="6" cy="-1" rx="9" ry="7" fill="#4CAF50" /><ellipse cx="0" cy="-2" rx="6" ry="7" fill="#81C784" /></g>
              <g transform="translate(825,250) scale(0.55)"><ellipse cx="-5" cy="0" rx="8" ry="6" fill="#66BB6A" /><ellipse cx="6" cy="-1" rx="9" ry="7" fill="#4CAF50" /><ellipse cx="0" cy="-2" rx="6" ry="7" fill="#81C784" /></g>
              <g transform="translate(965,460) scale(0.8)"><ellipse cx="-5" cy="0" rx="8" ry="6" fill="#66BB6A" /><ellipse cx="6" cy="-1" rx="9" ry="7" fill="#4CAF50" /><ellipse cx="0" cy="-2" rx="6" ry="7" fill="#81C784" /></g>
            </g>

            {/* Flowers — sprinkled everywhere */}
            <g opacity="0.5">
              <g transform="translate(90,380)"><circle cx="-4" cy="0" r="2.5" fill="#F48FB1" /><circle cx="3" cy="-2" r="2" fill="#FFD54F" /><circle cx="-4" cy="0" r="1" fill="#F06292" /></g>
              <g transform="translate(270,475)"><circle cx="-4" cy="0" r="2" fill="#CE93D8" /><circle cx="4" cy="1" r="2.5" fill="#F48FB1" /><circle cx="4" cy="1" r="1" fill="#F06292" /></g>
              <g transform="translate(370,175)"><circle cx="0" cy="0" r="2.5" fill="#FFD54F" /><circle cx="7" cy="-1" r="2" fill="#CE93D8" /><circle cx="0" cy="0" r="1" fill="#FFB300" /></g>
              <g transform="translate(520,65)"><circle cx="-3" cy="0" r="2" fill="#F48FB1" /><circle cx="4" cy="1" r="2.5" fill="#CE93D8" /><circle cx="-3" cy="0" r="0.8" fill="#F06292" /></g>
              <g transform="translate(700,475)"><circle cx="-5" cy="0" r="2.5" fill="#FFD54F" /><circle cx="2" cy="-1" r="2" fill="#F48FB1" /><circle cx="-5" cy="0" r="1" fill="#FFB300" /></g>
              <g transform="translate(880,210)"><circle cx="0" cy="0" r="2" fill="#CE93D8" /><circle cx="6" cy="1" r="2.5" fill="#F48FB1" /><circle cx="0" cy="0" r="0.8" fill="#AB47BC" /></g>
            </g>

            {/* Mushrooms — a few scattered */}
            <g opacity="0.4">
              <g transform="translate(175,310) scale(0.7)"><rect x="-2" y="2" width="4" height="6" rx="1" fill="#E8D5B0" /><ellipse cx="0" cy="1" rx="6" ry="4" fill="#E53935" /><circle cx="-2" cy="0" r="1.2" fill="white" opacity="0.8" /><circle cx="2" cy="-0.5" r="1" fill="white" opacity="0.7" /></g>
              <g transform="translate(480,475) scale(0.6)"><rect x="-2" y="2" width="4" height="6" rx="1" fill="#E8D5B0" /><ellipse cx="0" cy="1" rx="6" ry="4" fill="#E53935" /><circle cx="-2" cy="0" r="1.2" fill="white" opacity="0.8" /><circle cx="2" cy="-0.5" r="1" fill="white" opacity="0.7" /></g>
              <g transform="translate(755,105) scale(0.55)"><rect x="-2" y="2" width="4" height="6" rx="1" fill="#E8D5B0" /><ellipse cx="0" cy="1" rx="6" ry="4" fill="#E53935" /><circle cx="-2" cy="0" r="1.2" fill="white" opacity="0.8" /><circle cx="2" cy="-0.5" r="1" fill="white" opacity="0.7" /></g>
            </g>

            {/* Birds — in the sky at varied heights */}
            <g opacity="0.25" stroke="#455A64" strokeWidth="1.5" fill="none">
              <g transform="translate(150,45)"><path d="M0,0 Q-5,-5 -10,0" /><path d="M0,0 Q5,-5 10,0" /></g>
              <g transform="translate(420,30)"><path d="M0,0 Q-4,-4 -8,0" /><path d="M0,0 Q4,-4 8,0" /></g>
              <g transform="translate(610,42)"><path d="M0,0 Q-5,-5 -10,0" /><path d="M0,0 Q5,-5 10,0" /></g>
              <g transform="translate(830,35)"><path d="M0,0 Q-4,-4 -8,0" /><path d="M0,0 Q4,-4 8,0" /></g>
            </g>

            {/* Grass tufts — around the canvas */}
            <g opacity="0.35" fill="#66BB6A">
              <g transform="translate(60,460)"><path d="M-6,5 Q-4,-2 -2,5" /><path d="M-3,5 Q0,-4 3,5" /><path d="M1,5 Q4,-2 7,5" /></g>
              <g transform="translate(280,130)"><path d="M-5,4 Q-3,-2 -1,4" /><path d="M-2,4 Q0,-3 2,4" /><path d="M1,4 Q3,-2 5,4" /></g>
              <g transform="translate(550,475)"><path d="M-6,5 Q-4,-2 -2,5" /><path d="M-3,5 Q0,-4 3,5" /><path d="M1,5 Q4,-2 7,5" /></g>
              <g transform="translate(720,250)"><path d="M-5,4 Q-3,-2 -1,4" /><path d="M-2,4 Q0,-3 2,4" /><path d="M1,4 Q3,-2 5,4" /></g>
              <g transform="translate(920,470)"><path d="M-6,5 Q-4,-2 -2,5" /><path d="M-3,5 Q0,-4 3,5" /><path d="M1,5 Q4,-2 7,5" /></g>
            </g>
          </svg>

          {/* World nodes — percentage-positioned, scale with the container */}
          {worlds.map((world, i) => (
            <WorldBiomeNode
              key={world.area}
              world={world}
              pct={positions[i]}
              onClick={() => setSelectedWorld(world.area)}
            />
          ))}
        </div>
      </div>

      {worlds.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-[50]">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/80 max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Star size={24} className="text-amber-500" />
            </div>
            <h3 className="text-neutral-800 text-[16px] font-semibold mb-2">Your Adventure Awaits!</h3>
            <p className="text-neutral-500 text-[14px] font-medium">
              {adventure
                ? "Your teacher is setting up your personalized adventure. Check back soon!"
                : "Your teacher hasn't created your adventure map yet. Ask them to set one up for you!"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

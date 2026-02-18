"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { UISounds } from "@/lib/ui-sounds";
import { MusicManager } from "@/lib/music-manager";
import MuteButton from "@/components/MuteButton";
import LanguageToggle from "@/components/LanguageToggle";
import type { GameDefinition, ExerciseSession, DeficitArea, AdventureMap as AdventureMapType, Student } from "@/types";
import {
  computeAllWorldsSummary,
  computeCustomWorldsSummary,
  type WorldSummary,
} from "@/lib/map-utils";
import WorldMap from "@/components/WorldMap";
import { CloudBorder } from "@/components/MapDecorations";
import { WORLD_BIOMES } from "@/components/WorldBiomes";
import {
  INTEREST_DECORATION_SETS,
  renderInterestDecoration,
} from "@/components/InterestDecorations";
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

// Build SVG path with organic curves (relative to a 1000x500 viewBox)
function buildCurvedPath(pcts: { x: number; y: number }[]): string {
  if (pcts.length < 2) return "";
  const pts = pcts.map((p) => ({ x: p.x * 10, y: p.y * 5 }));

  const seed = (n: number) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const perpX = -dy / (dist || 1);
    const perpY = dx / (dist || 1);
    const wobble = dist * 0.28;
    const r1 = seed(i * 7 + 3);
    const r2 = seed(i * 13 + 5);
    const r3 = seed(i * 19 + 11);
    const t1 = 0.25 + r3 * 0.15;
    const t2 = 0.6 + r3 * 0.2;
    const o1 = (r1 - 0.5) * wobble;
    const o2 = (r2 - 0.5) * wobble * -1;
    const cx1 = Math.round(prev.x + dx * t1 + perpX * o1);
    const cy1 = Math.round(prev.y + dy * t1 + perpY * o1);
    const cx2 = Math.round(prev.x + dx * t2 + perpX * o2);
    const cy2 = Math.round(prev.y + dy * t2 + perpY * o2);
    d += ` C ${cx1},${cy1} ${cx2},${cy2} ${curr.x},${curr.y}`;
  }
  return d;
}

// ─── World biome node — pixel-art styled ────────────────────────────
function WorldBiomeNode({
  world,
  pct,
  onClick,
}: {
  world: WorldSummary;
  pct: { x: number; y: number };
  onClick: () => void;
}) {
  const progressPercent =
    world.totalLevels > 0
      ? Math.round((world.completedLevels / world.totalLevels) * 100)
      : 0;
  const isCompleted =
    world.completedLevels === world.totalLevels && world.totalLevels > 0;

  // Map deficit areas to isometric biome tiles (top-down 3D)
  const WORLD_BIOME_TILES: Record<string, string> = {
    phonological_awareness: "/game-assets/iso/forest-tile.png",
    rapid_naming: "/game-assets/iso/desert-tile.png",
    working_memory: "/game-assets/iso/mountain-tile.png",
    visual_processing: "/game-assets/iso/crystal-tile.png",
    reading_fluency: "/game-assets/iso/volcano-tile.png",
    comprehension: "/game-assets/iso/castle-tile.png",
  };

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
        {/* Floating isometric biome tile with real cloud sprites */}
        <div className="relative transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1" style={{ width: 130, height: 134 }}>
          {/* ── BEHIND clouds (behind the block) ── */}
          {/* Back-left cloud — peeks from behind upper-left */}
          <img
            src="/game-assets/clouds/cloud-sm.png"
            alt=""
            className="absolute z-[1] pixelated pointer-events-none"
            style={{
              width: 64,
              height: 42,
              left: -8,
              bottom: 24,
              opacity: 0.8,
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {/* Back-right cloud — peeks from behind upper-right */}
          <img
            src="/game-assets/clouds/cloud-sm.png"
            alt=""
            className="absolute z-[1] pixelated pointer-events-none"
            style={{
              width: 60,
              height: 40,
              right: -8,
              bottom: 28,
              transform: "scaleX(-1)",
              opacity: 0.75,
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {/* Back center cloud — behind block bottom */}
          <img
            src="/game-assets/clouds/cloud-md.png"
            alt=""
            className="absolute z-[1] pixelated pointer-events-none"
            style={{
              width: 150,
              height: 84,
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              opacity: 0.85,
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />

          {/* ── FRONT clouds (in front of the block) ── */}
          {/* Front center cloud — large, overlaps bottom of block */}
          <img
            src="/game-assets/clouds/cloud-md.png"
            alt=""
            className="absolute z-[3] pixelated pointer-events-none"
            style={{
              width: 140,
              height: 78,
              bottom: -4,
              left: "50%",
              transform: "translateX(-50%)",
              opacity: 0.92,
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {/* Front-left cloud puff */}
          <img
            src="/game-assets/clouds/cloud-sm.png"
            alt=""
            className="absolute z-[3] pixelated pointer-events-none"
            style={{
              width: 70,
              height: 46,
              bottom: 4,
              left: -6,
              opacity: 0.88,
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {/* Front-right cloud puff */}
          <img
            src="/game-assets/clouds/cloud-sm.png"
            alt=""
            className="absolute z-[3] pixelated pointer-events-none"
            style={{
              width: 66,
              height: 44,
              bottom: 6,
              right: -6,
              transform: "scaleX(-1)",
              opacity: 0.85,
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />

          {/* Isometric tile */}
          <img
            src={WORLD_BIOME_TILES[world.area]}
            alt=""
            className="absolute pixelated z-[2]"
            style={{
              width: 100,
              height: 100,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.4))",
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />

          {/* Top cloud wisp — decorative */}
          <img
            src="/game-assets/clouds/cloud-xs.png"
            alt=""
            className="absolute z-[4] pixelated pointer-events-none"
            style={{
              width: 36,
              height: 26,
              top: -4,
              left: "50%",
              transform: "translateX(-50%)",
              opacity: 0.55,
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />

          {/* World number — centered on tile */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-[14px] font-extrabold shadow-lg z-[4]"
            style={{
              background: isCompleted
                ? "linear-gradient(180deg, #4CAF50, #2E7D32)"
                : "linear-gradient(180deg, #FFD700, #B8860B)",
              border: "2px solid #6B5014",
              color: isCompleted ? "#fff" : "#3E2723",
              textShadow: isCompleted ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
              fontFamily: "'Fredoka', sans-serif",
            }}
          >
            {isCompleted ? "✓" : world.worldNumber}
          </div>

          {/* Stars — top right */}
          <div className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-black/70 border border-[#8B6914]/50 rounded-sm px-1.5 py-0.5 z-[5]">
            <Star size={8} className="text-amber-400" fill="currentColor" />
            <span className="text-[7px] font-bold text-[#FFD700]">
              {world.totalStars}/{world.maxStars}
            </span>
          </div>
        </div>

        {/* World name below tile */}
        <div className="mt-1 px-2 py-0.5 rounded-sm" style={{ background: "rgba(30,20,12,0.85)", border: "1px solid #5a3e1e" }}>
          <p className="text-[9px] font-bold text-[#FFD700] text-center leading-tight truncate max-w-[100px]" style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.6)", fontFamily: "'Fredoka', sans-serif" }}>
            {world.worldName}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-1 w-[90px] mx-auto">
          <div className="h-[4px] rounded-sm overflow-hidden border border-[#8B6914]/50" style={{ background: "#1a0a04" }}>
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                background: `linear-gradient(180deg, ${world.color}, ${world.color}BB)`,
              }}
            />
          </div>
          <p className="text-[7px] mt-0.5 font-bold text-center text-[#8B6914]">
            {world.completedLevels}/{world.totalLevels}
          </p>
        </div>

        {/* Hover label */}
        <div className="mt-0 flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[9px] font-bold text-[#FFD700]" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>Enter</span>
          <ChevronRight size={9} className="text-[#FFD700]" />
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
  const [student, setStudent] = useState<Student | null>(null);

  // Start worldmap music when entering map, stop on unmount
  useEffect(() => {
    MusicManager.play("worldmap");
    return () => { MusicManager.stop(); };
  }, []);

  useEffect(() => {
    if (!user?.studentId) return;
    async function load() {
      const [g, s, gamification, adv, stu] = await Promise.all([
        api.getGames().catch(() => []),
        api.getStudentSessions(user!.studentId).catch(() => []),
        api.getGamificationSummary(user!.studentId).catch(() => null),
        api.getStudentAdventure(user!.studentId).catch(() => null),
        api.getStudent(user!.studentId).catch(() => null),
      ]);
      setGames(g);
      setSessions(s);
      if (gamification) setTotalPoints(gamification.total_points);
      if (stu) setStudent(stu);
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

  // ─── Overworld — Top-down 3D perspective ──────────────────────────
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: "#87CEEB" }}>
      {/* Heavenly cloud sky background */}
      <img
        src="/game-assets/ui/overworld-map-3d.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ imageRendering: "pixelated", opacity: 0.85 }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      {/* Soft vignette for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(100,150,200,0.3) 100%)",
        }}
      />

      {/* Header — clean classic UI */}
      <header className="relative z-[50] flex-shrink-0 px-4 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between rounded-2xl px-4 py-2.5 bg-white/90 backdrop-blur-sm shadow-md border border-gray-200">
          <div className="flex items-center gap-3">
            <Link
              href="/student"
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={16} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-[14px] font-bold text-gray-900 leading-tight" style={{ fontFamily: "'Fredoka', sans-serif" }}>Adventure Map</h1>
              <p className="text-[10px] text-gray-400 font-medium">Choose a world to explore</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.studentId && student && (
              <LanguageToggle studentId={user.studentId} initialLang={student.language} />
            )}
            <MuteButton variant="header" />
            <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-xl">
              <Star size={13} className="text-amber-500" fill="currentColor" />
              <span className="text-[12px] font-bold text-amber-700">{totalStars}<span className="text-amber-400 font-medium">/{maxStars}</span></span>
            </div>
            <div className="flex items-center gap-1.5 bg-purple-50 px-2.5 py-1 rounded-xl">
              <Trophy size={13} className="text-purple-500" />
              <span className="text-[12px] font-bold text-purple-700">{totalCompleted}<span className="text-purple-400 font-medium">/{totalLevels}</span></span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-xl">
              <Coins size={13} className="text-emerald-500" />
              <span className="text-[12px] font-bold text-emerald-700">{totalPoints}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Map area — top-down 3D perspective */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10 min-h-0">
        <div
          className="relative max-w-full max-h-full"
          style={{ aspectRatio: "2 / 1", width: "min(100%, calc((100vh - 80px) * 2))" }}
        >
          {/* Background kept clean — floating world tiles stand on their own */}

          {/* Road — smooth solid path connecting worlds */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 1000 500"
            preserveAspectRatio="none"
            style={{ zIndex: 1 }}
          >
            {/* Road border (dark edge) */}
            <path d={pathD} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
            {/* Road surface */}
            <path d={pathD} fill="none" stroke="rgba(200,170,80,0.45)" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          {/* World nodes */}
          {worlds.map((world, i) => (
            <WorldBiomeNode
              key={world.area}
              world={world}
              pct={positions[i]}
              onClick={() => { UISounds.navigate(); setSelectedWorld(world.area); }}
            />
          ))}
        </div>
      </div>

      {worlds.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-[50]">
          <div className="rounded-2xl p-12 text-center bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200 max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Star size={28} className="text-amber-500" />
            </div>
            <h3 className="text-gray-900 text-[16px] font-bold mb-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>Your Adventure Awaits!</h3>
            <p className="text-gray-500 text-[14px] font-medium">
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

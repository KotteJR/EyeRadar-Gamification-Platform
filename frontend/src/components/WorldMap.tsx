"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { GameDefinition, ExerciseSession, DeficitArea } from "@/types";
import { DEFICIT_AREA_COLORS, DEFICIT_AREA_LABELS } from "@/types";
import { getGameAsset } from "@/lib/game-assets";
import type { AvatarConfig } from "@/components/Avatar";
import {
  buildMapNodes,
  generateSVGPath,
  generatePartialPath,
  WORLD_NAMES,
  WORLD_NUMBERS,
  WORLD_GRADIENTS,
  MAP_WIDTH,
  MAP_HEIGHT,
  type MapNode,
} from "@/lib/map-utils";
import { DEFICIT_AREA_THEME, WORLD_THEMES } from "@/lib/level-config";
import { BOSSES, GAME_MODE_BOSS } from "@/lib/boss-config";
import { Star, Lock, Play, ChevronLeft, Coins } from "lucide-react";

// ─── Props ─────────────────────────────────────────────────────────────
interface WorldMapProps {
  area: DeficitArea;
  games: GameDefinition[];
  sessions: ExerciseSession[];
  studentId: string;
  avatarConfig: AvatarConfig;
  avatarSeed: string;
  totalPoints: number;
  onBack: () => void;
  themeConfig?: { primary_interest: string; color_palette: string; decoration_style: string } | null;
}

// ─── Per-world unique top-down 3D backgrounds ──────────────────────
interface WorldBgConfig {
  worldImage: string;
  fallbackBg: string;
  overlay: string;
  roadColor: string;
}

const WORLD_BG_CONFIG: Record<string, WorldBgConfig> = {
  grassland: {
    worldImage: "/game-assets/worlds/grassland-world.png",
    fallbackBg: "#1e4a10",
    overlay: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.45) 100%)",
    roadColor: "rgba(255,230,140,0.75)",
  },
  forest: {
    worldImage: "/game-assets/worlds/forest-world.png",
    fallbackBg: "#0d260d",
    overlay: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.5) 100%)",
    roadColor: "rgba(220,200,120,0.7)",
  },
  mountain: {
    worldImage: "/game-assets/worlds/mountain-world.png",
    fallbackBg: "#1a2830",
    overlay: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.45) 100%)",
    roadColor: "rgba(200,220,255,0.7)",
  },
  sunset: {
    worldImage: "/game-assets/worlds/sunset-world.png",
    fallbackBg: "#3a1a08",
    overlay: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.4) 100%)",
    roadColor: "rgba(255,210,100,0.7)",
  },
  night: {
    worldImage: "/game-assets/worlds/night-world.png",
    fallbackBg: "#040418",
    overlay: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.35) 100%)",
    roadColor: "rgba(170,150,240,0.7)",
  },
  cloud_kingdom: {
    worldImage: "/game-assets/worlds/cloud-kingdom-world.png",
    fallbackBg: "#141e40",
    overlay: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.4) 100%)",
    roadColor: "rgba(220,200,255,0.7)",
  },
};

// ─── Constants ─────────────────────────────────────────────────────────
const NODE_SIZE = 80;

// ─── Star Display ──────────────────────────────────────────────────────
function StarDisplay({ count, size = 11 }: { count: number; size?: number }) {
  return (
    <div className="flex items-center gap-px">
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= count ? "text-amber-400" : "text-neutral-300/60"}
          fill={i <= count ? "currentColor" : "none"}
          strokeWidth={i <= count ? 0 : 1.5}
        />
      ))}
    </div>
  );
}

// ─── Per-world biome tile for level nodes ──────────────────────────────
const WORLD_NODE_TILE: Record<string, string> = {
  grassland: "/game-assets/iso/forest-tile.png",
  forest: "/game-assets/iso/forest-tile.png",
  mountain: "/game-assets/iso/mountain-tile.png",
  sunset: "/game-assets/iso/desert-tile.png",
  night: "/game-assets/iso/crystal-tile.png",
  cloud_kingdom: "/game-assets/iso/castle-tile.png",
};

// ─── Game Level Node — top-down 3D isometric style, STATIC ─────────────
function GameLevelNode({
  node,
  studentId,
  worldThemeKey,
}: {
  node: MapNode;
  studentId: string;
  worldThemeKey: string;
}) {
  const [hovered, setHovered] = useState(false);
  const isCurrent = node.state === "current";
  const isCompleted = node.state === "completed";
  const isLocked = node.state === "locked";

  const nodeTile = WORLD_NODE_TILE[worldThemeKey] || WORLD_NODE_TILE.grassland;

  const content = (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: node.position.x,
        top: node.position.y,
        transform: "translate(-50%, -50%)",
        zIndex: isCurrent ? 12 : 5,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Tooltip */}
      {hovered && (
        <div className="absolute bottom-full mb-3 px-3 py-1.5 bg-[#3E2723]/95 text-[#FFD700] text-[11px] font-bold rounded-sm whitespace-nowrap z-30 shadow-xl border border-[#8B6914]" style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.5)" }}>
          {node.label}
          {isLocked && " (Locked)"}
          {isCompleted && ` — ${Math.round(node.bestAccuracy)}%`}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#3E2723]/95 rotate-45 -mt-1 border-r border-b border-[#8B6914]" />
        </div>
      )}

      {/* Level node — floating isometric tile with real cloud sprites */}
      <div
        className={`relative flex items-center justify-center ${
          isLocked ? "opacity-40 grayscale" : ""
        } ${!isLocked ? "hover:scale-105" : ""} transition-transform duration-200`}
        style={{ width: NODE_SIZE + 36, height: NODE_SIZE + 40 }}
      >
        {/* ── BEHIND clouds (z-[1], behind the block) ── */}
        {/* Back-left cloud — peeks from behind */}
        <img
          src="/game-assets/clouds/cloud-sm.png"
          alt=""
          className="absolute z-[1] pixelated pointer-events-none"
          style={{
            width: 56,
            height: 38,
            left: -6,
            bottom: 22,
            opacity: 0.8,
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        {/* Back-right cloud — peeks from behind */}
        <img
          src="/game-assets/clouds/cloud-sm.png"
          alt=""
          className="absolute z-[1] pixelated pointer-events-none"
          style={{
            width: 52,
            height: 36,
            right: -6,
            bottom: 26,
            transform: "scaleX(-1)",
            opacity: 0.75,
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        {/* Back center cloud — wide behind block bottom */}
        <img
          src="/game-assets/clouds/cloud-md.png"
          alt=""
          className="absolute z-[1] pixelated pointer-events-none"
          style={{
            width: 130,
            height: 74,
            bottom: 2,
            left: "50%",
            transform: "translateX(-50%)",
            opacity: 0.85,
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />

        {/* ── FRONT clouds (z-[3], in front of the block) ── */}
        {/* Front center cloud — large, overlaps block bottom */}
        <img
          src="/game-assets/clouds/cloud-md.png"
          alt=""
          className="absolute z-[3] pixelated pointer-events-none"
          style={{
            width: 124,
            height: 70,
            bottom: -2,
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
            width: 62,
            height: 42,
            bottom: 6,
            left: -4,
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
            width: 58,
            height: 40,
            bottom: 8,
            right: -4,
            transform: "scaleX(-1)",
            opacity: 0.85,
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />

        {/* Isometric biome tile as node background */}
        <img
          src={nodeTile}
          alt=""
          className="pixelated relative z-[2]"
          style={{
            width: NODE_SIZE + 8,
            height: NODE_SIZE + 8,
            borderRadius: "6px",
            filter: isLocked ? "saturate(0) brightness(0.6)" : isCurrent ? "brightness(1.1)" : "none",
            boxShadow: "0 6px 14px rgba(0,0,0,0.45)",
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />

        {/* Top cloud wisp — actual sprite */}
        <img
          src="/game-assets/clouds/cloud-xs.png"
          alt=""
          className="absolute z-[3] pixelated pointer-events-none"
          style={{
            width: 32,
            height: 24,
            top: -6,
            left: "50%",
            transform: "translateX(-50%)",
            opacity: 0.5,
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />

        {/* Level number centered */}
        <div
          className="absolute z-[4] flex items-center justify-center rounded-full"
          style={{
            width: 32,
            height: 32,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: isCompleted
              ? "linear-gradient(180deg, #4CAF50, #2E7D32)"
              : isCurrent
              ? "linear-gradient(180deg, #FFD700, #F9A825)"
              : isLocked
              ? "rgba(60,60,60,0.8)"
              : "rgba(0,0,0,0.6)",
            border: `2px solid ${isCompleted ? "#27AE60" : isCurrent ? "#8B6914" : "#555"}`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
          }}
        >
          <span
            className="font-extrabold"
            style={{
              fontSize: 14,
              color: isLocked ? "#999" : isCurrent ? "#5D3A00" : "#fff",
              fontFamily: "'Fredoka', sans-serif",
              textShadow: isLocked ? "none" : "0 1px 2px rgba(0,0,0,0.4)",
            }}
          >
            {isLocked ? <Lock size={14} className="text-[#888]" /> : node.levelNumber}
          </span>
        </div>

        {/* Checkmark for completed */}
        {isCompleted && (
          <div
            className="absolute z-[5]"
            style={{
              top: 4,
              right: 6,
              width: 22,
              height: 22,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(180deg, #FFD700, #F9A825)",
              border: "2px solid #8B6508",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          >
            <span className="text-[#5D3A00] text-[9px] font-extrabold">✓</span>
          </div>
        )}
      </div>

      {/* Stars below completed nodes */}
      {isCompleted && (
        <div className="mt-1.5">
          <StarDisplay count={node.stars} size={12} />
        </div>
      )}

      {/* Static "PLAY" label for current */}
      {isCurrent && (
        <div
          className="mt-1.5 text-[10px] font-bold uppercase tracking-widest px-4 py-1"
          style={{
            background: "linear-gradient(180deg, #FFD700, #F9A825)",
            color: "#5D3A00",
            borderRadius: "12px",
            border: "1px solid #8B6508",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            fontFamily: "'Fredoka', sans-serif",
          }}
        >
          Play
        </div>
      )}
    </div>
  );

  if (isLocked || !node.game) return content;
  return (
    <Link
      href={`/exercises/play?studentId=${studentId}&gameId=${node.game.id}`}
      className="cursor-pointer"
    >
      {content}
    </Link>
  );
}

// ─── Castle Checkpoint Node — isometric castle tile ─────────────────────
function CastleNode({ node, color, worldThemeKey }: { node: MapNode; color: string; worldThemeKey: string }) {
  const [hovered, setHovered] = useState(false);
  const isCurrent = node.state === "current";
  const isCompleted = node.state === "completed";
  const isLocked = node.state === "locked";

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: node.position.x,
        top: node.position.y,
        transform: "translate(-50%, -50%)",
        zIndex: isCurrent ? 12 : 5,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div className="absolute bottom-full mb-2 px-3 py-1.5 bg-[#3E2723]/95 text-[#FFD700] text-[11px] font-bold rounded-sm whitespace-nowrap z-30 shadow-xl border border-[#8B6914]" style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.5)" }}>
          {node.label}
          {isLocked && " — Complete preceding levels!"}
          {isCurrent && " — Ready to challenge!"}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#3E2723]/95 rotate-45 -mt-1 border-r border-b border-[#8B6914]" />
        </div>
      )}

      {/* Floating castle tile with real cloud sprites */}
      <div className={`relative ${isLocked ? "opacity-40 grayscale" : ""} ${!isLocked ? "hover:scale-105" : ""} transition-transform duration-200`} style={{ width: 130, height: 136 }}>
        {/* ── BEHIND clouds (z-[1], behind the castle) ── */}
        {/* Back-left cloud */}
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
        {/* Back-right cloud */}
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
        {/* Back center cloud */}
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

        {/* ── FRONT clouds (z-[3], in front of the castle) ── */}
        {/* Front center cloud — large */}
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

        {/* Castle tile */}
        <img
          src="/game-assets/iso/castle-tile.png"
          alt=""
          className="absolute pixelated z-[2]"
          style={{
            width: 96,
            height: 96,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            filter: isCompleted ? "hue-rotate(90deg) brightness(1.1)" : isCurrent ? "brightness(1.2)" : "none",
            boxShadow: "0 6px 14px rgba(0,0,0,0.4)",
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />

        {/* Top cloud wisp — actual sprite */}
        <img
          src="/game-assets/clouds/cloud-xs.png"
          alt=""
          className="absolute z-[3] pixelated pointer-events-none"
          style={{
            width: 34,
            height: 24,
            top: -4,
            left: "50%",
            transform: "translateX(-50%)",
            opacity: 0.5,
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />

        {isCompleted && (
          <div className="absolute z-[5]" style={{ top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg, #FFD700, #F9A825)", border: "2px solid #8B6508" }}>
            <span className="text-[#5D3A00] text-[8px] font-extrabold">✓</span>
          </div>
        )}
      </div>

      {isCompleted && node.stars > 0 && (
        <div className="mt-0.5">
          <StarDisplay count={node.stars} size={10} />
        </div>
      )}

      {isCurrent && (
        <div className="mt-0.5 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "linear-gradient(180deg, #FFD700, #F9A825)", color: "#5D3A00", border: "1px solid #8B6508", fontFamily: "'Fredoka', sans-serif" }}>
          Challenge
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── MAIN WORLD MAP COMPONENT ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

export default function WorldMap({
  area,
  games,
  sessions,
  studentId,
  avatarConfig,
  avatarSeed,
  totalPoints,
  onBack,
  themeConfig,
}: WorldMapProps) {
  const color = DEFICIT_AREA_COLORS[area];
  const worldName = WORLD_NAMES[area];
  const worldNum = WORLD_NUMBERS[area];

  const mapNodes = useMemo(() => buildMapNodes(games, sessions), [games, sessions]);
  const positions = useMemo(() => mapNodes.map((n) => n.position), [mapNodes]);
  const fullPathD = useMemo(() => generateSVGPath(positions), [positions]);

  const lastCompletedIndex = useMemo(() => {
    let last = -1;
    for (let i = 0; i < mapNodes.length; i++) {
      if (mapNodes[i].state === "completed") last = i;
    }
    return last;
  }, [mapNodes]);

  const completedPathD = useMemo(
    () => (lastCompletedIndex >= 0 ? generatePartialPath(positions, lastCompletedIndex) : ""),
    [positions, lastCompletedIndex]
  );

  const currentIndex = mapNodes.findIndex((n) => n.state === "current");
  const avatarNode = currentIndex >= 0 ? mapNodes[currentIndex] : mapNodes[mapNodes.length - 1];

  const completedCount = mapNodes.filter((n) => n.state === "completed" && n.type === "level").length;
  const totalGameLevels = mapNodes.filter((n) => n.type === "level").length;
  const totalStars = mapNodes.filter((n) => n.state === "completed").reduce((s, n) => s + n.stars, 0);
  const maxStars = totalGameLevels * 3;

  const worldThemeKey = DEFICIT_AREA_THEME[area];
  const worldThemeConfig = WORLD_THEMES[worldThemeKey];
  const bgConfig = WORLD_BG_CONFIG[worldThemeKey] || WORLD_BG_CONFIG.grassland;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: bgConfig.fallbackBg }}>
      {/* ─── Full unique world background image (dimmed for readability) ─── */}
      <img
        src={bgConfig.worldImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none pixelated"
        style={{ imageRendering: "pixelated", opacity: 0.55, filter: "brightness(0.7) saturate(0.8)" }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />

      {/* Dark overlay for contrast + vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "rgba(0,0,0,0.3)" }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: bgConfig.overlay }}
      />

      {/* Stars for dark themes */}
      {worldThemeConfig.stars && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: `${1 + Math.random() * 2}px`,
                height: `${1 + Math.random() * 2}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 40}%`,
                opacity: 0.3 + Math.random() * 0.5,
              }}
            />
          ))}
        </div>
      )}

      {/* ─── HUD Header ──────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-2.5">
        <div
          className="max-w-5xl mx-auto flex items-center justify-between rounded-lg px-4 py-2 shadow-lg border-2 border-[#8B6914] relative overflow-hidden"
          style={{ background: "linear-gradient(180deg, #3E2723 0%, #2C1D17 100%)", boxShadow: "inset 0 1px 0 rgba(255,215,0,0.15), 0 4px 12px rgba(0,0,0,0.4)" }}
        >
          <img src="/game-assets/ui/healthbar-frame.png" alt="" className="absolute inset-0 w-full h-full pixelated pointer-events-none" style={{ opacity: 0.2, objectFit: "fill" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />

          <div className="flex items-center gap-3 relative z-[1]">
            <button onClick={onBack} className="w-8 h-8 flex items-center justify-center shadow-sm border border-[#8B6914] rounded-sm" style={{ background: "linear-gradient(180deg, #5A3A1A, #3E2723)" }}>
              <ChevronLeft size={16} className="text-[#FFD700]" />
            </button>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 flex items-center justify-center text-[12px] font-bold shadow-sm" style={{ background: "linear-gradient(180deg, #FFD700, #B8860B)", color: "#3E2723", border: "1px solid #6B5014", borderRadius: "2px", fontFamily: "'Fredoka', sans-serif" }}>
                {worldNum}
              </span>
              <div>
                <h1 className="text-[14px] font-semibold leading-tight text-[#FFD700]" style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.5)", fontFamily: "'Fredoka', sans-serif" }}>{worldName}</h1>
                <p className="text-[10px] font-medium text-[#C4A35A]">{DEFICIT_AREA_LABELS[area]} — {worldThemeConfig.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-[1]">
            <div className="flex items-center gap-1.5 relative px-2 py-0.5">
              <img src="/game-assets/ui/stat-badge.png" alt="" className="absolute inset-0 w-full h-full pixelated pointer-events-none rounded" style={{ opacity: 0.4, objectFit: "fill" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <Star size={14} className="text-amber-400 relative z-[1]" fill="currentColor" />
              <span className="text-[13px] font-bold text-[#FFD700] relative z-[1]">{totalStars}</span>
              <span className="text-[11px] text-[#8B6914] relative z-[1]">/{maxStars}</span>
            </div>
            <div className="w-px h-5 bg-[#8B6914]/40" />
            <div className="flex items-center gap-1.5 relative px-2 py-0.5">
              <img src="/game-assets/ui/stat-badge.png" alt="" className="absolute inset-0 w-full h-full pixelated pointer-events-none rounded" style={{ opacity: 0.4, objectFit: "fill" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <Coins size={14} className="text-amber-400 relative z-[1]" />
              <span className="text-[13px] font-bold text-[#FFD700] relative z-[1]">{totalPoints}</span>
            </div>
            <div className="w-px h-5 bg-[#8B6914]/40" />
            <div className="text-right relative px-2 py-0.5">
              <img src="/game-assets/ui/stat-badge.png" alt="" className="absolute inset-0 w-full h-full pixelated pointer-events-none rounded" style={{ opacity: 0.4, objectFit: "fill" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <p className="text-[11px] text-[#8B6914] relative z-[1]">Progress</p>
              <p className="text-[13px] font-bold leading-tight text-[#FFD700] relative z-[1]" style={{ fontFamily: "'Fredoka', sans-serif" }}>{completedCount}/{totalGameLevels}</p>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Scrollable Map Area ──────────────────────────────── */}
      <div className="absolute inset-0 overflow-auto scrollbar-hide pt-16 pb-4">
        <div className="flex items-center justify-center min-h-full p-4">
          <div className="relative flex-shrink-0" style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}>

            {/* ─── Road — smooth solid path ──────────────────── */}
            <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} width={MAP_WIDTH} height={MAP_HEIGHT} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
              {/* Road outer glow */}
              <path d={fullPathD} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
              {/* Road border (dark edge) */}
              <path d={fullPathD} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
              {/* Road surface */}
              <path d={fullPathD} fill="none" stroke={bgConfig.roadColor} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
              {/* Completed section — bright highlight */}
              {completedPathD && (
                <path d={completedPathD} fill="none" stroke="rgba(255,215,0,0.7)" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>

            {/* ─── Level Nodes — top-down 3D isometric tiles ──── */}
            <div className="absolute inset-0" style={{ zIndex: 3 }}>
              {mapNodes.map((node) =>
                node.type === "castle" ? (
                  <CastleNode key={node.id} node={node} color={color} worldThemeKey={worldThemeKey} />
                ) : (
                  <GameLevelNode key={node.id} node={node} studentId={studentId} worldThemeKey={worldThemeKey} />
                )
              )}
            </div>

            {/* ─── Wizard — STATIC, standing on island ──────────────── */}
            {avatarNode && (
              <div
                className="absolute"
                style={{
                  zIndex: 15,
                  left: avatarNode.position.x,
                  top: avatarNode.position.y - 30,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <div className="relative flex flex-col items-center">
                  <img
                    src="/game-assets/player/idle.png"
                    alt="Wizard"
                    className="w-10 h-10 drop-shadow-lg"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Bottom Level List ──────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="max-w-2xl mx-auto px-4 pb-3 pointer-events-auto">
          <details className="group">
            <summary className="flex items-center justify-center gap-2 py-2 cursor-pointer select-none">
              <div className="w-10 h-1 rounded-full bg-neutral-400/30 group-open:bg-neutral-400/50 transition-colors" />
            </summary>
            <div className="rounded-lg shadow-xl border-2 border-[#8B6914] max-h-56 overflow-y-auto p-2 space-y-0.5" style={{ background: "linear-gradient(180deg, rgba(62,39,35,0.95), rgba(44,29,23,0.95))" }}>
              {mapNodes.map((node) => {
                const asset = node.game ? getGameAsset(node.game.id) : null;
                const isCastle = node.type === "castle";
                return (
                  <div
                    key={node.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      node.state === "current" ? "bg-[#FFD700]/10" : node.state === "locked" ? "opacity-40" : "hover:bg-white/5"
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                      style={{
                        background: node.state === "locked" ? "#555" : isCastle ? color : "linear-gradient(180deg, #FFD700, #B8860B)",
                        color: node.state === "locked" ? "#999" : "#3E2723",
                        border: "1px solid #5a3e1e",
                        fontFamily: "'Fredoka', sans-serif",
                      }}
                    >
                      {isCastle ? "C" : node.levelNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#FFD700] truncate" style={{ fontFamily: "'Fredoka', sans-serif" }}>{node.label}</p>
                      {node.game && <p className="text-[10px] text-[#C4A35A] truncate">{node.game.description}</p>}
                      {isCastle && <p className="text-[10px] text-[#C4A35A]">Test your skills!</p>}
                    </div>
                    {node.state === "completed" && <StarDisplay count={node.stars} size={10} />}
                    {node.state === "current" && node.game && (
                      <Link
                        href={`/exercises/play?studentId=${studentId}&gameId=${node.game.id}`}
                        className="text-[10px] px-2.5 py-1 font-bold rounded"
                        style={{ background: "linear-gradient(180deg, #FFD700, #F9A825)", color: "#5D3A00", fontFamily: "'Fredoka', sans-serif" }}
                      >
                        Play
                      </Link>
                    )}
                    {node.state === "locked" && <Lock size={12} className="text-[#8B6914]/50 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

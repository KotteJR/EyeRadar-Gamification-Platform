"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { GameDefinition, ExerciseSession, DeficitArea } from "@/types";
import { DEFICIT_AREA_COLORS, DEFICIT_AREA_LABELS } from "@/types";
import Avatar, { type AvatarConfig } from "@/components/Avatar";
import { getGameAsset } from "@/lib/game-assets";
import {
  PineTree,
  RoundTree,
  Hill,
  Rock,
  Bush,
  Flowers,
  Mushroom,
  Signpost,
  Fence,
  Pond,
  GrassTuft,
  Bird,
  Rabbit,
  Butterfly,
  Sheep,
  CastleSVG,
  CloudBorder,
} from "@/components/MapDecorations";
import {
  buildMapNodes,
  generateSVGPath,
  generatePartialPath,
  getWorldDecorations,
  WORLD_NAMES,
  WORLD_NUMBERS,
  WORLD_GRADIENTS,
  MAP_WIDTH,
  MAP_HEIGHT,
  type MapNode,
} from "@/lib/map-utils";
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

// ─── Constants ─────────────────────────────────────────────────────────
const NODE_SIZE = 60;
const CASTLE_SIZE = 56;

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

// ─── Game Level Node ───────────────────────────────────────────────────
function GameLevelNode({
  node,
  studentId,
}: {
  node: MapNode;
  studentId: string;
}) {
  const [hovered, setHovered] = useState(false);
  const asset = node.game ? getGameAsset(node.game.id) : null;
  const isCurrent = node.state === "current";
  const isCompleted = node.state === "completed";
  const isLocked = node.state === "locked";

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
        <div className="absolute bottom-full mb-2 px-3 py-1.5 bg-neutral-900/90 backdrop-blur text-white text-[11px] font-medium rounded-lg whitespace-nowrap z-30 shadow-xl">
          {node.label}
          {isLocked && " (Locked)"}
          {isCompleted && ` — ${Math.round(node.bestAccuracy)}%`}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-900/90 rotate-45 -mt-1" />
        </div>
      )}

      {/* Glow ring for current */}
      {isCurrent && (
        <div
          className="absolute rounded-full map-node-pulse"
          style={{
            width: NODE_SIZE + 20,
            height: NODE_SIZE + 20,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, ${asset?.accent || "#f59e0b"}33 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Circle node */}
      <div
        className={`relative rounded-full overflow-hidden transition-all duration-300 ${
          isLocked ? "grayscale opacity-50" : ""
        }`}
        style={{
          width: isCurrent ? NODE_SIZE + 6 : NODE_SIZE,
          height: isCurrent ? NODE_SIZE + 6 : NODE_SIZE,
          border: `3px solid ${
            isLocked ? "#d4d4d4" : asset?.accent || "#888"
          }`,
          boxShadow: isCurrent
            ? `0 0 20px ${asset?.accent || "#f59e0b"}44, 0 4px 12px rgba(0,0,0,0.15)`
            : isCompleted
            ? "0 2px 8px rgba(0,0,0,0.12)"
            : "none",
        }}
      >
        {/* Game image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: asset ? `url(${asset.image})` : undefined,
            backgroundColor: asset?.bgLight || "#f5f5f5",
          }}
        />

        {/* Lock overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-neutral-900/40 flex items-center justify-center">
            <Lock size={18} className="text-white/80" />
          </div>
        )}

        {/* Play button for current */}
        {isCurrent && (
          <div className="absolute inset-0 bg-black/15 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow-md">
              <Play size={15} className="text-neutral-800 ml-0.5" fill="currentColor" />
            </div>
          </div>
        )}
      </div>

      {/* Level number badge */}
      <div
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white z-[2] shadow-sm"
        style={{
          backgroundColor: isLocked ? "#a3a3a3" : asset?.accent || "#888",
        }}
      >
        {node.levelNumber}
      </div>

      {/* Stars below completed nodes */}
      {isCompleted && (
        <div className="mt-1">
          <StarDisplay count={node.stars} />
        </div>
      )}

      {/* "PLAY" label for current */}
      {isCurrent && (
        <div
          className="mt-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
          style={{
            backgroundColor: `${asset?.accent || "#f59e0b"}20`,
            color: asset?.accent || "#f59e0b",
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

// ─── Castle Checkpoint Node ────────────────────────────────────────────
function CastleNode({ node, color }: { node: MapNode; color: string }) {
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
      {/* Tooltip */}
      {hovered && (
        <div className="absolute bottom-full mb-2 px-3 py-1.5 bg-neutral-900/90 backdrop-blur text-white text-[11px] font-medium rounded-lg whitespace-nowrap z-30 shadow-xl">
          {node.label}
          {isLocked && " — Complete preceding levels!"}
          {isCurrent && " — Ready to challenge!"}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-900/90 rotate-45 -mt-1" />
        </div>
      )}

      {/* Castle glow for current */}
      {isCurrent && (
        <div
          className="absolute map-node-pulse"
          style={{
            width: CASTLE_SIZE + 24,
            height: CASTLE_SIZE + 24,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
            borderRadius: "50%",
          }}
        />
      )}

      <div className={`transition-all duration-300 ${isLocked ? "grayscale opacity-50" : ""}`}>
        <CastleSVG
          completed={isCompleted}
          color={color}
          size={isCurrent ? 1.15 : 1}
        />
      </div>

      {/* Stars if completed */}
      {isCompleted && node.stars > 0 && (
        <div className="mt-0.5">
          <StarDisplay count={node.stars} size={10} />
        </div>
      )}

      {/* Label */}
      {isCurrent && (
        <div
          className="mt-0.5 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${color}20`, color }}
        >
          Challenge
        </div>
      )}
    </div>
  );
}

// ─── Decoration renderer ───────────────────────────────────────────────
function DecorationLayer({ worldIndex }: { worldIndex: number }) {
  const decorations = useMemo(() => getWorldDecorations(worldIndex), [worldIndex]);

  return (
    <>
      {decorations.map((d, i) => {
        const flipTransform = d.flip ? "translate(-50%, -50%) scaleX(-1)" : "translate(-50%, -50%)";
        const style: React.CSSProperties = {
          position: "absolute",
          left: d.x,
          top: d.y,
          transform: flipTransform,
          zIndex: 0,
          opacity: 0.75,
        };
        switch (d.type) {
          case "pine":
            return <div key={i} style={style}><PineTree size={d.size} /></div>;
          case "round_tree":
            return <div key={i} style={style}><RoundTree size={d.size} /></div>;
          case "hill":
            return <div key={i} style={{...style, opacity: 0.35, zIndex: 0}}><Hill size={d.size} /></div>;
          case "rock":
            return <div key={i} style={style}><Rock size={d.size} /></div>;
          case "bush":
            return <div key={i} style={style}><Bush size={d.size} /></div>;
          case "flowers":
            return <div key={i} style={{...style, opacity: 0.85}}><Flowers /></div>;
          case "mushroom":
            return <div key={i} style={style}><Mushroom size={d.size} /></div>;
          case "signpost":
            return <div key={i} style={style}><Signpost size={d.size} /></div>;
          case "fence":
            return <div key={i} style={{...style, opacity: 0.6}}><Fence size={d.size} /></div>;
          case "pond":
            return <div key={i} style={{...style, opacity: 0.5, zIndex: 0}}><Pond size={d.size} /></div>;
          case "grass":
            return <div key={i} style={{...style, opacity: 0.6}}><GrassTuft size={d.size} /></div>;
          case "bird":
            return <div key={i} style={{...style, opacity: 0.7}}><Bird size={d.size} /></div>;
          case "rabbit":
            return <div key={i} style={{...style, opacity: 0.8}}><Rabbit size={d.size} /></div>;
          case "butterfly":
            return <div key={i} style={{...style, opacity: 0.75}}><Butterfly size={d.size} /></div>;
          case "sheep":
            return <div key={i} style={{...style, opacity: 0.8}}><Sheep size={d.size} /></div>;
          default:
            return null;
        }
      })}
    </>
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
  const [gradFrom, gradTo] = WORLD_GRADIENTS[area];

  // Build map nodes with castle checkpoints
  const mapNodes = useMemo(
    () => buildMapNodes(games, sessions),
    [games, sessions]
  );

  // Gather positions for path generation
  const positions = useMemo(
    () => mapNodes.map((n) => n.position),
    [mapNodes]
  );

  // SVG paths
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

  // Current node for avatar placement
  const currentIndex = mapNodes.findIndex((n) => n.state === "current");
  const avatarNode = currentIndex >= 0 ? mapNodes[currentIndex] : mapNodes[mapNodes.length - 1];

  // Stats
  const completedCount = mapNodes.filter(
    (n) => n.state === "completed" && n.type === "level"
  ).length;
  const totalGameLevels = mapNodes.filter((n) => n.type === "level").length;
  const totalStars = mapNodes
    .filter((n) => n.state === "completed")
    .reduce((s, n) => s + n.stars, 0);
  const maxStars = totalGameLevels * 3;

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        background: `linear-gradient(170deg, ${gradFrom} 0%, ${gradTo} 50%, ${gradFrom} 100%)`,
      }}
    >
      {/* Grass-like bottom gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{
          background: `linear-gradient(to top, ${color}12, transparent)`,
        }}
      />

      {/* Animated Cloud Border */}
      <CloudBorder />

      {/* ─── HUD Overlay (frosted glass) ─────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between bg-white/70 backdrop-blur-xl rounded-2xl px-4 py-2 shadow-sm border border-white/50">
          {/* Left: Back + World name */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
            >
              <ChevronLeft size={16} className="text-neutral-600" />
            </button>
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold text-white shadow-sm"
                style={{ backgroundColor: color }}
              >
                {worldNum}
              </span>
              <div>
                <h1 className="text-[14px] font-semibold text-neutral-900 leading-tight">
                  {worldName}
                </h1>
                <p className="text-[10px] text-neutral-400 font-medium">
                  {DEFICIT_AREA_LABELS[area]}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Star size={14} className="text-amber-400" fill="currentColor" />
              <span className="text-[13px] font-semibold text-neutral-800">
                {totalStars}
              </span>
              <span className="text-[11px] text-neutral-400">/{maxStars}</span>
            </div>
            <div className="w-px h-5 bg-neutral-200" />
            <div className="flex items-center gap-1.5">
              <Coins size={14} className="text-amber-500" />
              <span className="text-[13px] font-semibold text-neutral-800">
                {totalPoints}
              </span>
            </div>
            <div className="w-px h-5 bg-neutral-200" />
            <div className="text-right">
              <p className="text-[11px] text-neutral-400">Progress</p>
              <p className="text-[13px] font-semibold text-neutral-800 leading-tight">
                {completedCount}/{totalGameLevels}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Scrollable Map Area ─────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-auto scrollbar-hide pt-16 pb-4">
        <div className="flex items-center justify-center min-h-full p-4">
          <div
            className="relative flex-shrink-0"
            style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
          >
            {/* Background dot pattern */}
            <div
              className="absolute inset-0 opacity-[0.04] rounded-3xl"
              style={{
                backgroundImage: `radial-gradient(circle, ${color} 1px, transparent 1px)`,
                backgroundSize: "30px 30px",
              }}
            />

            {/* ─── Decorative landscape (behind road, z-index 0) ──── */}
            <DecorationLayer worldIndex={worldNum - 1} />

            {/* ─── SVG Road (z-index 1, above decorations) ─────────── */}
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 1 }}
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            >
              {/* Road shadow */}
              <path
                d={fullPathD}
                fill="none"
                stroke="#00000008"
                strokeWidth={28}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Outer road border */}
              <path
                d={fullPathD}
                fill="none"
                stroke="#00000012"
                strokeWidth={18}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Road base (light tan) */}
              <path
                d={fullPathD}
                fill="none"
                stroke="#E8DCC8"
                strokeWidth={14}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Road dashed center line */}
              <path
                d={fullPathD}
                fill="none"
                stroke="#D4C9B5"
                strokeWidth={2}
                strokeDasharray="10 8"
                strokeLinecap="round"
                className="map-road-dash"
                opacity={0.6}
              />

              {/* Completed road overlay (colored) */}
              {completedPathD && (
                <path
                  d={completedPathD}
                  fill="none"
                  stroke={color}
                  strokeWidth={14}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.25}
                  className="map-road-glow"
                />
              )}

              {/* Completed road solid center stripe */}
              {completedPathD && (
                <path
                  d={completedPathD}
                  fill="none"
                  stroke={color}
                  strokeWidth={3}
                  strokeLinecap="round"
                  opacity={0.5}
                />
              )}
            </svg>

            {/* ─── Level Nodes (above road, z-index 3+) ───────────── */}
            <div className="absolute inset-0" style={{ zIndex: 3 }}>
              {mapNodes.map((node) =>
                node.type === "castle" ? (
                  <CastleNode key={node.id} node={node} color={color} />
                ) : (
                  <GameLevelNode key={node.id} node={node} studentId={studentId} />
                )
              )}
            </div>

            {/* ─── Avatar on current node ─────────────────────────── */}
            {avatarNode && (
              <div
                className="absolute map-avatar-float transition-all duration-700"
                style={{
                  zIndex: 15,
                  left: avatarNode.position.x,
                  top: avatarNode.position.y - 45,
                  transform: "translate(-50%, -100%)",
                  transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <div className="relative">
                  <Avatar
                    config={avatarConfig}
                    seed={avatarSeed}
                    size={38}
                    className="rounded-full border-2 border-white shadow-lg"
                  />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rotate-45 shadow-sm" />
                </div>
              </div>
            )}

            {/* ─── "START" label at first node ───────────────────── */}
            {mapNodes.length > 0 && mapNodes[0].state !== "locked" && (
              <div
                className="absolute text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 pointer-events-none"
                style={{
                  left: mapNodes[0].position.x,
                  top: mapNodes[0].position.y + NODE_SIZE / 2 + 24,
                  transform: "translateX(-50%)",
                  zIndex: 4,
                }}
              >
                Start
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Bottom Level List (slide-up panel) ──────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="max-w-2xl mx-auto px-4 pb-3 pointer-events-auto">
          <details className="group">
            <summary className="flex items-center justify-center gap-2 py-2 cursor-pointer select-none">
              <div className="w-10 h-1 rounded-full bg-neutral-400/30 group-open:bg-neutral-400/50 transition-colors" />
            </summary>
            <div className="bg-white/85 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60 max-h-56 overflow-y-auto p-2 space-y-0.5">
              {mapNodes.map((node) => {
                const asset = node.game ? getGameAsset(node.game.id) : null;
                const isCastle = node.type === "castle";
                return (
                  <div
                    key={node.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                      node.state === "current"
                        ? "bg-neutral-100/80"
                        : node.state === "locked"
                        ? "opacity-40"
                        : "hover:bg-neutral-50"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white ${
                        isCastle ? "rounded-md" : ""
                      }`}
                      style={{
                        backgroundColor:
                          node.state === "locked"
                            ? "#a3a3a3"
                            : isCastle
                            ? color
                            : asset?.accent || "#888",
                      }}
                    >
                      {isCastle ? "C" : node.levelNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-neutral-800 truncate">
                        {node.label}
                      </p>
                      {node.game && (
                        <p className="text-[10px] text-neutral-400 truncate">
                          {node.game.description}
                        </p>
                      )}
                      {isCastle && (
                        <p className="text-[10px] text-neutral-400">
                          Test your skills!
                        </p>
                      )}
                    </div>
                    {node.state === "completed" && <StarDisplay count={node.stars} size={10} />}
                    {node.state === "current" && node.game && (
                      <Link
                        href={`/exercises/play?studentId=${studentId}&gameId=${node.game.id}`}
                        className="btn-primary text-[10px] px-2.5 py-1"
                      >
                        <Play size={11} />
                        Play
                      </Link>
                    )}
                    {node.state === "locked" && (
                      <Lock size={12} className="text-neutral-300 flex-shrink-0" />
                    )}
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

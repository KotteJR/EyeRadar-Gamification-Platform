import type { DeficitArea, GameDefinition, ExerciseSession } from "@/types";
import { DEFICIT_AREA_LABELS, DEFICIT_AREA_COLORS } from "@/types";

// ─── World ordering & metadata ─────────────────────────────────────────
export const WORLD_ORDER: DeficitArea[] = [
  "phonological_awareness",
  "rapid_naming",
  "working_memory",
  "visual_processing",
  "reading_fluency",
  "comprehension",
];

export const WORLD_NAMES: Record<DeficitArea, string> = {
  phonological_awareness: "Sound Kingdom",
  rapid_naming: "Speed Valley",
  working_memory: "Memory Mountains",
  visual_processing: "Vision Forest",
  reading_fluency: "Fluency River",
  comprehension: "Story Castle",
};

export const WORLD_NUMBERS: Record<DeficitArea, number> = {
  phonological_awareness: 1,
  rapid_naming: 2,
  working_memory: 3,
  visual_processing: 4,
  reading_fluency: 5,
  comprehension: 6,
};

/** Background gradient per world [from, to] */
export const WORLD_GRADIENTS: Record<DeficitArea, [string, string]> = {
  phonological_awareness: ["#FEF7F0", "#FCE4C8"],
  rapid_naming: ["#FEFCE8", "#FEF08A"],
  working_memory: ["#F5F3FF", "#DDD6FE"],
  visual_processing: ["#ECFDF5", "#A7F3D0"],
  reading_fluency: ["#EFF6FF", "#BFDBFE"],
  comprehension: ["#FEF2F2", "#FECACA"],
};

// ─── Map dimensions ────────────────────────────────────────────────────
export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 750;

// ─── Star calculation ──────────────────────────────────────────────────
export function getStarCount(accuracy: number): 1 | 2 | 3 {
  if (accuracy >= 85) return 3;
  if (accuracy >= 60) return 2;
  return 1;
}

// ─── Node types ────────────────────────────────────────────────────────
export type NodeState = "completed" | "current" | "locked";
export type MapNodeType = "level" | "castle";

export interface LevelNode {
  game: GameDefinition;
  state: NodeState;
  stars: number;
  bestAccuracy: number;
  sessionsPlayed: number;
}

export interface MapNode {
  id: string;
  type: MapNodeType;
  game: GameDefinition | null;
  label: string;
  state: NodeState;
  stars: number;
  bestAccuracy: number;
  sessionsPlayed: number;
  position: NodePosition;
  levelNumber: number;
}

// ─── Position types ────────────────────────────────────────────────────
export interface NodePosition {
  x: number; // pixel position on MAP_WIDTH
  y: number; // pixel position on MAP_HEIGHT
}

// ─── S-curve node positioning (horizontal landscape) ───────────────────

function generateSCurvePositions(count: number): NodePosition[] {
  if (count === 0) return [];
  if (count === 1) return [{ x: MAP_WIDTH * 0.5, y: MAP_HEIGHT * 0.7 }];

  const positions: NodePosition[] = [];
  const marginX = MAP_WIDTH * 0.1;
  const marginY = MAP_HEIGHT * 0.12;
  const usableW = MAP_WIDTH - marginX * 2;
  const usableH = MAP_HEIGHT - marginY * 2;

  // Determine number of rows to create the S-curve
  const nodesPerRow = Math.max(2, Math.ceil(count / Math.ceil(count / 3)));
  const rowCount = Math.ceil(count / nodesPerRow);

  let idx = 0;
  for (let row = 0; row < rowCount && idx < count; row++) {
    const nodesThisRow = Math.min(nodesPerRow, count - idx);
    const y = marginY + (usableH / Math.max(rowCount - 1, 1)) * (rowCount - 1 - row);
    const leftToRight = row % 2 === 0;

    for (let col = 0; col < nodesThisRow && idx < count; col++) {
      const t = nodesThisRow === 1 ? 0.5 : col / (nodesThisRow - 1);
      const rawX = marginX + usableW * t;
      const x = leftToRight ? rawX : MAP_WIDTH - rawX;
      positions.push({ x: Math.round(x), y: Math.round(y) });
      idx++;
    }
  }

  return positions;
}

// ─── Castle checkpoint insertion ───────────────────────────────────────

const CASTLE_INTERVAL = 2; // Insert a castle after every N regular levels

export function buildMapNodes(
  games: GameDefinition[],
  sessions: ExerciseSession[]
): MapNode[] {
  if (games.length === 0) return [];

  // First compute progress for the raw game list
  const levelNodes = computeWorldProgress(games, sessions);

  // Insert castle checkpoints
  const mapNodes: MapNode[] = [];
  let levelNum = 1;
  let regularCount = 0;

  for (let i = 0; i < levelNodes.length; i++) {
    const ln = levelNodes[i];
    mapNodes.push({
      id: ln.game.id,
      type: "level",
      game: ln.game,
      label: ln.game.name,
      state: ln.state,
      stars: ln.stars,
      bestAccuracy: ln.bestAccuracy,
      sessionsPlayed: ln.sessionsPlayed,
      position: { x: 0, y: 0 }, // filled later
      levelNumber: levelNum++,
    });
    regularCount++;

    // Insert castle after every CASTLE_INTERVAL regular levels (but not at the very end)
    if (regularCount >= CASTLE_INTERVAL && i < levelNodes.length - 1) {
      regularCount = 0;
      // Castle state: completed if all preceding levels since last castle are completed
      const precedingCompleted = mapNodes
        .filter((n) => n.type === "level")
        .slice(-CASTLE_INTERVAL)
        .every((n) => n.state === "completed");
      const castleState: NodeState = precedingCompleted
        ? mapNodes.some((n) => n.state === "current")
          ? "locked"
          : "completed"
        : mapNodes[mapNodes.length - 1].state === "completed"
        ? "current"
        : "locked";

      // Determine if the castle should be current: only if all preceding levels are done
      // and no other node is already current
      const anyCurrent = mapNodes.some((n) => n.state === "current");

      mapNodes.push({
        id: `castle_${i}`,
        type: "castle",
        game: null,
        label: "Challenge Castle",
        state: precedingCompleted && !anyCurrent ? "current" : precedingCompleted ? "completed" : "locked",
        stars: 0,
        bestAccuracy: 0,
        sessionsPlayed: 0,
        position: { x: 0, y: 0 },
        levelNumber: levelNum++,
      });
    }
  }

  // Final castle at the end of the world
  const allCompleted = levelNodes.every((n) => n.state === "completed");
  const anyCurrent = mapNodes.some((n) => n.state === "current");
  mapNodes.push({
    id: `castle_final`,
    type: "castle",
    game: null,
    label: "World Boss",
    state: allCompleted && !anyCurrent ? "current" : allCompleted ? "completed" : "locked",
    stars: 0,
    bestAccuracy: 0,
    sessionsPlayed: 0,
    position: { x: 0, y: 0 },
    levelNumber: levelNum,
  });

  // Assign positions along S-curve
  const positions = generateSCurvePositions(mapNodes.length);
  for (let i = 0; i < mapNodes.length; i++) {
    mapNodes[i].position = positions[i] || { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
  }

  // Fix state consistency: after the first non-completed node, everything must be locked
  let foundNonCompleted = false;
  for (const node of mapNodes) {
    if (foundNonCompleted) {
      if (node.state !== "completed") node.state = "locked";
    }
    if (node.state === "current") foundNonCompleted = true;
    if (node.state === "locked") foundNonCompleted = true;
  }

  // Ensure exactly one current node (first non-completed)
  let hasCurrent = mapNodes.some((n) => n.state === "current");
  if (!hasCurrent) {
    const firstLocked = mapNodes.find((n) => n.state === "locked");
    if (firstLocked) firstLocked.state = "current";
  }

  return mapNodes;
}

// ─── Progress computation (original) ──────────────────────────────────

export function computeWorldProgress(
  games: GameDefinition[],
  sessions: ExerciseSession[]
): LevelNode[] {
  const sessionsByGame = new Map<string, ExerciseSession[]>();
  for (const s of sessions) {
    if (s.status !== "completed") continue;
    const existing = sessionsByGame.get(s.game_id) || [];
    existing.push(s);
    sessionsByGame.set(s.game_id, existing);
  }

  let foundCurrent = false;
  return games.map((game) => {
    const gameSessions = sessionsByGame.get(game.id) || [];
    const completedSessions = gameSessions.filter((s) => s.status === "completed");
    const bestSession = completedSessions.reduce<ExerciseSession | null>(
      (best, s) => (!best || s.accuracy > best.accuracy ? s : best),
      null
    );

    if (bestSession) {
      return {
        game,
        state: "completed" as const,
        stars: getStarCount(bestSession.accuracy),
        bestAccuracy: bestSession.accuracy,
        sessionsPlayed: gameSessions.length,
      };
    }

    if (!foundCurrent) {
      foundCurrent = true;
      return {
        game,
        state: "current" as const,
        stars: 0,
        bestAccuracy: 0,
        sessionsPlayed: gameSessions.length,
      };
    }

    return {
      game,
      state: "locked" as const,
      stars: 0,
      bestAccuracy: 0,
      sessionsPlayed: 0,
    };
  });
}

// ─── World summary ────────────────────────────────────────────────────

export interface WorldSummary {
  area: DeficitArea;
  worldNumber: number;
  worldName: string;
  label: string;
  color: string;
  totalLevels: number;
  completedLevels: number;
  totalStars: number;
  maxStars: number;
}

export function computeAllWorldsSummary(
  games: GameDefinition[],
  sessions: ExerciseSession[],
  userAge: number
): WorldSummary[] {
  return WORLD_ORDER.map((area) => {
    const worldGames = games.filter(
      (g) =>
        g.deficit_area === area &&
        g.age_range_min <= userAge &&
        g.age_range_max >= userAge
    );
    const nodes = computeWorldProgress(worldGames, sessions);
    const completedNodes = nodes.filter((n) => n.state === "completed");

    return {
      area,
      worldNumber: WORLD_NUMBERS[area],
      worldName: WORLD_NAMES[area],
      label: DEFICIT_AREA_LABELS[area],
      color: DEFICIT_AREA_COLORS[area],
      totalLevels: worldGames.length,
      completedLevels: completedNodes.length,
      totalStars: completedNodes.reduce((sum, n) => sum + n.stars, 0),
      maxStars: worldGames.length * 3,
    };
  }).filter((w) => w.totalLevels > 0);
}

/** Compute world summary from a custom adventure map (teacher-assigned). */
export function computeCustomWorldsSummary(
  adventureWorlds: { deficit_area: string; world_number: number; world_name: string; color: string; game_ids: string[] }[],
  games: GameDefinition[],
  sessions: ExerciseSession[],
): WorldSummary[] {
  return adventureWorlds
    .filter((aw) => aw.game_ids.length > 0)
    .map((aw) => {
      const worldGames = aw.game_ids
        .map((gid) => games.find((g) => g.id === gid))
        .filter(Boolean) as GameDefinition[];

      const nodes = computeWorldProgress(worldGames, sessions);
      const completedNodes = nodes.filter((n) => n.state === "completed");
      const area = aw.deficit_area as DeficitArea;

      return {
        area,
        worldNumber: aw.world_number,
        worldName: aw.world_name,
        label: DEFICIT_AREA_LABELS[area] || aw.deficit_area,
        color: aw.color || DEFICIT_AREA_COLORS[area] || "#6366f1",
        totalLevels: worldGames.length,
        completedLevels: completedNodes.length,
        totalStars: completedNodes.reduce((sum, n) => sum + n.stars, 0),
        maxStars: worldGames.length * 3,
      };
    });
}

// ─── SVG path generation (cubic bezier through node positions) ─────────

export function generateSVGPath(positions: NodePosition[]): string {
  if (positions.length < 2) return "";

  let d = `M ${positions[0].x} ${positions[0].y}`;

  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;

    // Create smooth S-curves with control points
    const cpx1 = prev.x + dx * 0.4;
    const cpy1 = prev.y;
    const cpx2 = curr.x - dx * 0.4;
    const cpy2 = curr.y;

    // For mostly-horizontal segments, use gentle vertical offset
    if (Math.abs(dx) > Math.abs(dy) * 1.5) {
      d += ` C ${cpx1} ${prev.y + dy * 0.1}, ${cpx2} ${curr.y - dy * 0.1}, ${curr.x} ${curr.y}`;
    } else {
      d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
    }
  }

  return d;
}

/** Generate a partial path up to a specific node index (for completed sections) */
export function generatePartialPath(positions: NodePosition[], upToIndex: number): string {
  if (upToIndex < 1 || positions.length < 2) return "";
  const subset = positions.slice(0, upToIndex + 1);
  return generateSVGPath(subset);
}

// ─── Decorative element positions per world ────────────────────────────

export type DecorationType =
  | "pine" | "round_tree" | "hill" | "rock" | "bush" | "flowers"
  | "mushroom" | "signpost" | "fence" | "pond" | "grass"
  | "bird" | "rabbit" | "butterfly" | "sheep";

export interface DecorationPlacement {
  type: DecorationType;
  x: number;
  y: number;
  size: number;
  flip?: boolean;
}

// ─── Scene vignettes — small clusters that make sense together ─────────
// Each vignette is a group of items placed relative to a center point

interface Vignette {
  items: { type: DecorationType; dx: number; dy: number; size: number; flip?: boolean }[];
}

const TREE_CLUSTER: Vignette = {
  items: [
    { type: "pine", dx: 0, dy: 0, size: 1.6 },
    { type: "round_tree", dx: 35, dy: 10, size: 1.3 },
    { type: "bush", dx: -18, dy: 25, size: 1.2 },
    { type: "flowers", dx: 25, dy: 30, size: 1.3 },
    { type: "grass", dx: -10, dy: 32, size: 1.1 },
  ],
};

const FOREST_EDGE: Vignette = {
  items: [
    { type: "pine", dx: -25, dy: 0, size: 1.8 },
    { type: "pine", dx: 12, dy: -8, size: 1.3 },
    { type: "pine", dx: 45, dy: 5, size: 1.5 },
    { type: "bush", dx: -8, dy: 28, size: 1.1 },
    { type: "mushroom", dx: 28, dy: 25, size: 1.0 },
    { type: "grass", dx: -22, dy: 30, size: 1.2 },
    { type: "bird", dx: 5, dy: -35, size: 1.1 },
  ],
};

const POND_SCENE: Vignette = {
  items: [
    { type: "pond", dx: 0, dy: 0, size: 1.4 },
    { type: "flowers", dx: -32, dy: -8, size: 1.2 },
    { type: "flowers", dx: 28, dy: 8, size: 1.1 },
    { type: "grass", dx: -22, dy: 12, size: 1.0 },
    { type: "butterfly", dx: 12, dy: -22, size: 1.1 },
    { type: "round_tree", dx: -42, dy: -15, size: 1.2 },
  ],
};

const FARM_SCENE: Vignette = {
  items: [
    { type: "fence", dx: 0, dy: 0, size: 1.3 },
    { type: "sheep", dx: -20, dy: -18, size: 1.2 },
    { type: "sheep", dx: 22, dy: -12, size: 1.0, flip: true },
    { type: "grass", dx: -30, dy: 8, size: 1.1 },
    { type: "grass", dx: 35, dy: 5, size: 1.0 },
    { type: "flowers", dx: 42, dy: -8, size: 0.9 },
  ],
};

const PARK_BENCH: Vignette = {
  items: [
    { type: "round_tree", dx: 0, dy: 0, size: 1.5 },
    { type: "rabbit", dx: 28, dy: 20, size: 1.1 },
    { type: "bush", dx: -25, dy: 18, size: 1.0 },
    { type: "flowers", dx: -12, dy: 28, size: 1.1 },
  ],
};

const ROCKY_AREA: Vignette = {
  items: [
    { type: "rock", dx: 0, dy: 0, size: 1.5 },
    { type: "rock", dx: 28, dy: 8, size: 1.1 },
    { type: "grass", dx: -15, dy: 12, size: 1.1 },
    { type: "mushroom", dx: 18, dy: 16, size: 1.0 },
  ],
};

const WILDLIFE_SPOT: Vignette = {
  items: [
    { type: "bush", dx: 0, dy: 0, size: 1.4 },
    { type: "rabbit", dx: 25, dy: 8, size: 1.2 },
    { type: "butterfly", dx: -14, dy: -22, size: 1.0 },
    { type: "flowers", dx: -22, dy: 12, size: 1.2 },
    { type: "grass", dx: 32, dy: 15, size: 1.0 },
  ],
};

const WALKING_PATH: Vignette = {
  items: [
    { type: "signpost", dx: 0, dy: 0, size: 1.2 },
    { type: "butterfly", dx: 28, dy: 12, size: 1.1, flip: true },
    { type: "grass", dx: -18, dy: 14, size: 1.0 },
  ],
};

const HILLTOP: Vignette = {
  items: [
    { type: "hill", dx: 0, dy: 0, size: 1.3 },
    { type: "pine", dx: -38, dy: -15, size: 1.3 },
    { type: "bird", dx: 12, dy: -38, size: 1.0 },
    { type: "bird", dx: 30, dy: -32, size: 0.9, flip: true },
  ],
};

const SOLO_ITEMS: Vignette[] = [
  { items: [{ type: "pine", dx: 0, dy: 0, size: 1.5 }] },
  { items: [{ type: "round_tree", dx: 0, dy: 0, size: 1.4 }] },
  { items: [{ type: "bush", dx: 0, dy: 0, size: 1.3 }] },
  { items: [{ type: "rock", dx: 0, dy: 0, size: 1.3 }] },
  { items: [{ type: "flowers", dx: 0, dy: 0, size: 1.4 }] },
  { items: [{ type: "grass", dx: 0, dy: 0, size: 1.3 }] },
  { items: [{ type: "mushroom", dx: 0, dy: 0, size: 1.1 }] },
];

const ALL_VIGNETTES: Vignette[] = [
  TREE_CLUSTER, FOREST_EDGE, POND_SCENE, FARM_SCENE,
  PARK_BENCH, ROCKY_AREA, WILDLIFE_SPOT, WALKING_PATH, HILLTOP,
];

// ─── Pre-defined anchor positions for vignettes per world ──────────────
// Road forms a U: bottom row y≈660, right vertical x≈1080, top row y≈90.
//
// Design principles (from Mario world-map research):
//  • Few well-spaced clusters with generous empty space between them
//  • Each cluster = a small themed "zone" (forest, meadow, pond…)
//  • ~40 % of the interior is intentionally left empty (negative space)
//  • Minimum ~180 px between any two anchors for breathing room
//  • Anchors inside AND outside the U-shaped road

function getVignetteAnchors(): { x: number; y: number }[] {
  return [
    // ── Outside: above the top road (y < 55) ──────────────
    { x: 200, y: 35 },
    { x: 680, y: 30 },

    // ── Inside: upper zone (y 160-220) — sparse ───────────
    { x: 160, y: 190 },
    { x: 620, y: 200 },
    { x: 920, y: 175 },

    // ── Inside: center zone (y 320-400) — main clusters ──
    { x: 130, y: 370 },
    { x: 500, y: 340 },
    { x: 830, y: 390 },

    // ── Inside: lower zone (y 490-560) — sparse ──────────
    { x: 300, y: 520 },
    { x: 700, y: 540 },

    // ── Outside: below the bottom road (y > 700) ─────────
    { x: 180, y: 715 },
    { x: 550, y: 720 },
    { x: 900, y: 710 },

    // ── Outside: right of the vertical road (x > 1110) ───
    { x: 1150, y: 250 },
    { x: 1155, y: 500 },
  ];
}

/** Build meaningful decoration scenes for a world */
export function getWorldDecorations(worldIndex: number): DecorationPlacement[] {
  const seed = worldIndex * 137;
  const seededRandom = (i: number) => {
    const x = Math.sin(seed + i * 13.37) * 10000;
    return x - Math.floor(x);
  };

  const decorations: DecorationPlacement[] = [];
  const anchors = getVignetteAnchors();

  anchors.forEach((anchor, i) => {
    // Pick a vignette — mostly full scene clusters for richer zones
    const r = seededRandom(i);
    let vignette: Vignette;
    if (r < 0.7) {
      // Major scene cluster
      vignette = ALL_VIGNETTES[Math.floor(seededRandom(i + 50) * ALL_VIGNETTES.length)];
    } else {
      // Solo accent item
      vignette = SOLO_ITEMS[Math.floor(seededRandom(i + 80) * SOLO_ITEMS.length)];
    }

    // Random offset so it doesn't look grid-like
    const offsetX = (seededRandom(i + 200) - 0.5) * 50;
    const offsetY = (seededRandom(i + 300) - 0.5) * 40;
    const flip = seededRandom(i + 400) > 0.5;

    for (const item of vignette.items) {
      const x = Math.max(10, Math.min(MAP_WIDTH - 20, anchor.x + item.dx + offsetX));
      const y = Math.max(10, Math.min(MAP_HEIGHT - 20, anchor.y + item.dy + offsetY));

      decorations.push({
        type: item.type,
        x: Math.round(x),
        y: Math.round(y),
        size: item.size,
        flip: item.flip ?? flip,
      });
    }
  });

  return decorations;
}

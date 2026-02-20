import Phaser from "phaser";
import {
  eventBus,
  GameEvents,
  type CastlePhasePayload,
  type CastleAnswerPayload,
} from "../EventBus";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";

// =============================================================================
// 3-Stage Zone Dungeon — Gate/Shrine progression with PixelLab bosses
// Based on CastleDungeonScene with zone system overlay
// =============================================================================

type GameState = "playing" | "question" | "victory" | "paused";
type Direction = "south" | "north" | "east" | "west" | "south-east" | "south-west" | "north-east" | "north-west";
type QuestionSource = "enemy" | "shrine" | "boss_shield";

const TILE_SIZE = 16;
const MAP_WIDTH = 80;
const MAP_HEIGHT = 80;
const PLAYER_SPEED = 100;
const DODGE_SPEED = 220;
const DODGE_DURATION = 250;
const DODGE_COOLDOWN = 600;
const BULLET_SPEED = 200;
const SHOOT_COOLDOWN = 350;
const AUTO_AIM_RANGE = 200;

const PLAYER_MAX_HP = 5;
const PLAYER_SCALE = 0.5;
const ENEMY_SCALE = 0.7;

const ENEMY_TYPES = [
  { key: "skeleton", name: "Skeleton", hp: 3, speed: 45, color: 0xcccccc },
  { key: "slime", name: "Slime", hp: 2, speed: 30, color: 0x44ff44 },
  { key: "bat", name: "Bat", hp: 2, speed: 60, color: 0x8844aa },
  { key: "goblin", name: "Goblin", hp: 3, speed: 50, color: 0x44aa44 },
  { key: "spider", name: "Spider", hp: 4, speed: 40, color: 0x444444 },
];

const BOSS_TYPES: Record<string, { key: string; name: string; hp: number; speed: number; scale: number }> = {
  "skeleton-knight": { key: "skeleton-knight", name: "Skeleton Knight", hp: 8, speed: 35, scale: 0.9 },
  "dark-mage": { key: "dark-mage", name: "Dark Mage", hp: 7, speed: 40, scale: 0.9 },
  "shadow-lord": { key: "shadow-lord", name: "Shadow Lord", hp: 15, speed: 30, scale: 1.0 },
};

const DIRECTIONS = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"] as const;

// Zone boundaries (y-based, south=bottom=high y, north=top=low y)
const ZONE_DEFS = [
  { id: 1, name: "The Courtyard",    yMin: 820, yMax: 1280, regularEnemies: 3, shrineQuestions: 2, gateY: 820 },
  { id: 2, name: "The Dark Halls",   yMin: 420, yMax: 820,  regularEnemies: 2, zoneBoss: "skeleton-knight", shrineQuestions: 2, gateY: 420 },
  { id: 3, name: "The Shadow Throne", yMin: 50,  yMax: 420,  regularEnemies: 1, finalBoss: "shadow-lord", shrineQuestions: 0 },
];

// =============================================================================
// Interfaces
// =============================================================================

interface Enemy {
  sprite: Phaser.GameObjects.Sprite;
  healthBar: Phaser.GameObjects.Graphics;
  hp: number;
  maxHp: number;
  speed: number;
  state: "idle" | "patrol" | "chase" | "attack" | "dead";
  patrolTarget: { x: number; y: number } | null;
  lastAttackTime: number;
  attackCooldown: number;
  isBoss: boolean;
  direction: Direction;
  typeKey: string;
  zone: number;
  bossTypeKey?: string;
  shieldActive?: boolean;
}

interface NPC {
  sprite: Phaser.GameObjects.Sprite;
  indicator: Phaser.GameObjects.Arc;
  interacted: boolean;
}

interface Collectible {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;
  type: "apple";
}

interface Bullet {
  sprite: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  age: number;
  fromPlayer: boolean;
}

interface GateObj {
  zoneId: number;
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
  colliders: Phaser.GameObjects.Rectangle[];
  wallLeft: Phaser.GameObjects.Rectangle;
  wallRight: Phaser.GameObjects.Rectangle;
  wallSprites: Phaser.GameObjects.Sprite[];
  isOpen: boolean;
  y: number;
}

interface ShrineObj {
  zoneId: number;
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;
  glowEffect?: Phaser.GameObjects.Arc;
  isActivated: boolean;
  isCompleted: boolean;
  questionsNeeded: number;
  questionsAnswered: number;
  x: number;
  y: number;
}

// =============================================================================
// Scene
// =============================================================================

export class CastleDungeon3StageScene extends Phaser.Scene {
  private gameState: GameState = "playing";
  private levelIndex = 0;

  // Player
  private player!: Phaser.GameObjects.Sprite;
  private playerHp = PLAYER_MAX_HP;
  private playerDirection: Direction = "south";
  private playerInvincible = false;

  // Dodge
  private isDodging = false;
  private dodgeTimer = 0;
  private dodgeDir = { x: 0, y: 0 };
  private lastDodgeTime = 0;

  // Shooting
  private lastShootTime = 0;
  private bullets: Bullet[] = [];

  // Map
  private terrainGrid: number[][] = [];
  private tilesetData: { tiles: Array<{ id: string; corners: { NE: string; NW: string; SE: string; SW: string }; bounding_box: { x: number; y: number; width: number; height: number } }> } | null = null;
  private waterTilesetData: { tiles: Array<{ id: string; corners: { NE: string; NW: string; SE: string; SW: string }; bounding_box: { x: number; y: number; width: number; height: number } }> } | null = null;
  private obstacles: Phaser.GameObjects.Rectangle[] = [];
  private extraTilesetData: Map<number, { tiles: Array<{ id: string; corners: { NE: string; NW: string; SE: string; SW: string }; bounding_box: { x: number; y: number; width: number; height: number } }> }> = new Map();
  private extraFrameMaps: Map<number, Map<string, number>> = new Map();

  // Enemies & NPCs
  private enemies: Enemy[] = [];
  private npcs: NPC[] = [];
  private collectibles: Collectible[] = [];
  private enemiesDefeated = 0;
  private totalEnemies = 5;

  // Zone system
  private gates: GateObj[] = [];
  private shrines: ShrineObj[] = [];
  private currentZone = 1;
  private zoneEnemiesKilled: Map<number, number> = new Map();
  private questionSource: QuestionSource = "enemy";
  private activeShrine: ShrineObj | null = null;
  private shieldBoss: Enemy | null = null;

  // Controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { [key: string]: Phaser.Input.Keyboard.Key };
  private attackKey!: Phaser.Input.Keyboard.Key;
  private dodgeKey!: Phaser.Input.Keyboard.Key;
  private interactKey!: Phaser.Input.Keyboard.Key;

  // Cleanup
  private unsubs: Array<() => void> = [];
  private destroyed = false;

  constructor() {
    super({ key: "CastleDungeon3StageScene" });
  }

  private get alive(): boolean {
    return !this.destroyed && !!this.scene;
  }

  init(data?: { level?: number }): void {
    this.levelIndex = data?.level ?? 0;
    this.gameState = "playing";
    this.playerHp = PLAYER_MAX_HP;
    this.playerDirection = "south";
    this.playerInvincible = false;
    this.isDodging = false;
    this.bullets = [];
    this.enemies = [];
    this.npcs = [];
    this.collectibles = [];
    this.obstacles = [];
    this.enemiesDefeated = 0;
    this.destroyed = false;
    // Zone reset
    this.gates = [];
    this.shrines = [];
    this.currentZone = 1;
    this.zoneEnemiesKilled = new Map([[1, 0], [2, 0], [3, 0]]);
    this.questionSource = "enemy";
    this.activeShrine = null;
    this.shieldBoss = null;
  }

  // ===========================================================================
  // Preload — all original + PixelLab boss/object assets
  // ===========================================================================

  preload(): void {
    const base = "/game-assets/dungeon";

    // Player rotations
    for (const dir of DIRECTIONS) {
      const key = `player-${dir}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, `${base}/player/rotations/${dir}.png`);
      }
    }

    // Player animations
    const playerAnims = [
      { name: "walking", frames: 6, dirs: ["south", "north", "west", "north-east"] },
      { name: "breathing-idle", frames: 4, dirs: ["south", "north", "west", "south-west"] },
      { name: "fireball", frames: 6, dirs: ["south", "north", "west", "north-east", "south-west"] },
    ];
    for (const anim of playerAnims) {
      for (const dir of anim.dirs) {
        for (let f = 0; f < anim.frames; f++) {
          const key = `player-${anim.name}-${dir}-${f}`;
          if (!this.textures.exists(key)) {
            this.load.image(key, `${base}/player/animations/${anim.name}/${dir}/frame_${String(f).padStart(3, "0")}.png`);
          }
        }
      }
    }

    // Regular enemy rotations
    for (const enemy of ENEMY_TYPES) {
      for (const dir of DIRECTIONS) {
        const key = `enemy-${enemy.key}-${dir}`;
        if (!this.textures.exists(key)) {
          this.load.image(key, `${base}/enemies/${enemy.key}/rotations/${dir}.png`);
        }
      }
    }

    // PixelLab boss rotations
    for (const bossKey of Object.keys(BOSS_TYPES)) {
      for (const dir of DIRECTIONS) {
        const key = `boss-${bossKey}-${dir}`;
        if (!this.textures.exists(key)) {
          this.load.image(key, `${base}/bosses/${bossKey}/rotations/${dir}.png`);
        }
      }
    }

    // PixelLab map objects
    const pixelObjects = ["gate", "shrine", "torch", "wall-segment", "wall-pillar"];
    for (const obj of pixelObjects) {
      if (!this.textures.exists(`pl-${obj}`)) {
        this.load.image(`pl-${obj}`, `${base}/objects/pixellab/${obj}.png`);
      }
    }

    // Tree types
    const treeTypes = ["tree", "pine", "oak", "stump", "willow", "birch", "bush", "berry-bush"];
    for (const t of treeTypes) {
      if (!this.textures.exists(t)) {
        this.load.image(t, `${base}/objects/${t}.png`);
      }
    }

    // Terrain objects
    for (const obj of ["pond", "rocks", "gravel-tile", "grass-tile"]) {
      if (!this.textures.exists(obj)) {
        this.load.image(obj, `${base}/objects/${obj}.png`);
      }
    }

    // Custom grass base
    if (!this.textures.exists("grass-base")) {
      this.load.image("grass-base", `${base}/tilesets/grass-base-tile.png`);
    }

    // Wang tilesets (forest + water)
    if (!this.cache.json.exists("grass-forest-meta")) {
      this.load.json("grass-forest-meta", `${base}/tilesets/grass-forest.json`);
    }
    if (!this.textures.exists("grass-forest-tileset")) {
      this.load.spritesheet("grass-forest-tileset", `${base}/tilesets/grass-forest.png`, { frameWidth: 16, frameHeight: 16 });
    }
    if (!this.cache.json.exists("grass-water-meta")) {
      this.load.json("grass-water-meta", `${base}/tilesets/grass-water.json`);
    }
    if (!this.textures.exists("grass-water-tileset")) {
      this.load.spritesheet("grass-water-tileset", `${base}/tilesets/grass-water.png`, { frameWidth: 16, frameHeight: 16 });
    }

    // Extra terrain tilesets
    const extraTilesets = [
      { terrain: 5, name: "grass-stone" },
      { terrain: 6, name: "grass-dirt" },
      { terrain: 7, name: "grass-sand" },
      { terrain: 8, name: "grass-lava" },
      { terrain: 9, name: "grass-snow" },
      { terrain: 10, name: "grass-swamp" },
    ];
    for (const ts of extraTilesets) {
      if (!this.cache.json.exists(`${ts.name}-meta`)) {
        this.load.json(`${ts.name}-meta`, `${base}/tilesets/${ts.name}.json`);
      }
      if (!this.textures.exists(`${ts.name}-tileset`)) {
        this.load.spritesheet(`${ts.name}-tileset`, `${base}/tilesets/${ts.name}.png`, { frameWidth: 16, frameHeight: 16 });
      }
    }

    // Custom terrain map
    this.load.json("custom-terrain-map", `${base}/maps/terrain.json?t=${Date.now()}`);
    this.load.on("loaderror", (file: { key: string }) => {
      if (file.key === "custom-terrain-map") {
        console.log("[Dungeon3Stage] No custom map file, using procedural");
      }
    });

    // Collectibles & projectiles
    for (const obj of ["apple", "fireball", "house"]) {
      if (!this.textures.exists(obj)) {
        this.load.image(obj, `${base}/objects/${obj}.png`);
      }
    }
  }

  // ===========================================================================
  // Create
  // ===========================================================================

  create(): void {
    this.physics.world.gravity.y = 0;

    this.createOpenWorld();
    this.createAnimations();
    this.createPlayer();
    this.spawnEnemies();
    this.setupZones();
    this.addEnemyGateColliders();
    this.spawnNPCs();
    this.spawnCollectibles();
    this.setupCamera();
    this.setupControls();

    const unsub = eventBus.on(GameEvents.CASTLE_ANSWER, (detail) => {
      if (!this.alive) return;
      this.onAnswerResult((detail as CastleAnswerPayload).correct);
    });
    this.unsubs.push(unsub);

    this.emitPhaseUpdate();
  }

  update(_time: number, delta: number): void {
    if (!this.alive) return;
    this.updateHealthBars();
    this.updateShrineGlow();

    if (this.gameState !== "playing") {
      if (this.player?.body) {
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
      for (const enemy of this.enemies) {
        if (enemy.sprite?.body) {
          (enemy.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }
      }
      return;
    }

    const dt = delta / 1000;
    this.updatePlayer(dt);
    this.updateBullets(dt);
    this.updateEnemies(dt);
    this.checkCollisions();
    this.updateCurrentZone();
  }

  shutdown(): void {
    this.destroyed = true;
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
  }

  // ===========================================================================
  // World — same terrain rendering as OG dungeon
  // ===========================================================================

  private createOpenWorld(): void {
    const worldW = MAP_WIDTH * TILE_SIZE;
    const worldH = MAP_HEIGHT * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    let customMap: { grid?: number[][]; objects?: Array<{ type: string; x: number; y: number }> } | null = null;
    try { customMap = this.cache.json.get("custom-terrain-map"); } catch { /* */ }

    if (customMap?.grid && Array.isArray(customMap.grid) && customMap.grid.length > 0) {
      this.terrainGrid = customMap.grid;
    } else {
      this.generateTerrainGrid();
    }

    // Carve vertical road through center and horizontal clearings at gate Y positions
    this.carveZoneRoads();

    this.renderTerrainWithWangTiles();
  }

  private carveZoneRoads(): void {
    const gridW = (this.terrainGrid[0]?.length ?? MAP_WIDTH + 1);
    const gridH = this.terrainGrid.length;
    const cx = Math.floor(gridW / 2);
    const roadHalfWidth = 3;

    // Carve a vertical road from top to bottom through the center
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = cx - roadHalfWidth; gx <= cx + roadHalfWidth; gx++) {
        if (gx >= 0 && gx < gridW && this.terrainGrid[gy]) {
          if (this.isForest(this.terrainGrid[gy][gx]) || this.terrainGrid[gy][gx] === 2) {
            this.terrainGrid[gy][gx] = 0;
          }
        }
      }
    }

    // Carve horizontal clearings at each gate Y to ensure walkable area
    for (const zdef of ZONE_DEFS) {
      if (!zdef.gateY) continue;
      const gateTileY = Math.floor(zdef.gateY / TILE_SIZE);
      for (let dy = -2; dy <= 2; dy++) {
        const gy = gateTileY + dy;
        if (gy < 0 || gy >= gridH) continue;
        for (let gx = 0; gx < gridW; gx++) {
          if (this.terrainGrid[gy] && (this.isForest(this.terrainGrid[gy][gx]) || this.terrainGrid[gy][gx] === 2)) {
            this.terrainGrid[gy][gx] = 0;
          }
        }
      }
    }
  }

  private generateTerrainGrid(): void {
    const gridW = MAP_WIDTH + 1;
    const gridH = MAP_HEIGHT + 1;
    this.terrainGrid = [];
    for (let y = 0; y < gridH; y++) {
      this.terrainGrid[y] = [];
      for (let x = 0; x < gridW; x++) {
        this.terrainGrid[y][x] = 0;
      }
    }

    const centerX = gridW / 2;
    const centerY = gridH / 2;
    const safeRadius = 8;
    const pathWidth = 4;

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distFromCenter < safeRadius) continue;
        const onHorizontalPath = Math.abs(y - centerY) < pathWidth;
        const onVerticalPath = Math.abs(x - centerX) < pathWidth;
        if (onHorizontalPath || onVerticalPath) continue;

        const edgeFactor = Math.min(x, gridW - x, y, gridH - y) / 15;
        const forestChance = 0.6 - edgeFactor * 0.3;
        const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 0.5 + 0.5;
        if (noise > forestChance || distFromCenter > gridW * 0.35) {
          this.terrainGrid[y][x] = Math.sin(x * 0.2 + y * 0.3) > 0 ? 1 : 3;
        }
      }
    }

    const clusters = [
      { cx: gridW * 0.15, cy: gridH * 0.15, r: 8, t: 1 },
      { cx: gridW * 0.85, cy: gridH * 0.15, r: 8, t: 3 },
      { cx: gridW * 0.15, cy: gridH * 0.85, r: 8, t: 3 },
      { cx: gridW * 0.85, cy: gridH * 0.85, r: 8, t: 1 },
      { cx: gridW * 0.25, cy: gridH * 0.3, r: 5, t: 1 },
      { cx: gridW * 0.75, cy: gridH * 0.3, r: 5, t: 3 },
      { cx: gridW * 0.25, cy: gridH * 0.7, r: 5, t: 3 },
      { cx: gridW * 0.75, cy: gridH * 0.7, r: 5, t: 1 },
    ];
    for (const cluster of clusters) {
      for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
          if (Math.sqrt((x - cluster.cx) ** 2 + (y - cluster.cy) ** 2) < cluster.r) {
            this.terrainGrid[y][x] = cluster.t;
          }
        }
      }
    }

    const ponds = [
      { cx: gridW * 0.3, cy: gridH * 0.35, rx: 3, ry: 2 },
      { cx: gridW * 0.7, cy: gridH * 0.65, rx: 4, ry: 2 },
      { cx: gridW * 0.55, cy: gridH * 0.2, rx: 2, ry: 2 },
    ];
    for (const pond of ponds) {
      for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
          const dx = (x - pond.cx) / pond.rx;
          const dy = (y - pond.cy) / pond.ry;
          if (dx * dx + dy * dy < 1 && this.terrainGrid[y][x] === 0) {
            this.terrainGrid[y][x] = 2;
          }
        }
      }
    }
  }

  // --- Wang tile frame maps (identical to OG) ---
  private tileFrameMap: Map<string, number> = new Map();
  private waterTileFrameMap: Map<string, number> = new Map();
  private grassBaseFrame = 0;

  private static EXTRA_TILESET_MAP: Record<number, string> = {
    5: "grass-stone", 6: "grass-dirt", 7: "grass-sand",
    8: "grass-lava", 9: "grass-snow", 10: "grass-swamp",
  };

  private buildTileFrameMap(): void {
    const meta = this.cache.json.get("grass-forest-meta");
    if (!meta?.tileset_data) return;
    this.tilesetData = meta.tileset_data;
    for (const tile of this.tilesetData!.tiles) {
      const key = `${tile.corners.NW}-${tile.corners.NE}-${tile.corners.SW}-${tile.corners.SE}`;
      this.tileFrameMap.set(key, (tile.bounding_box.y / 16) * 4 + (tile.bounding_box.x / 16));
    }
  }

  private buildWaterTileFrameMap(): void {
    const meta = this.cache.json.get("grass-water-meta");
    if (!meta?.tileset_data) return;
    this.waterTilesetData = meta.tileset_data;
    for (const tile of this.waterTilesetData!.tiles) {
      const key = `${tile.corners.NW}-${tile.corners.NE}-${tile.corners.SW}-${tile.corners.SE}`;
      this.waterTileFrameMap.set(key, (tile.bounding_box.y / 16) * 4 + (tile.bounding_box.x / 16));
    }
  }

  private buildExtraTileFrameMaps(): void {
    for (const [terrainStr, name] of Object.entries(CastleDungeon3StageScene.EXTRA_TILESET_MAP)) {
      const terrain = Number(terrainStr);
      const meta = this.cache.json.get(`${name}-meta`);
      if (!meta?.tileset_data?.tiles) continue;
      const frameMap = new Map<string, number>();
      for (const tile of meta.tileset_data.tiles as Array<{ corners: { NE: string; NW: string; SE: string; SW: string }; bounding_box: { x: number; y: number } }>) {
        const key = `${tile.corners.NW}-${tile.corners.NE}-${tile.corners.SW}-${tile.corners.SE}`;
        frameMap.set(key, (tile.bounding_box.y / 16) * 4 + (tile.bounding_box.x / 16));
      }
      this.extraTilesetData.set(terrain, meta.tileset_data);
      this.extraFrameMaps.set(terrain, frameMap);
    }
  }

  private isForest(v: number): boolean { return v === 1 || v === 3 || v === 4; }

  private getWaterFrame(nw: number, ne: number, sw: number, se: number): number {
    const t = (v: number) => v === 2 ? "upper" : "lower";
    return this.waterTileFrameMap.get(`${t(nw)}-${t(ne)}-${t(sw)}-${t(se)}`) ?? -1;
  }

  private getExtraFrame(terrain: number, nw: number, ne: number, sw: number, se: number): number {
    const fm = this.extraFrameMaps.get(terrain);
    if (!fm) return -1;
    const t = (v: number) => v === terrain ? "upper" : "lower";
    return fm.get(`${t(nw)}-${t(ne)}-${t(sw)}-${t(se)}`) ?? -1;
  }

  private renderTerrainWithWangTiles(): void {
    this.buildTileFrameMap();
    this.buildWaterTileFrameMap();
    this.buildExtraTileFrameMaps();

    const waterKey = "grass-water-tileset";
    const worldW = MAP_WIDTH * TILE_SIZE;
    const worldH = MAP_HEIGHT * TILE_SIZE;
    this.grassBaseFrame = this.tileFrameMap.get("lower-lower-lower-lower") ?? 0;

    const terrainRT = this.add.renderTexture(0, 0, worldW, worldH);
    terrainRT.setOrigin(0, 0).setDepth(-20);
    const overlayRT = this.add.renderTexture(0, 0, worldW, worldH);
    overlayRT.setOrigin(0, 0).setDepth(-15);

    const hasGrass = this.textures.exists("grass-base");
    const hasWater = this.textures.exists(waterKey);
    const grassStamp = hasGrass ? this.make.image({ key: "grass-base", add: false }) : null;
    const waterStamp = hasWater ? this.make.sprite({ key: waterKey, frame: 0, add: false }) : null;

    const extraStamps = new Map<number, Phaser.GameObjects.Sprite>();
    for (const [terrainStr, name] of Object.entries(CastleDungeon3StageScene.EXTRA_TILESET_MAP)) {
      const terrain = Number(terrainStr);
      const sheetKey = `${name}-tileset`;
      if (this.textures.exists(sheetKey) && this.extraFrameMaps.has(terrain)) {
        extraStamps.set(terrain, this.make.sprite({ key: sheetKey, frame: 0, add: false }));
      }
    }

    for (let ty = 0; ty < MAP_HEIGHT; ty++) {
      for (let tx = 0; tx < MAP_WIDTH; tx++) {
        const nw = this.terrainGrid[ty]?.[tx] ?? 0;
        const ne = this.terrainGrid[ty]?.[tx + 1] ?? 0;
        const sw = this.terrainGrid[ty + 1]?.[tx] ?? 0;
        const se = this.terrainGrid[ty + 1]?.[tx + 1] ?? 0;
        const cx = tx * TILE_SIZE + TILE_SIZE / 2;
        const cy = ty * TILE_SIZE + TILE_SIZE / 2;

        if (grassStamp) terrainRT.draw(grassStamp, cx, cy);

        if ((nw === 2 || ne === 2 || sw === 2 || se === 2) && waterStamp) {
          const wf = this.getWaterFrame(nw, ne, sw, se);
          if (wf >= 0) { waterStamp.setFrame(wf); overlayRT.draw(waterStamp, cx, cy); }
        }

        for (const [terrain, stamp] of extraStamps) {
          if ([nw, ne, sw, se].some(v => v === terrain)) {
            const frame = this.getExtraFrame(terrain, nw, ne, sw, se);
            if (frame >= 0) { stamp.setFrame(frame); overlayRT.draw(stamp, cx, cy); }
          }
        }

        const allSame = nw === ne && ne === sw && sw === se;
        if (allSame && (nw === 2 || nw === 8)) {
          const c = this.add.rectangle(cx, cy, TILE_SIZE - 2, TILE_SIZE - 2, 0x000000, 0);
          this.physics.add.existing(c, true);
          this.obstacles.push(c);
        }
      }
    }

    if (grassStamp) grassStamp.destroy();
    if (waterStamp) waterStamp.destroy();
    for (const s of extraStamps.values()) s.destroy();
    this.placeForestTrees();
    this.placeMapObjects();
  }

  private getTreeKeyForTerrain(v: number): string | null {
    if (v === 1 && this.textures.exists("pine")) return "pine";
    if (v === 3 && this.textures.exists("oak")) return "oak";
    if (v === 4 && this.textures.exists("willow")) return "willow";
    if (this.textures.exists("pine")) return "pine";
    if (this.textures.exists("oak")) return "oak";
    return null;
  }

  private placeForestTrees(): void {
    const hasStump = this.textures.exists("stump");
    for (let ty = 0; ty < MAP_HEIGHT; ty++) {
      for (let tx = 0; tx < MAP_WIDTH; tx++) {
        const nw = this.terrainGrid[ty]?.[tx] ?? 0;
        const ne = this.terrainGrid[ty]?.[tx + 1] ?? 0;
        const sw = this.terrainGrid[ty + 1]?.[tx] ?? 0;
        const se = this.terrainGrid[ty + 1]?.[tx + 1] ?? 0;
        const worldX = tx * TILE_SIZE + TILE_SIZE / 2;
        const worldY = ty * TILE_SIZE + TILE_SIZE / 2;
        const allForest = this.isForest(nw) && this.isForest(ne) && this.isForest(sw) && this.isForest(se);

        if (allForest) {
          if (Math.random() < 0.4) {
            const textureKey = this.getTreeKeyForTerrain(nw);
            if (textureKey) {
              const tree = this.add.sprite(worldX + (Math.random() - 0.5) * 8, worldY + (Math.random() - 0.5) * 8, textureKey);
              tree.setScale(nw === 4 ? Phaser.Math.FloatBetween(1.6, 2.2) : Phaser.Math.FloatBetween(0.8, 1.3));
              tree.setDepth(worldY);
            }
          }
          if (tx % 2 === 0 && ty % 2 === 0) {
            const c = this.add.rectangle(worldX + TILE_SIZE / 2, worldY + TILE_SIZE / 2, TILE_SIZE * 2 - 2, TILE_SIZE * 2 - 2, 0x000000, 0);
            this.physics.add.existing(c, true);
            this.obstacles.push(c);
          }
          continue;
        }

        const forestCorners = [nw, ne, sw, se].filter(v => this.isForest(v)).length;
        if (forestCorners >= 2 && Math.random() < 0.2) {
          const forestVal = [nw, ne, sw, se].find(v => this.isForest(v)) ?? 1;
          const textureKey = this.getTreeKeyForTerrain(forestVal);
          if (textureKey) {
            const tree = this.add.sprite(worldX, worldY, textureKey);
            tree.setScale(forestVal === 4 ? Phaser.Math.FloatBetween(1.0, 1.5) : Phaser.Math.FloatBetween(0.5, 0.9));
            tree.setDepth(worldY);
          }
        }
      }
    }

    if (hasStump) {
      for (let i = 0; i < 12; i++) {
        const pos = this.findGrassPosition(0, 80);
        if (!pos) continue;
        this.add.sprite(pos.x, pos.y, "stump").setScale(Phaser.Math.FloatBetween(0.6, 0.9)).setDepth(pos.y);
      }
    }
  }

  private placeMapObjects(): void {
    const customMap = this.cache.json.get("custom-terrain-map");
    if (!customMap?.objects) return;
    for (const obj of customMap.objects as Array<{ type: string; x: number; y: number }>) {
      if (!this.textures.exists(obj.type)) continue;
      const sprite = this.add.sprite(obj.x, obj.y, obj.type);
      sprite.setDepth(obj.y);
      sprite.setScale(obj.type === "house" ? 0.5 : Phaser.Math.FloatBetween(0.7, 1.0));
      const size = obj.type === "house" ? 40 : 20;
      const collider = this.add.rectangle(obj.x, obj.y, size, size, 0x000000, 0);
      this.physics.add.existing(collider, true);
      this.obstacles.push(collider);
    }
  }

  // ===========================================================================
  // Zone System — Gates, Shrines, Zone progression
  // ===========================================================================

  private findRoadXAtY(gateY: number): number {
    const worldW = MAP_WIDTH * TILE_SIZE;
    const centerX = Math.floor(MAP_WIDTH / 2);

    // Scan outward from center to find a walkable tile at this Y
    for (let offset = 0; offset < MAP_WIDTH / 2; offset++) {
      for (const dx of [0, -offset, offset]) {
        const tx = centerX + dx;
        if (tx < 0 || tx >= MAP_WIDTH) continue;
        if (this.isGrassTile(tx * TILE_SIZE + 8, gateY)) {
          return tx * TILE_SIZE + TILE_SIZE / 2;
        }
      }
    }
    return worldW / 2;
  }

  private setupZones(): void {
    const worldW = MAP_WIDTH * TILE_SIZE;
    const gateGap = 64;
    const wallThickness = 32;
    const hasWallSeg = this.textures.exists("pl-wall-segment");
    const hasWallPillar = this.textures.exists("pl-wall-pillar");
    const segW = 64;

    for (const zdef of ZONE_DEFS) {
      if (!zdef.gateY) continue;

      const gateY = zdef.gateY;
      const gateCx = this.findRoadXAtY(gateY);
      const wallSprites: Phaser.GameObjects.Sprite[] = [];

      // === Tile wall segments left of gate ===
      const leftEdge = gateCx - gateGap / 2;
      if (hasWallSeg) {
        for (let wx = 0; wx < leftEdge; wx += segW) {
          const seg = this.add.sprite(wx + segW / 2, gateY, "pl-wall-segment");
          seg.setDepth(gateY - 1);
          wallSprites.push(seg);
        }
      }

      // === Tile wall segments right of gate ===
      const rightEdge = gateCx + gateGap / 2;
      if (hasWallSeg) {
        for (let wx = rightEdge; wx < worldW; wx += segW) {
          const seg = this.add.sprite(wx + segW / 2, gateY, "pl-wall-segment");
          seg.setDepth(gateY - 1);
          wallSprites.push(seg);
        }
      }

      // === Pillars flanking the gate opening ===
      if (hasWallPillar) {
        const pillarL = this.add.sprite(leftEdge, gateY, "pl-wall-pillar").setDepth(gateY + 2);
        const pillarR = this.add.sprite(rightEdge, gateY, "pl-wall-pillar").setDepth(gateY + 2);
        wallSprites.push(pillarL, pillarR);
      }

      // Left wall collider
      const leftWidth = leftEdge;
      const wallLeft = this.add.rectangle(leftWidth / 2, gateY, leftWidth, wallThickness, 0x000000, 0);
      wallLeft.setDepth(gateY);
      this.physics.add.existing(wallLeft, true);

      // Right wall collider
      const rightWidth = worldW - rightEdge;
      const wallRight = this.add.rectangle(rightEdge + rightWidth / 2, gateY, rightWidth, wallThickness, 0x000000, 0);
      wallRight.setDepth(gateY);
      this.physics.add.existing(wallRight, true);

      // Gate sprite centered on road
      let gateSprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
      if (this.textures.exists("pl-gate")) {
        gateSprite = this.add.sprite(gateCx, gateY, "pl-gate");
        gateSprite.setScale(1.0).setDepth(gateY + 1);
      } else {
        gateSprite = this.add.rectangle(gateCx, gateY, gateGap, wallThickness, 0x886644, 1);
        gateSprite.setDepth(gateY + 1);
      }

      // Gate collider
      const gateCollider = this.add.rectangle(gateCx, gateY, gateGap, wallThickness, 0x000000, 0);
      this.physics.add.existing(gateCollider, true);

      // Player collisions
      this.physics.add.collider(this.player, wallLeft);
      this.physics.add.collider(this.player, wallRight);
      this.physics.add.collider(this.player, gateCollider);

      // Torches flanking the gate
      if (this.textures.exists("pl-torch")) {
        const torchL = this.add.sprite(gateCx - gateGap / 2 - 20, gateY - 8, "pl-torch").setScale(0.8).setDepth(gateY + 3);
        const torchR = this.add.sprite(gateCx + gateGap / 2 + 20, gateY - 8, "pl-torch").setScale(0.8).setDepth(gateY + 3);
        torchL.setFlipX(true);
        wallSprites.push(torchL, torchR);
        for (const torch of [torchL, torchR]) {
          this.tweens.add({ targets: torch, alpha: 0.7, duration: 400 + Math.random() * 200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        }
      }

      this.gates.push({
        zoneId: zdef.id,
        sprite: gateSprite,
        colliders: [gateCollider],
        wallLeft,
        wallRight,
        wallSprites,
        isOpen: false,
        y: gateY,
      });
    }

    // Create shrines NEAR their zone's gate (just south/inside the zone)
    for (const zdef of ZONE_DEFS) {
      if (zdef.shrineQuestions <= 0) continue;

      const gate = this.gates.find(g => g.zoneId === zdef.id);
      let shrineX: number;
      let shrineY: number;

      if (gate) {
        // Place shrine ~60px south (inside the zone) from the gate, offset slightly to the side
        shrineX = (gate.sprite as Phaser.GameObjects.Sprite).x + 40;
        shrineY = gate.y + 60;
        // Make sure it's on walkable ground; try a few offsets
        if (!this.isGrassTile(shrineX, shrineY)) {
          shrineX = (gate.sprite as Phaser.GameObjects.Sprite).x - 40;
        }
        if (!this.isGrassTile(shrineX, shrineY)) {
          const fallback = this.findGrassPosition(0, 60, gate.y + 20, gate.y + 120);
          if (fallback) { shrineX = fallback.x; shrineY = fallback.y; }
        }
      } else {
        const fallback = this.findGrassPosition(0, 80, zdef.yMin + 50, zdef.yMax - 50);
        if (!fallback) continue;
        shrineX = fallback.x;
        shrineY = fallback.y;
      }

      let shrineSprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;
      if (this.textures.exists("pl-shrine")) {
        shrineSprite = this.add.sprite(shrineX, shrineY, "pl-shrine").setScale(1.0).setDepth(shrineY);
      } else {
        shrineSprite = this.add.circle(shrineX, shrineY, 12, 0x9944ff, 1).setDepth(shrineY);
      }

      const glowEffect = this.add.circle(shrineX, shrineY + 5, 20, 0x9944ff, 0.15).setDepth(shrineY - 1);

      this.shrines.push({
        zoneId: zdef.id, sprite: shrineSprite, glowEffect,
        isActivated: false, isCompleted: false,
        questionsNeeded: zdef.shrineQuestions, questionsAnswered: 0,
        x: shrineX, y: shrineY,
      });
    }
  }

  private addEnemyGateColliders(): void {
    for (const gate of this.gates) {
      if (gate.isOpen) continue;
      for (const enemy of this.enemies) {
        this.physics.add.collider(enemy.sprite, gate.wallLeft);
        this.physics.add.collider(enemy.sprite, gate.wallRight);
        for (const c of gate.colliders) {
          this.physics.add.collider(enemy.sprite, c);
        }
      }
    }
  }

  private updateCurrentZone(): void {
    const py = this.player.y;
    for (const zdef of ZONE_DEFS) {
      if (py >= zdef.yMin && py <= zdef.yMax) {
        if (this.currentZone !== zdef.id) {
          this.currentZone = zdef.id;
          this.emitPhaseUpdate();
        }
        break;
      }
    }
  }

  private getZoneEnemyCount(zoneId: number): { total: number; killed: number } {
    const total = this.enemies.filter(e => e.zone === zoneId).length;
    const killed = this.zoneEnemiesKilled.get(zoneId) ?? 0;
    return { total, killed };
  }

  private checkZoneProgress(zoneId: number): void {
    const { total, killed } = this.getZoneEnemyCount(zoneId);
    const allKilled = killed >= total;

    // Activate shrine when all zone enemies are dead
    if (allKilled) {
      const shrine = this.shrines.find(s => s.zoneId === zoneId);
      if (shrine && !shrine.isActivated) {
        shrine.isActivated = true;
        // Visual activation: make shrine glow brighter
        if (shrine.glowEffect) {
          this.tweens.add({
            targets: shrine.glowEffect,
            scale: 1.5, alpha: 0.4,
            duration: 500, yoyo: true, repeat: -1,
            ease: "Sine.easeInOut",
          });
        }
        // Pulse the shrine sprite
        this.tweens.add({
          targets: shrine.sprite,
          scale: 1.15, duration: 600, yoyo: true, repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
    }

    // Check if shrine is completed to open gate
    const shrine = this.shrines.find(s => s.zoneId === zoneId);
    if (shrine?.isCompleted || (allKilled && !shrine)) {
      this.openGate(zoneId);
    }
  }

  private openGate(zoneId: number): void {
    const gate = this.gates.find(g => g.zoneId === zoneId);
    if (!gate || gate.isOpen) return;

    gate.isOpen = true;

    // Remove colliders
    for (const collider of gate.colliders) collider.destroy();
    gate.wallLeft.destroy();
    gate.wallRight.destroy();

    // Animate gate opening
    this.tweens.add({
      targets: gate.sprite,
      alpha: 0, scaleY: 0.1,
      duration: 800,
      ease: "Power2",
    });

    // Fade all wall sprites
    for (const ws of gate.wallSprites) {
      this.tweens.add({
        targets: ws,
        alpha: 0,
        duration: 1200,
        ease: "Power2",
        onComplete: () => ws.destroy(),
      });
    }

    this.cameras.main.flash(300, 255, 200, 100);

    eventBus.emit(GameEvents.GATE_OPENED, { zoneId });
    this.emitPhaseUpdate();
  }

  private updateShrineGlow(): void {
    // Pulse activated shrine glow in update loop (handled by tweens in setupZones)
  }

  // ===========================================================================
  // Player — spawns in Zone 1 (south)
  // ===========================================================================

  private createPlayer(): void {
    const spawnX = (MAP_WIDTH * TILE_SIZE) / 2;
    const spawnY = (MAP_HEIGHT * TILE_SIZE) * 0.85; // Zone 1: near bottom

    const textureKey = this.textures.exists("player-south") ? "player-south" : "__DEFAULT";
    this.player = this.add.sprite(spawnX, spawnY, textureKey);
    this.player.setScale(PLAYER_SCALE);
    this.player.setDepth(spawnY);

    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(20, 20);
    body.setOffset(14, 24);

    for (const obs of this.obstacles) {
      if (obs?.body) this.physics.add.collider(this.player, obs);
    }

    if (this.anims.exists("player-idle-south")) {
      this.player.play("player-idle-south");
    }
  }

  private setupCamera(): void {
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
    this.cameras.main.setZoom(2.5);
  }

  private setupControls(): void {
    if (!this.input.keyboard) return;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as { [key: string]: Phaser.Input.Keyboard.Key };
    this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.dodgeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  private createAnimations(): void {
    const walkDirs = ["south", "north", "west", "north-east"];
    for (const dir of walkDirs) {
      const key = `player-walk-${dir}`;
      if (!this.anims.exists(key) && this.textures.exists(`player-walking-${dir}-0`)) {
        this.anims.create({ key, frames: Array.from({ length: 6 }, (_, i) => ({ key: `player-walking-${dir}-${i}` })), frameRate: 10, repeat: -1 });
      }
    }
    const idleDirs = ["south", "north", "west", "south-west"];
    for (const dir of idleDirs) {
      const key = `player-idle-${dir}`;
      if (!this.anims.exists(key) && this.textures.exists(`player-breathing-idle-${dir}-0`)) {
        this.anims.create({ key, frames: Array.from({ length: 4 }, (_, i) => ({ key: `player-breathing-idle-${dir}-${i}` })), frameRate: 6, repeat: -1 });
      }
    }
    const attackDirs = ["south", "north", "west", "north-east", "south-west"];
    for (const dir of attackDirs) {
      const key = `player-attack-${dir}`;
      if (!this.anims.exists(key) && this.textures.exists(`player-fireball-${dir}-0`)) {
        this.anims.create({ key, frames: Array.from({ length: 6 }, (_, i) => ({ key: `player-fireball-${dir}-${i}` })), frameRate: 12, repeat: 0 });
      }
    }
  }

  private updatePlayer(dt: number): void {
    if (!this.player?.active) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    if (this.isDodging) {
      this.dodgeTimer -= dt * 1000;
      body.setVelocity(this.dodgeDir.x * DODGE_SPEED, this.dodgeDir.y * DODGE_SPEED);
      if (this.dodgeTimer <= 0) {
        this.isDodging = false;
        this.playerInvincible = false;
        this.player.setAlpha(1);
        this.playPlayerAnim("idle");
      }
      return;
    }

    const dir = new Phaser.Math.Vector2(0, 0);
    if (this.cursors?.left.isDown || this.wasd?.left.isDown) dir.x -= 1;
    if (this.cursors?.right.isDown || this.wasd?.right.isDown) dir.x += 1;
    if (this.cursors?.up.isDown || this.wasd?.up.isDown) dir.y -= 1;
    if (this.cursors?.down.isDown || this.wasd?.down.isDown) dir.y += 1;

    if (dir.length() > 0) {
      this.playerDirection = this.vectorToDirection(dir.x, dir.y);
      dir.normalize().scale(PLAYER_SPEED);
      this.playPlayerAnim("walk");
    } else {
      this.playPlayerAnim("idle");
    }
    body.setVelocity(dir.x, dir.y);

    if (Phaser.Input.Keyboard.JustDown(this.dodgeKey) && !this.isDodging) {
      if (this.time.now - this.lastDodgeTime > DODGE_COOLDOWN) {
        this.startDodge(dir.x || 0, dir.y || 0);
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) this.playerShootAutoAim();
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.tryInteractWithNPC();
      this.tryInteractWithShrine();
    }

    if (this.playerInvincible && !this.isDodging) {
      this.player.setAlpha(Math.sin(this.time.now * 0.015) > 0 ? 1 : 0.3);
    }
    this.player.setDepth(this.player.y);
  }

  private playPlayerAnim(type: "walk" | "idle" | "attack"): void {
    if (!this.player?.active) return;
    const animDir = this.getAnimDir(type);
    const animKey = `player-${type}-${animDir}`;
    const shouldFlip = this.playerDirection === "east" || this.playerDirection === "south-east" || this.playerDirection === "north-east";
    this.player.setFlipX(shouldFlip);
    if (this.anims.exists(animKey)) {
      if (this.player.anims.currentAnim?.key !== animKey) this.player.play(animKey, true);
    } else {
      const textureKey = `player-${this.playerDirection}`;
      if (this.textures.exists(textureKey)) this.player.setTexture(textureKey);
    }
  }

  private getAnimDir(type: string): string {
    const dir = this.playerDirection;
    if (type === "walk") {
      if (dir.includes("south")) return "south";
      if (dir.includes("north") && dir.includes("east")) return "north-east";
      if (dir.includes("north")) return "north";
      return "west";
    }
    if (type === "idle") {
      if (dir.includes("south") && dir.includes("west")) return "south-west";
      if (dir.includes("south")) return "south";
      if (dir.includes("north")) return "north";
      return "west";
    }
    if (dir.includes("south") && dir.includes("west")) return "south-west";
    if (dir.includes("north") && dir.includes("east")) return "north-east";
    if (dir.includes("south")) return "south";
    if (dir.includes("north")) return "north";
    return "west";
  }

  private startDodge(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) {
      const dirVec = this.directionToVector(this.playerDirection);
      dx = dirVec.x; dy = dirVec.y;
    }
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.dodgeDir = { x: dx / len, y: dy / len };
    this.isDodging = true;
    this.dodgeTimer = DODGE_DURATION;
    this.lastDodgeTime = this.time.now;
    this.playerInvincible = true;
    this.player.setAlpha(0.5);

    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 50, () => {
        if (!this.alive || !this.player?.active) return;
        const ghost = this.add.sprite(this.player.x, this.player.y, this.player.texture.key);
        ghost.setScale(PLAYER_SCALE).setAlpha(0.3).setTint(0x88ccff).setDepth(9);
        this.tweens.add({ targets: ghost, alpha: 0, duration: 200, onComplete: () => ghost.destroy() });
      });
    }
  }

  // ===========================================================================
  // Auto-Aim Shooting
  // ===========================================================================

  private playerShootAutoAim(): void {
    const now = this.time.now;
    if (now - this.lastShootTime < SHOOT_COOLDOWN) return;
    this.lastShootTime = now;

    let nearestEnemy: Enemy | null = null;
    let nearestDist = AUTO_AIM_RANGE;
    for (const enemy of this.enemies) {
      if (enemy.state === "dead") continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);
      if (dist < nearestDist) { nearestDist = dist; nearestEnemy = enemy; }
    }

    let targetX: number, targetY: number;
    if (nearestEnemy) {
      targetX = nearestEnemy.sprite.x; targetY = nearestEnemy.sprite.y;
    } else {
      const dirVec = this.directionToVector(this.playerDirection);
      targetX = this.player.x + dirVec.x * 100; targetY = this.player.y + dirVec.y * 100;
    }

    const dx = targetX - this.player.x;
    const dy = targetY - this.player.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const vx = (dx / len) * BULLET_SPEED;
    const vy = (dy / len) * BULLET_SPEED;

    this.playerDirection = this.vectorToDirection(dx, dy);
    this.playPlayerAnim("attack");

    const bx = this.player.x + (dx / len) * 15;
    const by = this.player.y + (dy / len) * 15;

    let bulletSprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;
    if (this.textures.exists("fireball")) {
      bulletSprite = this.add.sprite(bx, by, "fireball");
      bulletSprite.setScale(0.4).setRotation(Math.atan2(vy, vx));
    } else {
      bulletSprite = this.add.circle(bx, by, 4, 0xff6600, 1);
    }
    bulletSprite.setDepth(15);

    const glow = this.add.circle(bx, by, 8, 0x44ddff, 0.3).setDepth(14);
    this.bullets.push({ sprite: bulletSprite as Phaser.GameObjects.Arc, vx, vy, age: 0, fromPlayer: true });

    const flash = this.add.circle(bx, by, 10, 0xaaeeff, 0.6).setDepth(16);
    this.tweens.add({ targets: [flash, glow], scale: 1.5, alpha: 0, duration: 100, onComplete: () => { flash.destroy(); glow.destroy(); } });
  }

  // ===========================================================================
  // Enemies — zone-based spawning with PixelLab bosses
  // ===========================================================================

  private spawnEnemies(): void {
    for (const zdef of ZONE_DEFS) {
      const count = zdef.regularEnemies ?? 0;
      let spawned = 0;
      const yPad = Math.min(30, (zdef.yMax - zdef.yMin) * 0.1);

      for (let i = 0; i < count; i++) {
        const pos = this.findGrassPosition(0, 40, zdef.yMin + yPad, zdef.yMax - yPad);
        if (pos) {
          this.createEnemy(pos.x, pos.y, false, zdef.id);
          spawned++;
        }
      }

      // Fallback: if we didn't spawn enough enemies, force spawn at zone center
      while (spawned < count) {
        const fallbackX = (MAP_WIDTH * TILE_SIZE) / 2 + (Math.random() - 0.5) * 200;
        const fallbackY = (zdef.yMin + zdef.yMax) / 2 + (Math.random() - 0.5) * 100;
        this.createEnemy(fallbackX, fallbackY, false, zdef.id);
        spawned++;
      }

      if (zdef.zoneBoss) {
        const pos = this.findGrassPosition(0, 40, zdef.yMin + yPad, zdef.yMax - yPad);
        const bx = pos?.x ?? (MAP_WIDTH * TILE_SIZE) / 2;
        const by = pos?.y ?? (zdef.yMin + zdef.yMax) / 2;
        this.createBossEnemy(bx, by, zdef.zoneBoss, zdef.id);
      }

      if (zdef.finalBoss) {
        const pos = this.findGrassPosition(0, 40, zdef.yMin + yPad, zdef.yMax - yPad);
        const bx = pos?.x ?? (MAP_WIDTH * TILE_SIZE) / 2;
        const by = pos?.y ?? (zdef.yMin + zdef.yMax) / 2;
        this.createBossEnemy(bx, by, zdef.finalBoss, zdef.id);
      }
    }

    this.totalEnemies = this.enemies.length;
  }

  private createEnemy(x: number, y: number, isBoss: boolean, zone: number): void {
    const enemyType = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
    const hp = isBoss ? enemyType.hp * 3 : enemyType.hp;
    const speed = isBoss ? enemyType.speed * 0.8 : enemyType.speed;

    const textureKey = `enemy-${enemyType.key}-south`;
    const sprite = this.add.sprite(x, y, this.textures.exists(textureKey) ? textureKey : "__DEFAULT");
    sprite.setScale(isBoss ? ENEMY_SCALE * 1.3 : ENEMY_SCALE).setDepth(y);
    if (isBoss) sprite.setTint(0xff6666);

    this.physics.add.existing(sprite);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true).setSize(20, 20).setOffset(6, 10);
    for (const obs of this.obstacles) this.physics.add.collider(sprite, obs);

    const healthBar = this.add.graphics().setDepth(10000);
    this.enemies.push({
      sprite, healthBar, hp, maxHp: hp, speed, state: "patrol",
      patrolTarget: null, lastAttackTime: 0, attackCooldown: isBoss ? 1200 : 1800,
      isBoss, direction: "south", typeKey: enemyType.key, zone,
    });
  }

  private createBossEnemy(x: number, y: number, bossTypeKey: string, zone: number): void {
    const bossType = BOSS_TYPES[bossTypeKey];
    if (!bossType) { this.createEnemy(x, y, true, zone); return; }

    const textureKey = `boss-${bossTypeKey}-south`;
    const sprite = this.add.sprite(x, y, this.textures.exists(textureKey) ? textureKey : "__DEFAULT");
    sprite.setScale(bossType.scale).setDepth(y);

    this.physics.add.existing(sprite);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true).setSize(24, 24).setOffset(12, 18);
    for (const obs of this.obstacles) this.physics.add.collider(sprite, obs);

    const healthBar = this.add.graphics().setDepth(10000);
    const isFinal = bossTypeKey === "shadow-lord";

    this.enemies.push({
      sprite, healthBar, hp: bossType.hp, maxHp: bossType.hp,
      speed: bossType.speed, state: "patrol", patrolTarget: null,
      lastAttackTime: 0, attackCooldown: 1000,
      isBoss: true, direction: "south", typeKey: bossTypeKey, zone,
      bossTypeKey, shieldActive: false,
    });

    // Boss name label
    const label = this.add.text(x, y - 30, bossType.name, {
      fontSize: "8px", color: isFinal ? "#ff4444" : "#ffaa44",
      fontStyle: "bold", stroke: "#000000", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10001);
    this.tweens.add({ targets: label, alpha: 0, delay: 3000, duration: 1000, onComplete: () => label.destroy() });
  }

  private updateEnemies(_dt: number): void {
    for (const enemy of this.enemies) {
      if (enemy.state === "dead" || !enemy.sprite.active) continue;
      const body = enemy.sprite.body as Phaser.Physics.Arcade.Body;
      const dist = Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, this.player.x, this.player.y);
      enemy.sprite.setDepth(enemy.sprite.y);

      if (dist < 80) enemy.state = "attack";
      else if (dist < 150) enemy.state = "chase";
      else enemy.state = "patrol";

      switch (enemy.state) {
        case "patrol": this.enemyPatrol(enemy, body); break;
        case "chase": this.enemyChase(enemy, body); break;
        case "attack": this.enemyAttack(enemy, body); break;
      }
    }
  }

  private enemyPatrol(enemy: Enemy, body: Phaser.Physics.Arcade.Body): void {
    if (!enemy.patrolTarget || Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, enemy.patrolTarget.x, enemy.patrolTarget.y) < 20) {
      // Keep patrol within zone bounds
      const zdef = ZONE_DEFS.find(z => z.id === enemy.zone);
      const yMin = zdef?.yMin ?? 0;
      const yMax = zdef?.yMax ?? MAP_HEIGHT * TILE_SIZE;
      enemy.patrolTarget = {
        x: Phaser.Math.Clamp(enemy.sprite.x + (Math.random() - 0.5) * 150, 80, MAP_WIDTH * TILE_SIZE - 80),
        y: Phaser.Math.Clamp(enemy.sprite.y + (Math.random() - 0.5) * 150, yMin + 20, yMax - 20),
      };
    }
    const dx = enemy.patrolTarget.x - enemy.sprite.x;
    const dy = enemy.patrolTarget.y - enemy.sprite.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    body.setVelocity((dx / len) * enemy.speed * 0.4, (dy / len) * enemy.speed * 0.4);
    enemy.direction = this.vectorToDirection(dx, dy);
    this.updateEnemySprite(enemy);
  }

  private enemyChase(enemy: Enemy, body: Phaser.Physics.Arcade.Body): void {
    const dx = this.player.x - enemy.sprite.x;
    const dy = this.player.y - enemy.sprite.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    body.setVelocity((dx / len) * enemy.speed, (dy / len) * enemy.speed);
    enemy.direction = this.vectorToDirection(dx, dy);
    this.updateEnemySprite(enemy);
  }

  private enemyAttack(enemy: Enemy, body: Phaser.Physics.Arcade.Body): void {
    body.setVelocity(0, 0);
    const now = this.time.now;
    if (now - enemy.lastAttackTime > enemy.attackCooldown) {
      enemy.lastAttackTime = now;
      enemy.sprite.setTint(0xffff44);
      this.time.delayedCall(250, () => {
        if (!this.alive || enemy.state === "dead") return;
        enemy.sprite.clearTint();
        if (enemy.isBoss && !enemy.bossTypeKey) enemy.sprite.setTint(0xff6666);

        const dx = this.player.x - enemy.sprite.x;
        const dy = this.player.y - enemy.sprite.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const bullet = this.add.circle(enemy.sprite.x, enemy.sprite.y, 5, enemy.bossTypeKey ? 0xaa44ff : 0xff6644, 1).setDepth(15);
        this.bullets.push({ sprite: bullet, vx: (dx / len) * 120, vy: (dy / len) * 120, age: 0, fromPlayer: false });
      });
    }

    const dx = this.player.x - enemy.sprite.x;
    const dy = this.player.y - enemy.sprite.y;
    enemy.direction = this.vectorToDirection(dx, dy);
    this.updateEnemySprite(enemy);

    if (Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, this.player.x, this.player.y) > 120) {
      enemy.state = "chase";
    }
  }

  private updateEnemySprite(enemy: Enemy): void {
    if (enemy.bossTypeKey) {
      const textureKey = `boss-${enemy.bossTypeKey}-${enemy.direction}`;
      if (this.textures.exists(textureKey)) enemy.sprite.setTexture(textureKey);
    } else {
      const textureKey = `enemy-${enemy.typeKey}-${enemy.direction}`;
      if (this.textures.exists(textureKey)) enemy.sprite.setTexture(textureKey);
    }
    enemy.sprite.setFlipX(enemy.direction.includes("east"));
  }

  private updateHealthBars(): void {
    for (const enemy of this.enemies) {
      if (enemy.state === "dead") { enemy.healthBar.clear(); continue; }
      const barWidth = enemy.bossTypeKey ? 40 : 30;
      const barHeight = enemy.bossTypeKey ? 5 : 4;
      const x = enemy.sprite.x - barWidth / 2;
      const y = enemy.sprite.y - (enemy.bossTypeKey ? 30 : 25);
      const hpPercent = enemy.hp / enemy.maxHp;
      enemy.healthBar.clear();
      enemy.healthBar.fillStyle(0x000000, 0.6).fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);
      const healthColor = hpPercent > 0.5 ? 0x44ff44 : hpPercent > 0.25 ? 0xffaa00 : 0xff4444;
      enemy.healthBar.fillStyle(healthColor, 1).fillRect(x, y, barWidth * hpPercent, barHeight);
      // Shield indicator — animated magical barrier
      if (enemy.shieldActive) {
        const cx = enemy.sprite.x;
        const cy = enemy.sprite.y;
        const t = this.time.now * 0.003;
        const pulseR = 22 + Math.sin(t * 2) * 3;

        // Outer glow ring
        enemy.healthBar.lineStyle(3, 0x2266dd, 0.25 + Math.sin(t) * 0.1);
        enemy.healthBar.strokeCircle(cx, cy, pulseR + 6);

        // Main shield ring
        enemy.healthBar.lineStyle(2.5, 0x44aaff, 0.7 + Math.sin(t * 1.5) * 0.15);
        enemy.healthBar.strokeCircle(cx, cy, pulseR);

        // Inner bright core ring
        enemy.healthBar.lineStyle(1.5, 0x88ddff, 0.5 + Math.sin(t * 3) * 0.2);
        enemy.healthBar.strokeCircle(cx, cy, pulseR - 4);

        // Hex-pattern: 6 rotating shield nodes around the boss
        const nodeCount = 6;
        for (let n = 0; n < nodeCount; n++) {
          const angle = t + (n / nodeCount) * Math.PI * 2;
          const nx = cx + Math.cos(angle) * pulseR;
          const ny = cy + Math.sin(angle) * pulseR;
          const nodeAlpha = 0.5 + Math.sin(t * 4 + n) * 0.3;
          enemy.healthBar.fillStyle(0x66ccff, nodeAlpha);
          enemy.healthBar.fillCircle(nx, ny, 2);
        }

        // Connecting lines between alternating nodes for hex pattern
        enemy.healthBar.lineStyle(1, 0x44aaff, 0.2);
        for (let n = 0; n < nodeCount; n++) {
          const a1 = t + (n / nodeCount) * Math.PI * 2;
          const a2 = t + (((n + 2) % nodeCount) / nodeCount) * Math.PI * 2;
          enemy.healthBar.beginPath();
          enemy.healthBar.moveTo(cx + Math.cos(a1) * pulseR, cy + Math.sin(a1) * pulseR);
          enemy.healthBar.lineTo(cx + Math.cos(a2) * pulseR, cy + Math.sin(a2) * pulseR);
          enemy.healthBar.strokePath();
        }
      }
    }
  }

  // ===========================================================================
  // NPCs & Collectibles
  // ===========================================================================

  private spawnNPCs(): void {
    for (let i = 0; i < 3; i++) {
      const zone = i < 2 ? 1 : 2;
      const zdef = ZONE_DEFS.find(z => z.id === zone)!;
      const pos = this.findGrassPosition(0, 100, zdef.yMin + 30, zdef.yMax - 30);
      if (!pos) continue;

      if (this.textures.exists("house")) {
        this.add.sprite(pos.x, pos.y - 20, "house").setScale(0.5).setDepth(pos.y);
      }

      const textureKey = this.textures.exists("player-south") ? "player-south" : "__DEFAULT";
      const sprite = this.add.sprite(pos.x, pos.y + 15, textureKey);
      sprite.setScale(PLAYER_SCALE * 0.85).setTint(0x88ff88).setDepth(pos.y + 15);
      const indicator = this.add.circle(pos.x, pos.y - 10, 0, 0xffdd44, 0);
      indicator.setDepth(11);
      this.npcs.push({ sprite, indicator, interacted: false });
    }
  }

  private spawnCollectibles(): void {
    // Spread collectibles across all zones
    for (const zdef of ZONE_DEFS) {
      const count = zdef.id === 3 ? 3 : 6;
      for (let i = 0; i < count; i++) {
        const pos = this.findGrassPosition(0, 80, zdef.yMin + 20, zdef.yMax - 20);
        if (!pos) continue;

        let sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;
        if (this.textures.exists("apple")) {
          sprite = this.add.sprite(pos.x, pos.y, "apple").setScale(0.6).setDepth(5);
          this.tweens.add({ targets: sprite, y: "-=3", duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        } else {
          sprite = this.add.circle(pos.x, pos.y, 6, 0xff4444, 1).setDepth(5);
          this.tweens.add({ targets: sprite, y: "-=3", duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        }
        this.collectibles.push({ sprite, type: "apple" });
      }
    }
  }

  private tryInteractWithNPC(): void {
    for (const npc of this.npcs) {
      if (npc.interacted) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.sprite.x, npc.sprite.y) < 40) {
        npc.interacted = true;
        npc.indicator.setVisible(false);
        this.questionSource = "enemy";
        this.gameState = "question";
        eventBus.emit(GameEvents.CASTLE_QUESTION, { bossPhase: this.levelIndex + 1, source: "enemy" });
        return;
      }
    }
  }

  private tryInteractWithShrine(): void {
    for (const shrine of this.shrines) {
      if (!shrine.isActivated || shrine.isCompleted) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, shrine.x, shrine.y) < 50) {
        this.activeShrine = shrine;
        this.questionSource = "shrine";
        this.gameState = "question";
        eventBus.emit(GameEvents.CASTLE_QUESTION, {
          bossPhase: this.levelIndex + 1,
          source: "shrine",
          zoneName: ZONE_DEFS.find(z => z.id === shrine.zoneId)?.name,
        });
        return;
      }
    }
  }

  // ===========================================================================
  // Bullets & Collisions
  // ===========================================================================

  private updateBullets(dt: number): void {
    const toRemove: number[] = [];
    const worldW = MAP_WIDTH * TILE_SIZE;
    const worldH = MAP_HEIGHT * TILE_SIZE;

    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i];
      b.sprite.x += b.vx * dt;
      b.sprite.y += b.vy * dt;
      b.age += dt;

      if (b.sprite.x < 0 || b.sprite.x > worldW || b.sprite.y < 0 || b.sprite.y > worldH) {
        b.sprite.destroy(); toRemove.push(i); continue;
      }

      if (b.fromPlayer) {
        for (const enemy of this.enemies) {
          if (enemy.state === "dead") continue;
          if (Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, enemy.sprite.x, enemy.sprite.y) < 18) {
            this.damageEnemy(enemy);
            b.sprite.destroy(); toRemove.push(i); break;
          }
        }
      } else {
        if (!this.playerInvincible) {
          if (Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, this.player.x, this.player.y) < 15) {
            this.damagePlayer();
            b.sprite.destroy(); toRemove.push(i);
          }
        }
      }
      if (b.age > 4) { b.sprite.destroy(); toRemove.push(i); }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) this.bullets.splice(toRemove[i], 1);
  }

  private checkCollisions(): void {
    if (!this.playerInvincible) {
      for (const enemy of this.enemies) {
        if (enemy.state === "dead") continue;
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y) < 20) {
          this.damagePlayer(); break;
        }
      }
    }

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, c.sprite.x, c.sprite.y) < 20) {
        if (this.playerHp < PLAYER_MAX_HP) {
          this.playerHp = Math.min(this.playerHp + 1, PLAYER_MAX_HP);
          this.emitPhaseUpdate();
        }
        this.tweens.add({
          targets: c.sprite, scale: 1.5, alpha: 0, y: c.sprite.y - 20,
          duration: 200, onComplete: () => c.sprite.destroy(),
        });
        this.collectibles.splice(i, 1);
      }
    }
  }

  // ===========================================================================
  // Damage — with zone tracking and boss shield
  // ===========================================================================

  private damagePlayer(): void {
    if (this.playerInvincible || this.gameState !== "playing") return;
    this.playerHp--;
    this.playerInvincible = true;
    this.emitPhaseUpdate();

    this.player.setTintFill(0xff0000);
    this.cameras.main.shake(80, 0.003);
    this.time.delayedCall(100, () => { if (this.player?.active) this.player.clearTint(); });

    if (this.playerHp <= 0) {
      this.playerHp = 0;
      this.emitPhaseUpdate();
      this.triggerGameOver();
      return;
    }

    this.time.delayedCall(1000, () => {
      this.playerInvincible = false;
      if (this.player?.active) this.player.setAlpha(1);
    });
  }

  private triggerGameOver(): void {
    this.gameState = "paused";
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.player.setAlpha(0.4);
    this.enemies.forEach(e => {
      if (e.sprite?.active) (e.sprite.body as Phaser.Physics.Arcade.Body)?.setVelocity(0, 0);
    });
    this.time.delayedCall(500, () => { eventBus.emit("battle:gameover", {}); });
  }

  private damageEnemy(enemy: Enemy): void {
    // Boss shield: deflect damage and re-trigger the question
    if (enemy.shieldActive) {
      enemy.sprite.setTintFill(0x44aaff);
      this.time.delayedCall(100, () => { if (enemy.sprite?.active) enemy.sprite.clearTint(); });
      this.cameras.main.shake(40, 0.002);

      // Re-trigger shield question so the player can try again
      this.shieldBoss = enemy;
      this.questionSource = "boss_shield";
      this.gameState = "question";
      eventBus.emit(GameEvents.CASTLE_QUESTION, { bossPhase: this.levelIndex + 1, source: "boss_shield" });
      return;
    }

    enemy.hp--;
    enemy.sprite.setTintFill(0xffffff);
    this.time.delayedCall(80, () => {
      if (enemy.sprite?.active) {
        enemy.sprite.clearTint();
        if (enemy.isBoss && !enemy.bossTypeKey) enemy.sprite.setTint(0xff6666);
      }
    });

    // Check if boss should activate shield (final boss at 50% HP)
    if (enemy.bossTypeKey === "shadow-lord" && enemy.hp > 0 && enemy.hp <= enemy.maxHp / 2 && !enemy.shieldActive) {
      enemy.shieldActive = true;
      this.shieldBoss = enemy;
      this.questionSource = "boss_shield";
      this.gameState = "question";
      eventBus.emit(GameEvents.CASTLE_QUESTION, { bossPhase: this.levelIndex + 1, source: "boss_shield" });
      return;
    }

    if (enemy.hp <= 0) {
      enemy.state = "dead";
      enemy.sprite.setVisible(false).setActive(false);
      enemy.healthBar.clear();

      // Death particles
      for (let i = 0; i < 10; i++) {
        const p = this.add.circle(enemy.sprite.x, enemy.sprite.y, 4, enemy.bossTypeKey ? 0xaa44ff : 0xffaa44, 0.8).setDepth(15);
        this.tweens.add({ targets: p, x: enemy.sprite.x + (Math.random() - 0.5) * 60, y: enemy.sprite.y + (Math.random() - 0.5) * 60, alpha: 0, duration: 400, onComplete: () => p.destroy() });
      }

      this.enemiesDefeated++;
      const zoneKills = (this.zoneEnemiesKilled.get(enemy.zone) ?? 0) + 1;
      this.zoneEnemiesKilled.set(enemy.zone, zoneKills);
      this.emitPhaseUpdate();

      // Trigger question for this kill
      this.questionSource = "enemy";
      this.gameState = "question";
      eventBus.emit(GameEvents.CASTLE_QUESTION, { bossPhase: this.levelIndex + 1, source: "enemy" });
    }
  }

  // ===========================================================================
  // Questions, Shrine answers & Victory
  // ===========================================================================

  private onAnswerResult(correct: boolean): void {
    if (!this.alive) return;

    if (this.questionSource === "boss_shield") {
      if (correct && this.shieldBoss) {
        this.shieldBoss.shieldActive = false;
        // Shield break effect
        for (let i = 0; i < 15; i++) {
          const p = this.add.circle(this.shieldBoss.sprite.x, this.shieldBoss.sprite.y, 3, 0x44aaff, 0.9).setDepth(20);
          this.tweens.add({
            targets: p,
            x: this.shieldBoss.sprite.x + (Math.random() - 0.5) * 100,
            y: this.shieldBoss.sprite.y + (Math.random() - 0.5) * 100,
            alpha: 0, duration: 500, onComplete: () => p.destroy(),
          });
        }
        this.cameras.main.flash(200, 100, 200, 255);
        this.shieldBoss = null;
      }
      this.gameState = "playing";
      return;
    }

    if (this.questionSource === "shrine" && this.activeShrine) {
      if (correct) {
        this.activeShrine.questionsAnswered++;
        if (this.activeShrine.questionsAnswered >= this.activeShrine.questionsNeeded) {
          this.activeShrine.isCompleted = true;
          // Shrine completion effect
          if (this.activeShrine.glowEffect) {
            this.tweens.killTweensOf(this.activeShrine.glowEffect);
            this.tweens.killTweensOf(this.activeShrine.sprite);
            this.activeShrine.glowEffect.setAlpha(0.6).setScale(2.0);
            this.tweens.add({ targets: this.activeShrine.glowEffect, alpha: 0, scale: 3, duration: 1000, onComplete: () => this.activeShrine?.glowEffect?.destroy() });
          }
          this.checkZoneProgress(this.activeShrine.zoneId);
          this.activeShrine = null;
          this.gameState = "playing";
        } else {
          // More shrine questions needed — trigger next one immediately
          this.time.delayedCall(300, () => {
            if (!this.alive || !this.activeShrine) return;
            eventBus.emit(GameEvents.CASTLE_QUESTION, {
              bossPhase: this.levelIndex + 1,
              source: "shrine",
              zoneName: ZONE_DEFS.find(z => z.id === this.activeShrine!.zoneId)?.name,
            });
          });
          return;
        }
      } else {
        this.activeShrine = null;
        this.gameState = "playing";
      }
      return;
    }

    // Regular enemy question
    if (correct) {
      if (this.enemiesDefeated >= this.totalEnemies) {
        this.triggerVictory();
      } else {
        this.checkZoneProgress(this.currentZone);
        this.gameState = "playing";
      }
    } else {
      this.gameState = "playing";
    }
  }

  private triggerVictory(): void {
    this.gameState = "victory";
    this.emitPhaseUpdate();

    // Celebration particles
    for (let i = 0; i < 40; i++) {
      const colors = [0xffdd44, 0xff8844, 0x44aaff, 0x44ff88, 0xff44ff];
      const p = this.add.circle(this.player.x, this.player.y, 4, colors[Math.floor(Math.random() * colors.length)], 0.9).setDepth(25);
      this.tweens.add({ targets: p, x: this.player.x + (Math.random() - 0.5) * 200, y: this.player.y - Math.random() * 150, alpha: 0, duration: 1000 + Math.random() * 500, onComplete: () => p.destroy() });
    }

    // Second burst after a delay
    this.time.delayedCall(800, () => {
      for (let i = 0; i < 30; i++) {
        const colors = [0xffdd44, 0xaa44ff, 0x44aaff, 0x44ff88];
        const p = this.add.circle(this.player.x, this.player.y, 3, colors[Math.floor(Math.random() * colors.length)], 0.9).setDepth(25);
        this.tweens.add({ targets: p, x: this.player.x + (Math.random() - 0.5) * 250, y: this.player.y - Math.random() * 200 - 50, alpha: 0, duration: 800 + Math.random() * 600, onComplete: () => p.destroy() });
      }
    });
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private isWalkable(v: number): boolean {
    return v === 0 || v === 5 || v === 6 || v === 7 || v === 9 || v === 10;
  }

  private isGrassTile(worldX: number, worldY: number): boolean {
    const gx = Math.floor(worldX / TILE_SIZE);
    const gy = Math.floor(worldY / TILE_SIZE);
    if (gy < 0 || gy >= MAP_HEIGHT || gx < 0 || gx >= MAP_WIDTH) return false;
    const nw = this.terrainGrid[gy]?.[gx] ?? 1;
    const ne = this.terrainGrid[gy]?.[gx + 1] ?? 1;
    const sw = this.terrainGrid[gy + 1]?.[gx] ?? 1;
    const se = this.terrainGrid[gy + 1]?.[gx + 1] ?? 1;
    return this.isWalkable(nw) && this.isWalkable(ne) && this.isWalkable(sw) && this.isWalkable(se);
  }

  private findGrassPosition(minDistFromCenter: number, margin: number, yMin?: number, yMax?: number): { x: number; y: number } | null {
    const worldW = MAP_WIDTH * TILE_SIZE;
    const worldH = MAP_HEIGHT * TILE_SIZE;
    const cx = worldW / 2;
    const cy = worldH / 2;
    const actualYMin = yMin ?? margin;
    const actualYMax = yMax ?? (worldH - margin);

    for (let attempts = 0; attempts < 300; attempts++) {
      const x = margin + Math.random() * (worldW - margin * 2);
      const y = actualYMin + Math.random() * (actualYMax - actualYMin);
      if (Phaser.Math.Distance.Between(x, y, cx, cy) < minDistFromCenter) continue;
      if (!this.isGrassTile(x, y)) continue;
      return { x, y };
    }

    // Fallback: scan tiles in the zone for any grass tile
    const startTY = Math.max(0, Math.floor(actualYMin / TILE_SIZE));
    const endTY = Math.min(MAP_HEIGHT - 1, Math.floor(actualYMax / TILE_SIZE));
    for (let ty = startTY; ty <= endTY; ty++) {
      for (let tx = 2; tx < MAP_WIDTH - 2; tx++) {
        if (this.terrainGrid[ty]?.[tx] === 0) {
          return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
        }
      }
    }

    return null;
  }

  private vectorToDirection(x: number, y: number): Direction {
    const angle = Math.atan2(y, x) * (180 / Math.PI);
    if (angle >= -22.5 && angle < 22.5) return "east";
    if (angle >= 22.5 && angle < 67.5) return "south-east";
    if (angle >= 67.5 && angle < 112.5) return "south";
    if (angle >= 112.5 && angle < 157.5) return "south-west";
    if (angle >= 157.5 || angle < -157.5) return "west";
    if (angle >= -157.5 && angle < -112.5) return "north-west";
    if (angle >= -112.5 && angle < -67.5) return "north";
    return "north-east";
  }

  private directionToVector(dir: Direction): { x: number; y: number } {
    switch (dir) {
      case "north": return { x: 0, y: -1 };
      case "south": return { x: 0, y: 1 };
      case "east": return { x: 1, y: 0 };
      case "west": return { x: -1, y: 0 };
      case "north-east": return { x: 0.707, y: -0.707 };
      case "north-west": return { x: -0.707, y: -0.707 };
      case "south-east": return { x: 0.707, y: 0.707 };
      case "south-west": return { x: -0.707, y: 0.707 };
    }
  }

  private emitPhaseUpdate(): void {
    const bossEnemy = this.enemies.find(e => e.isBoss && e.bossTypeKey === "shadow-lord");
    const zoneProgress = ZONE_DEFS.map(zdef => {
      const { total, killed } = this.getZoneEnemyCount(zdef.id);
      const shrine = this.shrines.find(s => s.zoneId === zdef.id);
      const gate = this.gates.find(g => g.zoneId === zdef.id);
      return {
        zone: zdef.id,
        name: zdef.name,
        enemiesLeft: total - killed,
        shrineComplete: shrine?.isCompleted ?? true,
        gateOpen: gate?.isOpen ?? true,
      };
    });

    const payload: CastlePhasePayload = {
      bossPhase: this.levelIndex + 1,
      bossHp: bossEnemy?.hp ?? 0,
      maxBossHp: bossEnemy?.maxHp ?? 15,
      playerHp: this.playerHp,
      maxPlayerHp: PLAYER_MAX_HP,
      gameState: this.gameState as CastlePhasePayload["gameState"],
      currentZone: this.currentZone,
      totalZones: 3,
      zoneProgress,
    };
    eventBus.emit(GameEvents.CASTLE_PHASE_UPDATE, payload);
    eventBus.emit("battle:lives", { lives: this.playerHp });
  }
}

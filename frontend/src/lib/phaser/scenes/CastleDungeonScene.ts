import Phaser from "phaser";
import {
  eventBus,
  GameEvents,
  type CastlePhasePayload,
  type CastleAnswerPayload,
} from "../EventBus";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";

// =============================================================================
// Top-Down Forest Adventure - Open World Style
// =============================================================================

type GameState = "playing" | "question" | "victory" | "paused";
type Direction = "south" | "north" | "east" | "west" | "south-east" | "south-west" | "north-east" | "north-west";

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

const DIRECTIONS = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"] as const;

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

// =============================================================================
// Scene
// =============================================================================

export class CastleDungeonScene extends Phaser.Scene {
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

  // Map - Wang tileset based
  // 0=grass, 1=pine forest, 2=water, 3=oak forest, 4=willow
  // 5=stone, 6=path/dirt, 7=sand, 8=lava, 9=snow, 10=swamp
  private terrainGrid: number[][] = [];
  private tilesetData: { tiles: Array<{ id: string; corners: { NE: string; NW: string; SE: string; SW: string }; bounding_box: { x: number; y: number; width: number; height: number } }> } | null = null;
  private waterTilesetData: { tiles: Array<{ id: string; corners: { NE: string; NW: string; SE: string; SW: string }; bounding_box: { x: number; y: number; width: number; height: number } }> } | null = null;
  private obstacles: Phaser.GameObjects.Rectangle[] = [];

  // Extra terrain Wang tileset data (keyed by terrain type)
  private extraTilesetData: Map<number, { tiles: Array<{ id: string; corners: { NE: string; NW: string; SE: string; SW: string }; bounding_box: { x: number; y: number; width: number; height: number } }> }> = new Map();
  private extraFrameMaps: Map<number, Map<string, number>> = new Map();

  // Enemies & NPCs
  private enemies: Enemy[] = [];
  private npcs: NPC[] = [];
  private collectibles: Collectible[] = [];
  private enemiesDefeated = 0;
  private totalEnemies = 5;

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
    super({ key: "CastleDungeonScene" });
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
  }

  preload(): void {
    const base = "/game-assets/dungeon";

    // Load player rotations
    for (const dir of DIRECTIONS) {
      const key = `player-${dir}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, `${base}/player/rotations/${dir}.png`);
      }
    }

    // Load player animations
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

    // Load enemy rotations
    for (const enemy of ENEMY_TYPES) {
      for (const dir of DIRECTIONS) {
        const key = `enemy-${enemy.key}-${dir}`;
        if (!this.textures.exists(key)) {
          this.load.image(key, `${base}/enemies/${enemy.key}/rotations/${dir}.png`);
        }
      }
    }

    // Load tree types
    const treeTypes = ["tree", "pine", "oak", "stump", "willow", "birch", "bush", "berry-bush"];
    for (const t of treeTypes) {
      if (!this.textures.exists(t)) {
        this.load.image(t, `${base}/objects/${t}.png`);
      }
    }

    // Load terrain objects
    if (!this.textures.exists("pond")) {
      this.load.image("pond", `${base}/objects/pond.png`);
    }
    if (!this.textures.exists("rocks")) {
      this.load.image("rocks", `${base}/objects/rocks.png`);
    }
    if (!this.textures.exists("gravel-tile")) {
      this.load.image("gravel-tile", `${base}/objects/gravel-tile.png`);
    }
    if (!this.textures.exists("grass-tile")) {
      this.load.image("grass-tile", `${base}/objects/grass-tile.png`);
    }

    // Custom grass base tile (from Pixelorama - clean grass, no bushes)
    if (!this.textures.exists("grass-base")) {
      this.load.image("grass-base", `${base}/tilesets/grass-base-tile.png`);
    }
    // Grass-Forest Wang tileset (still used for forest border metadata)
    if (!this.cache.json.exists("grass-forest-meta")) {
      this.load.json("grass-forest-meta", `${base}/tilesets/grass-forest.json`);
    }
    if (!this.textures.exists("grass-forest-tileset")) {
      this.load.spritesheet("grass-forest-tileset", `${base}/tilesets/grass-forest.png`, {
        frameWidth: 16,
        frameHeight: 16,
      });
    }
    // Grass-Water Wang tileset
    if (!this.cache.json.exists("grass-water-meta")) {
      this.load.json("grass-water-meta", `${base}/tilesets/grass-water.json`);
    }
    if (!this.textures.exists("grass-water-tileset")) {
      this.load.spritesheet("grass-water-tileset", `${base}/tilesets/grass-water.png`, {
        frameWidth: 16,
        frameHeight: 16,
      });
    }

    // Extra terrain Wang tilesets: stone(5), dirt/path(6), sand(7), lava(8), snow(9), swamp(10)
    const extraTilesets: Array<{ terrain: number; name: string }> = [
      { terrain: 5, name: "grass-stone" },
      { terrain: 6, name: "grass-dirt" },
      { terrain: 7, name: "grass-sand" },
      { terrain: 8, name: "grass-lava" },
      { terrain: 9, name: "grass-snow" },
      { terrain: 10, name: "grass-swamp" },
    ];
    for (const ts of extraTilesets) {
      const metaKey = `${ts.name}-meta`;
      const sheetKey = `${ts.name}-tileset`;
      if (!this.cache.json.exists(metaKey)) {
        this.load.json(metaKey, `${base}/tilesets/${ts.name}.json`);
      }
      if (!this.textures.exists(sheetKey)) {
        this.load.spritesheet(sheetKey, `${base}/tilesets/${ts.name}.png`, {
          frameWidth: 16, frameHeight: 16,
        });
      }
    }

    // Load custom terrain map (ignore 404 if file doesn't exist yet)
    this.load.json("custom-terrain-map", `${base}/maps/terrain.json?t=${Date.now()}`);
    this.load.on("loaderror", (file: { key: string }) => {
      if (file.key === "custom-terrain-map") {
        console.log("[Dungeon] No custom map file found, will use procedural");
      }
    });

    // Load collectibles and projectiles
    if (!this.textures.exists("apple")) {
      this.load.image("apple", `${base}/objects/apple.png`);
    }
    if (!this.textures.exists("fireball")) {
      this.load.image("fireball", `${base}/objects/fireball.png`);
    }
    if (!this.textures.exists("house")) {
      this.load.image("house", `${base}/objects/house.png`);
    }
  }

  create(): void {
    // Disable gravity for top-down
    this.physics.world.gravity.y = 0;

    this.createOpenWorld();
    this.createAnimations();
    this.createPlayer();
    this.spawnEnemies();
    this.spawnNPCs();
    this.spawnCollectibles();
    this.setupCamera();
    this.setupControls();

    // Event listeners
    const unsub = eventBus.on(GameEvents.CASTLE_ANSWER, (detail) => {
      if (!this.alive) return;
      this.onAnswerResult((detail as CastleAnswerPayload).correct);
    });
    this.unsubs.push(unsub);

    this.emitPhaseUpdate();
  }

  update(_time: number, delta: number): void {
    if (!this.alive) return;
    
    // Always update health bars even during questions
    this.updateHealthBars();
    
    // Stop player movement when not playing
    if (this.gameState !== "playing") {
      if (this.player?.body) {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);
      }
      // Stop all enemies too
      for (const enemy of this.enemies) {
        if (enemy.sprite?.body) {
          const eBody = enemy.sprite.body as Phaser.Physics.Arcade.Body;
          eBody.setVelocity(0, 0);
        }
      }
      return;
    }
    
    const dt = delta / 1000;

    this.updatePlayer(dt);
    this.updateBullets(dt);
    this.updateEnemies(dt);
    this.checkCollisions();
  }

  shutdown(): void {
    this.destroyed = true;
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
  }

  // ===========================================================================
  // Dark Forest World - All PixelLab generated sprites
  // ===========================================================================

  private createOpenWorld(): void {
    const worldW = MAP_WIDTH * TILE_SIZE;
    const worldH = MAP_HEIGHT * TILE_SIZE;

    this.physics.world.setBounds(0, 0, worldW, worldH);

    // Try loading custom map, fall back to procedural generation
    let customMap: { grid?: number[][]; objects?: Array<{ type: string; x: number; y: number }> } | null = null;
    try {
      customMap = this.cache.json.get("custom-terrain-map");
    } catch { /* file not found */ }

    if (customMap?.grid && Array.isArray(customMap.grid) && customMap.grid.length > 0) {
      console.log("[Dungeon] Loaded custom map from terrain.json", customMap.grid.length, "rows");
      this.terrainGrid = customMap.grid;
    } else {
      console.log("[Dungeon] No custom map found, generating procedurally");
      this.generateTerrainGrid();
    }

    this.renderTerrainWithWangTiles();
  }

  // Wang tileset terrain generation
  private generateTerrainGrid(): void {
    // Create a vertex grid (MAP_WIDTH+1 x MAP_HEIGHT+1) for Wang tiling
    // 0 = grass (lower), 1 = forest (upper)
    const gridW = MAP_WIDTH + 1;
    const gridH = MAP_HEIGHT + 1;
    
    this.terrainGrid = [];
    for (let y = 0; y < gridH; y++) {
      this.terrainGrid[y] = [];
      for (let x = 0; x < gridW; x++) {
        // Default to grass
        this.terrainGrid[y][x] = 0;
      }
    }

    // Create forest areas by setting vertices to 1
    const centerX = gridW / 2;
    const centerY = gridH / 2;
    const safeRadius = 8; // Keep center clear for player spawn
    const pathWidth = 4; // Clear path through center

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        // Distance from center
        const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        
        // Skip center safe zone
        if (distFromCenter < safeRadius) continue;
        
        // Skip main cross paths
        const onHorizontalPath = Math.abs(y - centerY) < pathWidth;
        const onVerticalPath = Math.abs(x - centerX) < pathWidth;
        if (onHorizontalPath || onVerticalPath) continue;

        // Create forest with noise-like pattern
        // Corners and edges more likely to be forest
        const edgeFactor = Math.min(x, gridW - x, y, gridH - y) / 15;
        const forestChance = 0.6 - edgeFactor * 0.3;
        
        // Use simple noise-like pattern
        const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 0.5 + 0.5;
        
        if (noise > forestChance || distFromCenter > gridW * 0.35) {
          // Alternate between pine (1) and oak (3) by region
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
          const dist = Math.sqrt((x - cluster.cx) ** 2 + (y - cluster.cy) ** 2);
          if (dist < cluster.r) {
            this.terrainGrid[y][x] = cluster.t;
          }
        }
      }
    }

    // Add water ponds in grass areas (value = 2)
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
          if (dx * dx + dy * dy < 1) {
            // Only place water where there is currently grass
            if (this.terrainGrid[y][x] === 0) {
              this.terrainGrid[y][x] = 2;
            }
          }
        }
      }
    }
  }

  private tileFrameMap: Map<string, number> = new Map();

  private buildTileFrameMap(): void {
    const meta = this.cache.json.get("grass-forest-meta");
    if (!meta || !meta.tileset_data) {
      console.warn("No tileset metadata found");
      return;
    }
    this.tilesetData = meta.tileset_data;

    // Build a map from corner configuration to frame index
    // Frame index = (y / 16) * 4 + (x / 16) for a 4x4 grid
    for (const tile of this.tilesetData!.tiles) {
      const key = `${tile.corners.NW}-${tile.corners.NE}-${tile.corners.SW}-${tile.corners.SE}`;
      const frameX = tile.bounding_box.x / 16;
      const frameY = tile.bounding_box.y / 16;
      const frameIndex = frameY * 4 + frameX;
      this.tileFrameMap.set(key, frameIndex);
    }
  }

  private isForest(v: number): boolean {
    return v === 1 || v === 3 || v === 4;
  }

  // Water Wang tile lookup
  private waterTileFrameMap: Map<string, number> = new Map();

  private buildWaterTileFrameMap(): void {
    const meta = this.cache.json.get("grass-water-meta");
    if (!meta?.tileset_data) return;
    this.waterTilesetData = meta.tileset_data;

    for (const tile of this.waterTilesetData!.tiles) {
      const key = `${tile.corners.NW}-${tile.corners.NE}-${tile.corners.SW}-${tile.corners.SE}`;
      const frameX = tile.bounding_box.x / 16;
      const frameY = tile.bounding_box.y / 16;
      this.waterTileFrameMap.set(key, frameY * 4 + frameX);
    }
  }

  private getWaterFrame(nw: number, ne: number, sw: number, se: number): number {
    const toType = (v: number) => v === 2 ? "upper" : "lower";
    const key = `${toType(nw)}-${toType(ne)}-${toType(sw)}-${toType(se)}`;
    return this.waterTileFrameMap.get(key) ?? -1;
  }

  private grassBaseFrame = 0;

  // Terrain type -> tileset asset name mapping
  private static EXTRA_TILESET_MAP: Record<number, string> = {
    5: "grass-stone",
    6: "grass-dirt",
    7: "grass-sand",
    8: "grass-lava",
    9: "grass-snow",
    10: "grass-swamp",
  };

  private buildExtraTileFrameMaps(): void {
    for (const [terrainStr, name] of Object.entries(CastleDungeonScene.EXTRA_TILESET_MAP)) {
      const terrain = Number(terrainStr);
      const metaKey = `${name}-meta`;
      const meta = this.cache.json.get(metaKey);
      if (!meta?.tileset_data?.tiles) continue;

      const frameMap = new Map<string, number>();
      for (const tile of meta.tileset_data.tiles as Array<{ corners: { NE: string; NW: string; SE: string; SW: string }; bounding_box: { x: number; y: number } }>) {
        const key = `${tile.corners.NW}-${tile.corners.NE}-${tile.corners.SW}-${tile.corners.SE}`;
        const fi = (tile.bounding_box.y / 16) * 4 + (tile.bounding_box.x / 16);
        frameMap.set(key, fi);
      }
      this.extraTilesetData.set(terrain, meta.tileset_data);
      this.extraFrameMaps.set(terrain, frameMap);
    }
  }

  private getExtraFrame(terrain: number, nw: number, ne: number, sw: number, se: number): number {
    const fm = this.extraFrameMaps.get(terrain);
    if (!fm) return -1;
    const toType = (v: number) => v === terrain ? "upper" : "lower";
    const key = `${toType(nw)}-${toType(ne)}-${toType(sw)}-${toType(se)}`;
    return fm.get(key) ?? -1;
  }

  private renderTerrainWithWangTiles(): void {
    this.buildTileFrameMap();
    this.buildWaterTileFrameMap();
    this.buildExtraTileFrameMaps();

    const grassKey = "grass-forest-tileset";
    const waterKey = "grass-water-tileset";
    const worldW = MAP_WIDTH * TILE_SIZE;
    const worldH = MAP_HEIGHT * TILE_SIZE;

    this.grassBaseFrame = this.tileFrameMap.get("lower-lower-lower-lower") ?? 0;

    // Bake terrain into RenderTextures (a few objects instead of 6400+ sprites)
    const terrainRT = this.add.renderTexture(0, 0, worldW, worldH);
    terrainRT.setOrigin(0, 0);
    terrainRT.setDepth(-20);

    const overlayRT = this.add.renderTexture(0, 0, worldW, worldH);
    overlayRT.setOrigin(0, 0);
    overlayRT.setDepth(-15);

    const hasGrass = this.textures.exists("grass-base");
    const hasWater = this.textures.exists(waterKey);

    const grassStamp = hasGrass ? this.make.image({ key: "grass-base", add: false }) : null;
    const waterStamp = hasWater ? this.make.sprite({ key: waterKey, frame: 0, add: false }) : null;

    // Stamps for each extra terrain tileset
    const extraStamps = new Map<number, Phaser.GameObjects.Sprite>();
    for (const [terrainStr, name] of Object.entries(CastleDungeonScene.EXTRA_TILESET_MAP)) {
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

        // Base: grass (clean tile, frame 0)
        if (grassStamp) {
          terrainRT.draw(grassStamp, cx, cy);
        }

        // Wang tiles for water (terrain 2)
        const cellHasWater = nw === 2 || ne === 2 || sw === 2 || se === 2;
        if (cellHasWater && waterStamp) {
          const wf = this.getWaterFrame(nw, ne, sw, se);
          if (wf >= 0) {
            waterStamp.setFrame(wf);
            overlayRT.draw(waterStamp, cx, cy);
          }
        }

        // Wang tiles for extra terrain types (5-10)
        for (const [terrain, stamp] of extraStamps) {
          const corners = [nw, ne, sw, se];
          if (corners.some(v => v === terrain)) {
            const frame = this.getExtraFrame(terrain, nw, ne, sw, se);
            if (frame >= 0) {
              stamp.setFrame(frame);
              overlayRT.draw(stamp, cx, cy);
            }
          }
        }

        // Collision for impassable terrain (water, lava)
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
    // 1=pine, 3=oak, 4=willow
    if (v === 1 && this.textures.exists("pine")) return "pine";
    if (v === 3 && this.textures.exists("oak")) return "oak";
    if (v === 4 && this.textures.exists("willow")) return "willow";
    // Fallback
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
          const dominant = nw;
          const isWillow = dominant === 4;

          // Only place tree sprites on ~40% of forest tiles (visual density) 
          if (Math.random() < 0.4) {
            const textureKey = this.getTreeKeyForTerrain(dominant);
            if (textureKey) {
              const tree = this.add.sprite(
                worldX + (Math.random() - 0.5) * 8,
                worldY + (Math.random() - 0.5) * 8,
                textureKey
              );
              tree.setScale(isWillow
                ? Phaser.Math.FloatBetween(1.6, 2.2)
                : Phaser.Math.FloatBetween(0.8, 1.3));
              tree.setDepth(worldY);
            }
          }

          // Collision: only create one per 2x2 block to reduce physics body count
          if (tx % 2 === 0 && ty % 2 === 0) {
            const c = this.add.rectangle(worldX + TILE_SIZE / 2, worldY + TILE_SIZE / 2,
              TILE_SIZE * 2 - 2, TILE_SIZE * 2 - 2, 0x000000, 0);
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
            tree.setScale(forestVal === 4
              ? Phaser.Math.FloatBetween(1.0, 1.5)
              : Phaser.Math.FloatBetween(0.5, 0.9));
            tree.setDepth(worldY);
          }
        }
      }
    }

    if (hasStump) {
      for (let i = 0; i < 12; i++) {
        const pos = this.findGrassPosition(0, 80);
        if (!pos) continue;
        const stump = this.add.sprite(pos.x, pos.y, "stump");
        stump.setScale(Phaser.Math.FloatBetween(0.6, 0.9));
        stump.setDepth(pos.y);
      }
    }
  }

  private placeMapObjects(): void {
    const customMap = this.cache.json.get("custom-terrain-map");
    if (!customMap?.objects) return;

    for (const obj of customMap.objects as Array<{ type: string; x: number; y: number }>) {
      const textureKey = obj.type;
      if (!this.textures.exists(textureKey)) continue;

      const sprite = this.add.sprite(obj.x, obj.y, textureKey);
      sprite.setDepth(obj.y);

      if (obj.type === "house") {
        sprite.setScale(0.5);
      } else {
        sprite.setScale(Phaser.Math.FloatBetween(0.7, 1.0));
      }

      // All placed objects have collision
      const size = obj.type === "house" ? 40 : 20;
      const collider = this.add.rectangle(obj.x, obj.y, size, size, 0x000000, 0);
      this.physics.add.existing(collider, true);
      this.obstacles.push(collider);
    }
  }

  private isWalkable(v: number): boolean {
    // Walkable: grass(0), stone(5), path(6), sand(7), snow(9), swamp(10)
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

  private findGrassPosition(minDistFromCenter: number, margin: number): { x: number; y: number } | null {
    const worldW = MAP_WIDTH * TILE_SIZE;
    const worldH = MAP_HEIGHT * TILE_SIZE;
    const cx = worldW / 2;
    const cy = worldH / 2;

    for (let attempts = 0; attempts < 100; attempts++) {
      const x = margin + Math.random() * (worldW - margin * 2);
      const y = margin + Math.random() * (worldH - margin * 2);
      if (Phaser.Math.Distance.Between(x, y, cx, cy) < minDistFromCenter) continue;
      if (!this.isGrassTile(x, y)) continue;
      return { x, y };
    }
    return null;
  }




  private createAnimations(): void {
    // Player walk animations
    const walkDirs = ["south", "north", "west", "north-east"];
    for (const dir of walkDirs) {
      const key = `player-walk-${dir}`;
      if (!this.anims.exists(key) && this.textures.exists(`player-walking-${dir}-0`)) {
        this.anims.create({
          key,
          frames: Array.from({ length: 6 }, (_, i) => ({ key: `player-walking-${dir}-${i}` })),
          frameRate: 10,
          repeat: -1,
        });
      }
    }

    // Player idle animations
    const idleDirs = ["south", "north", "west", "south-west"];
    for (const dir of idleDirs) {
      const key = `player-idle-${dir}`;
      if (!this.anims.exists(key) && this.textures.exists(`player-breathing-idle-${dir}-0`)) {
        this.anims.create({
          key,
          frames: Array.from({ length: 4 }, (_, i) => ({ key: `player-breathing-idle-${dir}-${i}` })),
          frameRate: 6,
          repeat: -1,
        });
      }
    }

    // Player attack animations
    const attackDirs = ["south", "north", "west", "north-east", "south-west"];
    for (const dir of attackDirs) {
      const key = `player-attack-${dir}`;
      if (!this.anims.exists(key) && this.textures.exists(`player-fireball-${dir}-0`)) {
        this.anims.create({
          key,
          frames: Array.from({ length: 6 }, (_, i) => ({ key: `player-fireball-${dir}-${i}` })),
          frameRate: 12,
          repeat: 0,
        });
      }
    }
  }

  // ===========================================================================
  // Player
  // ===========================================================================

  private createPlayer(): void {
    const spawnX = (MAP_WIDTH * TILE_SIZE) / 2;
    const spawnY = (MAP_HEIGHT * TILE_SIZE) / 2;

    const textureKey = this.textures.exists("player-south") ? "player-south" : "__DEFAULT";
    this.player = this.add.sprite(spawnX, spawnY, textureKey);
    this.player.setScale(PLAYER_SCALE);
    this.player.setDepth(spawnY);

    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(20, 20);
    body.setOffset(14, 24);

    // Collide with ALL obstacles (trees, ponds, rocks)
    for (const obs of this.obstacles) {
      if (obs && obs.body) {
        this.physics.add.collider(this.player, obs);
      }
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
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as { [key: string]: Phaser.Input.Keyboard.Key };

    this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.dodgeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  private updatePlayer(dt: number): void {
    if (!this.player?.active) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // Handle dodge
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

    // Movement input
    const dir = new Phaser.Math.Vector2(0, 0);
    
    if (this.cursors?.left.isDown || this.wasd?.left.isDown) dir.x -= 1;
    if (this.cursors?.right.isDown || this.wasd?.right.isDown) dir.x += 1;
    if (this.cursors?.up.isDown || this.wasd?.up.isDown) dir.y -= 1;
    if (this.cursors?.down.isDown || this.wasd?.down.isDown) dir.y += 1;

    const isMoving = dir.length() > 0;
    if (isMoving) {
      this.playerDirection = this.vectorToDirection(dir.x, dir.y);
      dir.normalize().scale(PLAYER_SPEED);
      this.playPlayerAnim("walk");
    } else {
      this.playPlayerAnim("idle");
    }

    body.setVelocity(dir.x, dir.y);

    // Dodge input
    if (Phaser.Input.Keyboard.JustDown(this.dodgeKey) && !this.isDodging) {
      const now = this.time.now;
      if (now - this.lastDodgeTime > DODGE_COOLDOWN) {
        this.startDodge(dir.x || 0, dir.y || 0);
      }
    }

    // Attack input - AUTO AIM
    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.playerShootAutoAim();
    }

    // Interact input
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.tryInteractWithNPC();
    }

    // Invincibility flicker
    if (this.playerInvincible && !this.isDodging) {
      this.player.setAlpha(Math.sin(this.time.now * 0.015) > 0 ? 1 : 0.3);
    }

    this.player.setDepth(this.player.y);
  }

  private playPlayerAnim(type: "walk" | "idle" | "attack"): void {
    if (!this.player?.active) return;

    const animDir = this.getAnimDir(type);
    const animKey = `player-${type}-${animDir}`;

    // Handle horizontal flipping
    const shouldFlip = this.playerDirection === "east" || 
                       this.playerDirection === "south-east" ||
                       this.playerDirection === "north-east";
    this.player.setFlipX(shouldFlip);

    if (this.anims.exists(animKey)) {
      const currentAnim = this.player.anims.currentAnim?.key;
      if (currentAnim !== animKey) {
        this.player.play(animKey, true);
      }
    } else {
      const textureKey = `player-${this.playerDirection}`;
      if (this.textures.exists(textureKey)) {
        this.player.setTexture(textureKey);
      }
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
    // attack
    if (dir.includes("south") && dir.includes("west")) return "south-west";
    if (dir.includes("north") && dir.includes("east")) return "north-east";
    if (dir.includes("south")) return "south";
    if (dir.includes("north")) return "north";
    return "west";
  }

  private startDodge(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) {
      const dirVec = this.directionToVector(this.playerDirection);
      dx = dirVec.x;
      dy = dirVec.y;
    }

    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.dodgeDir = { x: dx / len, y: dy / len };
    this.isDodging = true;
    this.dodgeTimer = DODGE_DURATION;
    this.lastDodgeTime = this.time.now;
    this.playerInvincible = true;
    this.player.setAlpha(0.5);

    // Afterimages
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 50, () => {
        if (!this.alive || !this.player?.active) return;
        const ghost = this.add.sprite(this.player.x, this.player.y, this.player.texture.key);
        ghost.setScale(PLAYER_SCALE);
        ghost.setAlpha(0.3);
        ghost.setTint(0x88ccff);
        ghost.setDepth(9);
        this.tweens.add({
          targets: ghost,
          alpha: 0,
          duration: 200,
          onComplete: () => ghost.destroy(),
        });
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

    // Find nearest enemy
    let nearestEnemy: Enemy | null = null;
    let nearestDist = AUTO_AIM_RANGE;

    for (const enemy of this.enemies) {
      if (enemy.state === "dead") continue;
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        enemy.sprite.x, enemy.sprite.y
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = enemy;
      }
    }

    let targetX: number, targetY: number;

    if (nearestEnemy) {
      // Aim at nearest enemy
      targetX = nearestEnemy.sprite.x;
      targetY = nearestEnemy.sprite.y;
    } else {
      // Shoot in facing direction
      const dirVec = this.directionToVector(this.playerDirection);
      targetX = this.player.x + dirVec.x * 100;
      targetY = this.player.y + dirVec.y * 100;
    }

    // Calculate direction to target
    const dx = targetX - this.player.x;
    const dy = targetY - this.player.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const vx = (dx / len) * BULLET_SPEED;
    const vy = (dy / len) * BULLET_SPEED;

    // Update player direction to face target
    this.playerDirection = this.vectorToDirection(dx, dy);
    this.playPlayerAnim("attack");

    // Spawn bullet using PixelLab fireball sprite
    const bx = this.player.x + (dx / len) * 15;
    const by = this.player.y + (dy / len) * 15;

    let bulletSprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;
    if (this.textures.exists("fireball")) {
      bulletSprite = this.add.sprite(bx, by, "fireball");
      bulletSprite.setScale(0.4);
      bulletSprite.setRotation(Math.atan2(vy, vx));
    } else {
      bulletSprite = this.add.circle(bx, by, 4, 0xff6600, 1);
    }
    bulletSprite.setDepth(15);

    const bullet = bulletSprite as Phaser.GameObjects.Arc;

    // Add glow effect
    const glow = this.add.circle(bx, by, 8, 0x44ddff, 0.3);
    glow.setDepth(14);

    this.bullets.push({
      sprite: bullet,
      vx,
      vy,
      age: 0,
      fromPlayer: true,
    });

    // Muzzle flash
    const flash = this.add.circle(bx, by, 10, 0xaaeeff, 0.6);
    flash.setDepth(16);
    this.tweens.add({
      targets: [flash, glow],
      scale: 1.5,
      alpha: 0,
      duration: 100,
      onComplete: () => { flash.destroy(); glow.destroy(); },
    });
  }

  // ===========================================================================
  // Enemies
  // ===========================================================================

  private spawnEnemies(): void {
    for (let i = 0; i < this.totalEnemies; i++) {
      const pos = this.findGrassPosition(150, 120);
      if (!pos) continue;

      const isBoss = i === this.totalEnemies - 1;
      this.createEnemy(pos.x, pos.y, isBoss);
    }
  }

  private createEnemy(x: number, y: number, isBoss: boolean): void {
    const enemyType = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
    const hp = isBoss ? enemyType.hp * 3 : enemyType.hp;
    const speed = isBoss ? enemyType.speed * 0.8 : enemyType.speed;

    const textureKey = `enemy-${enemyType.key}-south`;
    const sprite = this.add.sprite(x, y, this.textures.exists(textureKey) ? textureKey : "__DEFAULT");
    sprite.setScale(isBoss ? ENEMY_SCALE * 1.3 : ENEMY_SCALE);
    sprite.setDepth(y);

    if (isBoss) {
      sprite.setTint(0xff6666);
    }

    this.physics.add.existing(sprite);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(20, 20);
    body.setOffset(6, 10);

    // Collide with obstacles
    for (const obs of this.obstacles) {
      this.physics.add.collider(sprite, obs);
    }

    // Create health bar
    const healthBar = this.add.graphics();
    healthBar.setDepth(10000);

    this.enemies.push({
      sprite,
      healthBar,
      hp,
      maxHp: hp,
      speed,
      state: "patrol",
      patrolTarget: null,
      lastAttackTime: 0,
      attackCooldown: isBoss ? 1200 : 1800,
      isBoss,
      direction: "south",
      typeKey: enemyType.key,
    });
  }

  private updateEnemies(_dt: number): void {
    const detectionRange = 150;
    const attackRange = 80;

    for (const enemy of this.enemies) {
      if (enemy.state === "dead" || !enemy.sprite.active) continue;

      const body = enemy.sprite.body as Phaser.Physics.Arcade.Body;
      const dist = Phaser.Math.Distance.Between(
        enemy.sprite.x, enemy.sprite.y,
        this.player.x, this.player.y
      );

      enemy.sprite.setDepth(enemy.sprite.y);

      // State transitions
      if (dist < attackRange) {
        enemy.state = "attack";
      } else if (dist < detectionRange) {
        enemy.state = "chase";
      } else {
        enemy.state = "patrol";
      }

      switch (enemy.state) {
        case "patrol":
          this.enemyPatrol(enemy, body);
          break;
        case "chase":
          this.enemyChase(enemy, body);
          break;
        case "attack":
          this.enemyAttack(enemy, body);
          break;
      }
    }
  }

  private enemyPatrol(enemy: Enemy, body: Phaser.Physics.Arcade.Body): void {
    if (!enemy.patrolTarget || Phaser.Math.Distance.Between(
      enemy.sprite.x, enemy.sprite.y,
      enemy.patrolTarget.x, enemy.patrolTarget.y
    ) < 20) {
      enemy.patrolTarget = {
        x: enemy.sprite.x + (Math.random() - 0.5) * 150,
        y: enemy.sprite.y + (Math.random() - 0.5) * 150,
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

      // Telegraph
      enemy.sprite.setTint(0xffff44);
      this.time.delayedCall(250, () => {
        if (!this.alive || enemy.state === "dead") return;
        enemy.sprite.clearTint();
        if (enemy.isBoss) enemy.sprite.setTint(0xff6666);

        // Fire projectile
        const dx = this.player.x - enemy.sprite.x;
        const dy = this.player.y - enemy.sprite.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;

        const bullet = this.add.circle(enemy.sprite.x, enemy.sprite.y, 5, 0xff6644, 1);
        bullet.setDepth(15);

        this.bullets.push({
          sprite: bullet,
          vx: (dx / len) * 120,
          vy: (dy / len) * 120,
          age: 0,
          fromPlayer: false,
        });
      });
    }

    // Face player
    const dx = this.player.x - enemy.sprite.x;
    const dy = this.player.y - enemy.sprite.y;
    enemy.direction = this.vectorToDirection(dx, dy);
    this.updateEnemySprite(enemy);

    // Return to chase if player moved away
    const dist = Phaser.Math.Distance.Between(
      enemy.sprite.x, enemy.sprite.y,
      this.player.x, this.player.y
    );
    if (dist > 120) {
      enemy.state = "chase";
    }
  }

  private updateEnemySprite(enemy: Enemy): void {
    const textureKey = `enemy-${enemy.typeKey}-${enemy.direction}`;
    if (this.textures.exists(textureKey)) {
      enemy.sprite.setTexture(textureKey);
    }
    const shouldFlip = enemy.direction.includes("east");
    enemy.sprite.setFlipX(shouldFlip);
  }

  private updateHealthBars(): void {
    for (const enemy of this.enemies) {
      if (enemy.state === "dead") {
        enemy.healthBar.clear();
        continue;
      }

      const barWidth = 30;
      const barHeight = 4;
      const x = enemy.sprite.x - barWidth / 2;
      const y = enemy.sprite.y - 25;
      const hpPercent = enemy.hp / enemy.maxHp;

      enemy.healthBar.clear();
      
      // Background
      enemy.healthBar.fillStyle(0x000000, 0.6);
      enemy.healthBar.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);
      
      // Health
      const healthColor = hpPercent > 0.5 ? 0x44ff44 : hpPercent > 0.25 ? 0xffaa00 : 0xff4444;
      enemy.healthBar.fillStyle(healthColor, 1);
      enemy.healthBar.fillRect(x, y, barWidth * hpPercent, barHeight);
    }
  }

  // ===========================================================================
  // NPCs & Collectibles
  // ===========================================================================

  private spawnNPCs(): void {
    for (let i = 0; i < 4; i++) {
      const pos = this.findGrassPosition(100, 100);
      if (!pos) continue;

      if (this.textures.exists("house")) {
        const house = this.add.sprite(pos.x, pos.y - 20, "house");
        house.setScale(0.5);
        house.setDepth(pos.y);
      }

      const textureKey = this.textures.exists("player-south") ? "player-south" : "__DEFAULT";
      const sprite = this.add.sprite(pos.x, pos.y + 15, textureKey);
      sprite.setScale(PLAYER_SCALE * 0.85);
      sprite.setTint(0x88ff88);
      sprite.setDepth(pos.y + 15);

      // Small "!" text indicator instead of circle
      const indicator = this.add.circle(pos.x, pos.y - 10, 0, 0xffdd44, 0);
      indicator.setDepth(11);

      this.npcs.push({ sprite, indicator, interacted: false });
    }
  }

  private spawnCollectibles(): void {
    for (let i = 0; i < 15; i++) {
      const pos = this.findGrassPosition(0, 80);
      if (!pos) continue;
      const { x, y } = pos;

      let sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;

      if (this.textures.exists("apple")) {
        // Use PixelLab apple sprite - no glow effect
        sprite = this.add.sprite(x, y, "apple");
        sprite.setScale(0.6);
        sprite.setDepth(5);

        // Simple bobbing animation
        this.tweens.add({
          targets: sprite,
          y: "-=3",
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      } else {
        // Fallback to circle
        sprite = this.add.circle(x, y, 6, 0xff4444, 1);
        sprite.setDepth(5);

        const leaf = this.add.circle(x + 3, y - 5, 3, 0x44aa44, 1);
        leaf.setDepth(6);

        this.tweens.add({
          targets: [sprite, leaf],
          y: "-=3",
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }

      this.collectibles.push({ sprite, type: "apple" });
    }
  }

  private tryInteractWithNPC(): void {
    for (const npc of this.npcs) {
      if (npc.interacted) continue;

      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        npc.sprite.x, npc.sprite.y
      );

      if (dist < 40) {
        npc.interacted = true;
        npc.indicator.setVisible(false);
        this.gameState = "question";
        eventBus.emit(GameEvents.CASTLE_QUESTION, { bossPhase: this.levelIndex + 1 });
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

      // Out of bounds
      if (b.sprite.x < 0 || b.sprite.x > worldW || b.sprite.y < 0 || b.sprite.y > worldH) {
        b.sprite.destroy();
        toRemove.push(i);
        continue;
      }

      // Player bullets hit enemies
      if (b.fromPlayer) {
        for (const enemy of this.enemies) {
          if (enemy.state === "dead") continue;
          const dist = Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, enemy.sprite.x, enemy.sprite.y);
          if (dist < 18) {
            this.damageEnemy(enemy);
            b.sprite.destroy();
            toRemove.push(i);
            break;
          }
        }
      } else {
        // Enemy bullets hit player
        if (!this.playerInvincible) {
          const dist = Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, this.player.x, this.player.y);
          if (dist < 15) {
            this.damagePlayer();
            b.sprite.destroy();
            toRemove.push(i);
          }
        }
      }

      // Age out
      if (b.age > 4) {
        b.sprite.destroy();
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.bullets.splice(toRemove[i], 1);
    }
  }

  private checkCollisions(): void {
    // Player-enemy contact damage
    if (!this.playerInvincible) {
      for (const enemy of this.enemies) {
        if (enemy.state === "dead") continue;
        const dist = Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          enemy.sprite.x, enemy.sprite.y
        );
        if (dist < 20) {
          this.damagePlayer();
          break;
        }
      }
    }

    // Player-collectible
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        c.sprite.x, c.sprite.y
      );
      if (dist < 20) {
        // Heal player
        if (this.playerHp < PLAYER_MAX_HP) {
          this.playerHp = Math.min(this.playerHp + 1, PLAYER_MAX_HP);
          this.emitPhaseUpdate();
        }

        // Pickup effect
        this.tweens.add({
          targets: c.sprite,
          scale: 1.5,
          alpha: 0,
          y: c.sprite.y - 20,
          duration: 200,
          onComplete: () => c.sprite.destroy(),
        });

        this.collectibles.splice(i, 1);
      }
    }
  }

  // ===========================================================================
  // Damage
  // ===========================================================================

  private damagePlayer(): void {
    if (this.playerInvincible || this.gameState !== "playing") return;

    this.playerHp--;
    this.playerInvincible = true;
    this.emitPhaseUpdate();

    this.player.setTintFill(0xff0000);
    this.cameras.main.shake(80, 0.003);

    this.time.delayedCall(100, () => {
      if (this.player?.active) this.player.clearTint();
    });

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
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.player.setAlpha(0.4);

    this.enemies.forEach((e) => {
      if (e.sprite?.active) {
        const eb = e.sprite.body as Phaser.Physics.Arcade.Body;
        eb?.setVelocity(0, 0);
      }
    });

    this.time.delayedCall(500, () => {
      eventBus.emit("battle:gameover", {});
    });
  }

  private damageEnemy(enemy: Enemy): void {
    enemy.hp--;

    enemy.sprite.setTintFill(0xffffff);
    this.time.delayedCall(80, () => {
      if (enemy.sprite?.active) {
        enemy.sprite.clearTint();
        if (enemy.isBoss) enemy.sprite.setTint(0xff6666);
      }
    });

    if (enemy.hp <= 0) {
      enemy.state = "dead";
      enemy.sprite.setVisible(false);
      enemy.sprite.setActive(false);
      enemy.healthBar.clear();

      // Death particles
      for (let i = 0; i < 10; i++) {
        const p = this.add.circle(enemy.sprite.x, enemy.sprite.y, 4, 0xffaa44, 0.8);
        p.setDepth(15);
        this.tweens.add({
          targets: p,
          x: enemy.sprite.x + (Math.random() - 0.5) * 60,
          y: enemy.sprite.y + (Math.random() - 0.5) * 60,
          alpha: 0,
          duration: 400,
          onComplete: () => p.destroy(),
        });
      }

      this.enemiesDefeated++;
      this.emitPhaseUpdate();

      // Trigger question
      this.gameState = "question";
      eventBus.emit(GameEvents.CASTLE_QUESTION, { bossPhase: this.levelIndex + 1 });
    }
  }

  // ===========================================================================
  // Questions & Victory
  // ===========================================================================

  private onAnswerResult(correct: boolean): void {
    if (!this.alive) return;

    if (correct) {
      // Check for victory
      if (this.enemiesDefeated >= this.totalEnemies) {
        this.triggerVictory();
      } else {
        this.gameState = "playing";
      }
    } else {
      // Wrong answer - continue playing
      this.gameState = "playing";
    }
  }

  private triggerVictory(): void {
    this.gameState = "victory";

    for (let i = 0; i < 40; i++) {
      const colors = [0xffdd44, 0xff8844, 0x44aaff, 0x44ff88, 0xff44ff];
      const p = this.add.circle(
        this.player.x,
        this.player.y,
        4,
        colors[Math.floor(Math.random() * colors.length)],
        0.9
      );
      p.setDepth(25);
      this.tweens.add({
        targets: p,
        x: this.player.x + (Math.random() - 0.5) * 200,
        y: this.player.y - Math.random() * 150,
        alpha: 0,
        duration: 1000 + Math.random() * 500,
        onComplete: () => p.destroy(),
      });
    }

    this.time.delayedCall(2500, () => {
      eventBus.emit(GameEvents.CASTLE_VICTORY, { castleId: `dungeon-${this.levelIndex}` });
    });
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

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
    const bossEnemy = this.enemies.find((e) => e.isBoss);
    const payload: CastlePhasePayload = {
      bossPhase: this.levelIndex + 1,
      bossHp: bossEnemy?.hp ?? 0,
      maxBossHp: bossEnemy?.maxHp ?? 10,
      playerHp: this.playerHp,
      maxPlayerHp: PLAYER_MAX_HP,
      gameState: this.gameState as CastlePhasePayload["gameState"],
    };
    eventBus.emit(GameEvents.CASTLE_PHASE_UPDATE, payload);
    eventBus.emit("battle:lives", { lives: this.playerHp });
  }
}

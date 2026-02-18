import Phaser from "phaser";
import {
  eventBus,
  GameEvents,
  type CastlePhasePayload,
  type CastleAnswerPayload,
} from "../EventBus";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";

// =============================================================================
// Game-feel inspired by Cuphead / Hollow Knight / Mega Man
// =============================================================================

type GameState = "spawning" | "fighting" | "question" | "victory";

// Ground visual starts here (top of grass). Characters embed 16px into the
// ground so they look grounded — same approach as the normal BattleScene where
// PlayerSprite uses center-origin at GROUND_Y.
const GROUND_SURFACE_Y = GAME_HEIGHT - 80;
const GROUND_EMBED = 16;
const GROUND_Y = GROUND_SURFACE_Y + GROUND_EMBED;

const PLAYER_START_X = 150;
const BOSS_START_X = GAME_WIDTH - 160;

const WIZARD_SPEED = 180;
const WIZARD_JUMP_VEL = -520;
const WIZARD_SCALE = 3;
const DASH_SPEED = 500;
const DASH_DURATION = 180;
const DASH_COOLDOWN = 600;

const BULLET_SPEED = 500;
const MAX_BULLETS = 6;
const SHOOT_COOLDOWN = 350;

const PLAYER_MAX_LIVES = 5;
const BOSS_SCALE = 2.4;

const BLOCK_MAX_MS = 2000;
const BLOCK_COOLDOWN_MS = 3000;

const PLATFORM_H = 14;

interface BossConfig {
  name: string;
  hp: number;
  revivedBonusHp: number;
  speed: number;
  dodgeChance: number;
  attackCooldown: number;
  spriteFolder: string;
  attackAnim: string;
  attackFrames: number;
  attackPatterns: AttackPattern[];
}

type AttackPattern = "projectile" | "triple_shot" | "melee_rush" | "ground_pound" | "teleport_strike";

const BOSS_WALK_FRAMES = 6;
const BOSS_IDLE_FRAMES = 4;

const BOSS_CONFIGS: Record<number, BossConfig> = {
  1: {
    name: "Skeleton Knight",
    hp: 6,
    revivedBonusHp: 2,
    speed: 55,
    dodgeChance: 0.2,
    attackCooldown: 2200,
    spriteFolder: "skeleton-knight",
    attackAnim: "cross-punch",
    attackFrames: 6,
    attackPatterns: ["projectile", "melee_rush"],
  },
  2: {
    name: "Shadow Witch",
    hp: 9,
    revivedBonusHp: 3,
    speed: 70,
    dodgeChance: 0.4,
    attackCooldown: 1800,
    spriteFolder: "shadow-witch",
    attackAnim: "fireball",
    attackFrames: 6,
    attackPatterns: ["triple_shot", "teleport_strike", "projectile"],
  },
  3: {
    name: "Stone Golem",
    hp: 14,
    revivedBonusHp: 4,
    speed: 40,
    dodgeChance: 0.15,
    attackCooldown: 2600,
    spriteFolder: "stone-golem",
    attackAnim: "high-kick",
    attackFrames: 7,
    attackPatterns: ["ground_pound", "melee_rush", "projectile"],
  },
};

// Platforms: positions are for the VISUAL top of the platform.
// Characters stand at platformVisualY + a small embed (feet sink in a few px).
const PLAT_STAND_OFFSET = 4;
const PLATFORM_LAYOUT = [
  { x: 200, y: GROUND_SURFACE_Y - 80, w: 140 },
  { x: GAME_WIDTH - 200, y: GROUND_SURFACE_Y - 80, w: 140 },
  { x: GAME_WIDTH / 2, y: GROUND_SURFACE_Y - 155, w: 130 },
];

// =============================================================================
// Scene
// =============================================================================

export class CastleBossScene extends Phaser.Scene {
  private gameState: GameState = "spawning";
  private bossPhase = 1;
  private bossRevived = false;

  // Wizard
  private wizard!: Phaser.GameObjects.Sprite;
  private wizardFacing: "left" | "right" = "right";
  private wizardVelX = 0;
  private wizardVelY = 0;
  private wizardOnGround = true;
  private lastShootTime = 0;
  private lives = PLAYER_MAX_LIVES;
  private wizardInvincible = false;

  // Block
  private wizardBlocking = false;
  private blockStamina = BLOCK_MAX_MS;
  private blockOnCooldown = false;
  private blockCooldownRemaining = 0;

  // Dash
  private isDashing = false;
  private dashTimer = 0;
  private dashDir = 0;
  private lastDashTime = 0;

  // Boss
  private boss!: Phaser.GameObjects.Sprite;
  private bossHp = 6;
  private maxBossHp = 6;
  private bossConfig!: BossConfig;
  private bossLastAttackTime = 0;
  private bossVelY = 0;
  private bossOnGround = true;
  private bossDead = false;
  private bossAttacking = false;
  private bossEnraged = false;
  private bossPatternIdx = 0;
  private _currentBossAnim = "";

  // Player bullets
  private bullets: Phaser.GameObjects.Arc[] = [];

  // Boss projectiles — real physics objects with per-frame AABB collision
  private bossProjectiles: Phaser.GameObjects.Arc[] = [];

  // Controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private blockKey!: Phaser.Input.Keyboard.Key;
  private dashKey!: Phaser.Input.Keyboard.Key;

  // Platforms: standY = visual Y + PLAT_STAND_OFFSET (where feet go)
  private platformRects: { x: number; standY: number; w: number; visualY: number }[] = [];

  // Hitstop
  private hitstopFrames = 0;

  // Cleanup
  private unsubs: Array<() => void> = [];
  private destroyed = false;

  constructor() {
    super({ key: "CastleBossScene" });
  }

  private get alive(): boolean {
    return !this.destroyed && !!this.scene;
  }

  init(): void {
    this.bossPhase = 1;
    this.bossRevived = false;
    this.gameState = "spawning";
    this.lives = PLAYER_MAX_LIVES;
    this.destroyed = false;
    this.bullets = [];
    this.bossProjectiles = [];
    this.platformRects = [];
    this.wizardFacing = "right";
    this.blockStamina = BLOCK_MAX_MS;
    this.blockOnCooldown = false;
    this.blockCooldownRemaining = 0;
    this.isDashing = false;
    this.hitstopFrames = 0;
    this.bossPatternIdx = 0;
    this._currentBossAnim = "";
  }

  preload(): void {
    for (let i = 1; i <= 5; i++) {
      const key = `castle-bg-${i}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, `/game-assets/castle/backgrounds/castle-bg-${i}.png`);
      }
    }

    for (const [phase, cfg] of Object.entries(BOSS_CONFIGS)) {
      const base = `/game-assets/castle/bosses/${cfg.spriteFolder}`;

      // Static rotation image (west — flip for east)
      const rotKey = `boss${phase}-static`;
      if (!this.textures.exists(rotKey)) {
        this.load.image(rotKey, `${base}/rotations/west.png`);
      }

      // Idle frames (breathing-idle/west)
      for (let f = 0; f < BOSS_IDLE_FRAMES; f++) {
        const k = `boss${phase}-idle-${f}`;
        if (!this.textures.exists(k)) {
          this.load.image(k, `${base}/animations/breathing-idle/west/frame_${String(f).padStart(3, "0")}.png`);
        }
      }

      // Walk frames (walking/west)
      for (let f = 0; f < BOSS_WALK_FRAMES; f++) {
        const k = `boss${phase}-walk-${f}`;
        if (!this.textures.exists(k)) {
          this.load.image(k, `${base}/animations/walking/west/frame_${String(f).padStart(3, "0")}.png`);
        }
      }

      // Attack frames (attack anim varies per boss, always west direction)
      for (let f = 0; f < cfg.attackFrames; f++) {
        const k = `boss${phase}-attack-${f}`;
        if (!this.textures.exists(k)) {
          this.load.image(k, `${base}/animations/${cfg.attackAnim}/west/frame_${String(f).padStart(3, "0")}.png`);
        }
      }
    }
  }

  create(): void {
    this.createCastleBackground();
    this.drawCastleGround();
    this.setupPlatforms();
    this.setupWizard();
    this.createBossAnimations();

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
      this.blockKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
      this.dashKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    }

    const unsub = eventBus.on(GameEvents.CASTLE_ANSWER, (detail) => {
      if (!this.alive) return;
      this.onAnswerResult((detail as CastleAnswerPayload).correct);
    });
    this.unsubs.push(unsub);

    this.emitPhaseUpdate();
    this.time.delayedCall(800, () => {
      if (this.alive) this.spawnBoss(this.bossPhase);
    });
  }

  private createBossAnimations(): void {
    for (const [phase, cfg] of Object.entries(BOSS_CONFIGS)) {
      const idleKey = `boss${phase}-idle`;
      if (!this.anims.exists(idleKey) && this.textures.exists(`boss${phase}-idle-0`)) {
        this.anims.create({
          key: idleKey,
          frames: Array.from({ length: BOSS_IDLE_FRAMES }, (_, i) => ({ key: `boss${phase}-idle-${i}` })),
          frameRate: 6,
          repeat: -1,
        });
      }

      const walkKey = `boss${phase}-walk`;
      if (!this.anims.exists(walkKey) && this.textures.exists(`boss${phase}-walk-0`)) {
        this.anims.create({
          key: walkKey,
          frames: Array.from({ length: BOSS_WALK_FRAMES }, (_, i) => ({ key: `boss${phase}-walk-${i}` })),
          frameRate: 10,
          repeat: -1,
        });
      }

      const atkKey = `boss${phase}-attack`;
      if (!this.anims.exists(atkKey) && this.textures.exists(`boss${phase}-attack-0`)) {
        this.anims.create({
          key: atkKey,
          frames: Array.from({ length: cfg.attackFrames }, (_, i) => ({ key: `boss${phase}-attack-${i}` })),
          frameRate: 10,
          repeat: 0,
        });
      }
    }
  }

  update(_time: number, delta: number): void {
    if (!this.alive) return;
    if (this.hitstopFrames > 0) { this.hitstopFrames--; return; }

    const dt = delta / 1000;

    if (this.gameState === "fighting" || this.gameState === "spawning") {
      this.updateBlockCooldown(dt);
      this.updateWizardMovement(dt);
    }
    if (this.gameState === "fighting") {
      this.handleShooting();
      this.handleBlocking(dt);
      this.handleDash();
      this.updateBossAI(dt);
      this.updateBullets(dt);
      this.updateBossProjectiles(dt);
    }
  }

  shutdown(): void {
    this.destroyed = true;
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.clearBossProjectiles();
  }

  private clearBossProjectiles(): void {
    for (const p of this.bossProjectiles) {
      const proj = p as Phaser.GameObjects.Arc & { _glow?: Phaser.GameObjects.Arc };
      proj._glow?.destroy();
      proj.destroy();
    }
    this.bossProjectiles = [];
  }

  // ===========================================================================
  // Background + Ground + Platforms
  // ===========================================================================

  private createCastleBackground(): void {
    const bgKey = `castle-bg-${Phaser.Math.Between(1, 5)}`;
    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey);
      const src = this.textures.get(bgKey).getSourceImage();
      bg.setScale(Math.max(GAME_WIDTH / src.width, GAME_HEIGHT / src.height));
      bg.setDepth(0);
    } else {
      const gfx = this.add.graphics().setDepth(0);
      for (let y = 0; y < GAME_HEIGHT; y++) {
        const t = y / GAME_HEIGHT;
        gfx.fillStyle(Phaser.Display.Color.GetColor(
          Phaser.Math.Linear(10, 25, t),
          Phaser.Math.Linear(14, 20, t),
          Phaser.Math.Linear(39, 40, t)), 1);
        gfx.fillRect(0, y, GAME_WIDTH, 1);
      }
    }
  }

  private drawCastleGround(): void {
    const gfx = this.add.graphics().setDepth(5);
    const PX = 4;
    const cols = Math.ceil(GAME_WIDTH / PX);
    const totalH = GAME_HEIGHT - GROUND_SURFACE_Y;
    const grass = { r: 30, g: 80, b: 30 };
    const earth = { r: 50, g: 36, b: 26 };
    const brick = { r: 55, g: 45, b: 40 };
    const hash = (x: number, y: number) => {
      const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return n - Math.floor(n);
    };
    const grassH: number[] = [];
    for (let c = 0; c < cols; c++) { const h = hash(c, 999); grassH[c] = h < 0.3 ? 3 : h < 0.7 ? 2 : 1; }

    const rows = Math.ceil(totalH / PX);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const py = row * PX, r = hash(col, row), gH = grassH[col] * PX;
        let cr: number, cg: number, cb: number;
        if (py < gH) {
          const v = (r - 0.5) * 40;
          cr = grass.r * 0.9 + v * 0.2; cg = grass.g + v; cb = grass.b * 0.7 + v * 0.15;
          if (r > 0.8) cg = Math.min(255, cg + 25);
        } else if (py < gH + 4) {
          cr = grass.r * 0.4 + earth.r * 0.6 - 15; cg = grass.g * 0.4 + earth.g * 0.6 - 10; cb = grass.b * 0.4 + earth.b * 0.6 - 5;
        } else if (py < 40) {
          const v = (r - 0.5) * 22, d = (py - gH - 4) / (40 - gH - 4);
          cr = earth.r + v - d * 12; cg = earth.g + v * 0.8 - d * 8; cb = earth.b + v * 0.5 - d * 5;
        } else {
          const bW = 7, bH = 3, sRow = Math.floor((py - 40) / (PX * bH));
          const off = sRow % 2 === 0 ? 0 : Math.floor(bW / 2);
          const lC = (col + off) % bW, lR = Math.floor((py - 40) / PX) % bH;
          const bv = (hash(Math.floor((col + off) / bW), sRow) - 0.5) * 18;
          cr = brick.r + bv; cg = brick.g + bv; cb = brick.b + bv;
          if (lC === 0 || lR === 0) { cr -= 25; cg -= 22; cb -= 18; }
          const dk = 1 - ((py - 40) / (totalH - 40)) * 0.35;
          cr *= dk; cg *= dk; cb *= dk;
        }
        gfx.fillStyle(Phaser.Display.Color.GetColor(
          Math.round(Phaser.Math.Clamp(cr, 0, 255)),
          Math.round(Phaser.Math.Clamp(cg, 0, 255)),
          Math.round(Phaser.Math.Clamp(cb, 0, 255))), 1);
        gfx.fillRect(col * PX, GROUND_SURFACE_Y + py, PX, PX);
      }
    }
    for (let col = 0; col < cols; col += 2) {
      const r = hash(col, 1234);
      if (r > 0.4) continue;
      const bH = PX * (1 + Math.floor(r * 3)), bX = col * PX + (r > 0.2 ? 2 : 0), v = (r - 0.2) * 30;
      gfx.fillStyle(Phaser.Display.Color.GetColor(
        Math.round(Phaser.Math.Clamp(grass.r * 0.8 + v, 0, 255)),
        Math.round(Phaser.Math.Clamp(grass.g + v + 10, 0, 255)),
        Math.round(Phaser.Math.Clamp(grass.b * 0.6 + v, 0, 255))), 0.9);
      gfx.fillRect(bX, GROUND_SURFACE_Y - bH, 2, bH);
    }
  }

  // Tile-style platforms with grass top, stone body, and brick pattern
  private setupPlatforms(): void {
    const gfx = this.add.graphics().setDepth(5);
    const PX = 4;
    const hash = (x: number, y: number) => {
      const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return n - Math.floor(n);
    };

    for (const p of PLATFORM_LAYOUT) {
      const left = p.x - p.w / 2;
      const cols = Math.ceil(p.w / PX);
      const rows = Math.ceil(PLATFORM_H / PX);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const px = left + col * PX;
          const py = p.y + row * PX;
          const r = hash(col + p.x, row + p.y);

          let cr: number, cg: number, cb: number;

          if (row === 0) {
            // Grass top row
            const v = (r - 0.5) * 30;
            cr = 30 + v * 0.2; cg = 85 + v; cb = 25 + v * 0.1;
            if (r > 0.7) cg = Math.min(255, cg + 20);
          } else if (row === 1) {
            // Grass-to-stone transition
            cr = 35; cg = 50; cb = 28;
          } else {
            // Stone brick body
            const bW = 5, bH = 2;
            const sRow = Math.floor(row / bH);
            const off = sRow % 2 === 0 ? 0 : Math.floor(bW / 2);
            const lC = (col + off) % bW;
            const lR = row % bH;
            const isMortar = lC === 0 || lR === 0;
            const bv = (hash(Math.floor((col + off) / bW), sRow + p.y) - 0.5) * 16;
            cr = 58 + bv; cg = 50 + bv; cb = 44 + bv;
            if (isMortar) { cr -= 20; cg -= 18; cb -= 15; }
          }

          gfx.fillStyle(Phaser.Display.Color.GetColor(
            Math.round(Phaser.Math.Clamp(cr, 0, 255)),
            Math.round(Phaser.Math.Clamp(cg, 0, 255)),
            Math.round(Phaser.Math.Clamp(cb, 0, 255))), 1);
          gfx.fillRect(px, py, PX, PX);
        }
      }

      // Grass blade decorations on top
      for (let col = 0; col < cols; col += 2) {
        const r = hash(col + p.x, 5678);
        if (r > 0.5) continue;
        const bladeH = PX * (1 + Math.floor(r * 2));
        const bX = left + col * PX + (r > 0.3 ? 2 : 0);
        gfx.fillStyle(0x1a6020, 0.8);
        gfx.fillRect(bX, p.y - bladeH, 2, bladeH);
      }

      // Bottom edge shadow
      gfx.fillStyle(0x000000, 0.2);
      gfx.fillRect(left, p.y + PLATFORM_H, p.w, 2);

      // Store stand-on Y (feet position when on this platform)
      this.platformRects.push({
        x: left,
        visualY: p.y,
        standY: p.y + PLAT_STAND_OFFSET,
        w: p.w,
      });
    }
  }

  // ===========================================================================
  // Wizard
  // ===========================================================================

  private setupWizard(): void {
    const key = this.textures.exists("player-idle") ? "player-idle" : "player-walk";
    this.wizard = this.add.sprite(PLAYER_START_X, GROUND_Y, key);
    this.wizard.setScale(WIZARD_SCALE).setOrigin(0.5, 1).setDepth(10);
  }

  private updateWizardMovement(dt: number): void {
    if (!this.cursors || !this.wizard) return;
    if (this.isDashing) return this.updateDash(dt);

    const gravity = 1000;
    const halfW = 20;
    const ml = this.cursors.left.isDown;
    const mr = this.cursors.right.isDown;

    if (ml) { this.wizardVelX = -WIZARD_SPEED; this.wizardFacing = "left"; }
    else if (mr) { this.wizardVelX = WIZARD_SPEED; this.wizardFacing = "right"; }
    else { this.wizardVelX = 0; }

    this.wizard.setFlipX(this.wizardFacing === "left");

    if (this.cursors.up.isDown && this.wizardOnGround) {
      this.wizardVelY = WIZARD_JUMP_VEL;
      this.wizardOnGround = false;
    }

    if (!this.wizardOnGround) this.playWizardAnim("player-jump");
    else if (ml || mr) this.playWizardAnim("player-run");
    else this.playWizardAnim("idle");

    if (!this.wizardOnGround) this.wizardVelY += gravity * dt;

    let nx = this.wizard.x + this.wizardVelX * dt;
    let ny = this.wizard.y + this.wizardVelY * dt;
    nx = Phaser.Math.Clamp(nx, 30, GAME_WIDTH - 30);

    const wasAirborne = !this.wizardOnGround;

    // Ground collision
    if (ny >= GROUND_Y) { ny = GROUND_Y; this.wizardVelY = 0; this.wizardOnGround = true; }

    // Platform collision: only when falling downward
    if (this.wizardVelY > 0 && !this.wizardOnGround) {
      for (const p of this.platformRects) {
        const prevFeetY = this.wizard.y;
        if (nx + halfW > p.x && nx - halfW < p.x + p.w &&
            prevFeetY <= p.standY && ny >= p.standY) {
          ny = p.standY;
          this.wizardVelY = 0;
          this.wizardOnGround = true;
          break;
        }
      }
    }

    // Walk off platform edge
    if (this.wizardOnGround && ny < GROUND_Y) {
      let onAny = false;
      for (const p of this.platformRects) {
        if (nx + halfW > p.x && nx - halfW < p.x + p.w && Math.abs(ny - p.standY) < 6) {
          onAny = true; break;
        }
      }
      if (!onAny) this.wizardOnGround = false;
    }

    if (wasAirborne && this.wizardOnGround) this.spawnDust(nx, ny);

    this.wizard.x = nx;
    this.wizard.y = ny;

    if (this.wizardInvincible) {
      this.wizard.setAlpha(Math.sin(this.time.now * 0.015) > 0 ? 1 : 0.3);
    } else {
      this.wizard.setAlpha(1);
    }
  }

  private spawnDust(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const d = this.add.circle(x + (Math.random() - 0.5) * 20, y, 2, 0xaaaaaa, 0.6).setDepth(9);
      this.tweens.add({
        targets: d, y: y - 8 - Math.random() * 10, x: d.x + (Math.random() - 0.5) * 15,
        alpha: 0, scale: 0.3, duration: 250 + Math.random() * 100, onComplete: () => d.destroy(),
      });
    }
  }

  private _currentWizardAnim = "";
  private playWizardAnim(key: string): void {
    if (this._currentWizardAnim === key) return;
    this._currentWizardAnim = key;
    if (key === "idle") {
      this.wizard.stop();
      this.wizard.setTexture(this.textures.exists("player-idle") ? "player-idle" : "player-walk");
    } else if (this.anims.exists(key)) {
      this.wizard.play(key, true);
    }
  }

  // ===========================================================================
  // Dash (C key)
  // ===========================================================================

  private handleDash(): void {
    if (!this.dashKey || this.isDashing || this.wizardBlocking) return;
    if (!Phaser.Input.Keyboard.JustDown(this.dashKey)) return;
    if (this.time.now - this.lastDashTime < DASH_COOLDOWN) return;

    this.isDashing = true;
    this.dashTimer = DASH_DURATION;
    this.lastDashTime = this.time.now;
    this.wizardInvincible = true;
    this.dashDir = this.wizardFacing === "right" ? 1 : -1;

    if (this.anims.exists("player-slide")) {
      this.wizard.play("player-slide");
      this._currentWizardAnim = "player-slide";
    }
    this.wizard.setAlpha(0.6);

    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 50, () => {
        if (!this.alive || !this.wizard?.active) return;
        const ghost = this.add.sprite(this.wizard.x, this.wizard.y, this.wizard.texture.key);
        ghost.setScale(WIZARD_SCALE).setOrigin(0.5, 1).setDepth(9).setAlpha(0.3).setTint(0x4488ff);
        ghost.setFlipX(this.wizard.flipX);
        this.tweens.add({ targets: ghost, alpha: 0, duration: 200, onComplete: () => ghost.destroy() });
      });
    }
  }

  private updateDash(dt: number): void {
    this.dashTimer -= dt * 1000;
    this.wizard.x += this.dashDir * DASH_SPEED * dt;
    this.wizard.x = Phaser.Math.Clamp(this.wizard.x, 30, GAME_WIDTH - 30);

    if (this.dashTimer <= 0) {
      this.isDashing = false;
      this.wizard.setAlpha(1);
      this._currentWizardAnim = "";
      this.time.delayedCall(100, () => { if (!this.isDashing) this.wizardInvincible = false; });
    }
  }

  // ===========================================================================
  // X = Attack
  // ===========================================================================

  private handleShooting(): void {
    if (!this.attackKey || !Phaser.Input.Keyboard.JustDown(this.attackKey)) return;
    if (this.wizardBlocking || this.isDashing) return;
    if (this.time.now - this.lastShootTime < SHOOT_COOLDOWN) return;
    if (this.bullets.length >= MAX_BULLETS) return;

    this.lastShootTime = this.time.now;

    if (this.anims.exists("player-fireball")) {
      this.wizard.play("player-fireball");
      this._currentWizardAnim = "player-fireball";
      this.wizard.once("animationcomplete", () => { this._currentWizardAnim = ""; });
    }

    const dir = this.wizardFacing === "right" ? 1 : -1;
    const bx = this.wizard.x + dir * 30;
    const by = this.wizard.y - 45;

    const flash = this.add.circle(bx + dir * 5, by, 12, 0x88ddff, 0.7).setDepth(21);
    this.tweens.add({ targets: flash, scale: 2, alpha: 0, duration: 100, onComplete: () => flash.destroy() });

    const orb = this.add.circle(bx, by, 7, 0x44aaff, 1).setDepth(20);
    const glow = this.add.circle(bx, by, 14, 0x44aaff, 0.3).setDepth(19);

    const bullet = orb as Phaser.GameObjects.Arc & { _dir: number; _glow: Phaser.GameObjects.Arc; _age: number };
    bullet._dir = dir; bullet._glow = glow; bullet._age = 0;
    this.bullets.push(bullet);

    if (this.boss?.active && !this.bossDead) {
      const sameLine = Math.abs(this.boss.y - this.wizard.y) < 60;
      const inFront = dir > 0 ? this.boss.x > this.wizard.x : this.boss.x < this.wizard.x;
      if (sameLine && inFront && Math.random() < this.bossConfig.dodgeChance) this.bossJump();
    }
  }

  // ===========================================================================
  // Z = Block (stamina-based)
  // ===========================================================================

  private updateBlockCooldown(dt: number): void {
    if (this.blockOnCooldown) {
      this.blockCooldownRemaining -= dt * 1000;
      if (this.blockCooldownRemaining <= 0) {
        this.blockOnCooldown = false;
        this.blockStamina = BLOCK_MAX_MS;
        this.blockCooldownRemaining = 0;
      }
    }
    this.emitBlockState();
  }

  private handleBlocking(dt: number): void {
    if (!this.blockKey || this.isDashing) return;
    const wantsBlock = this.blockKey.isDown && !this.blockOnCooldown && this.blockStamina > 0;
    const wasBlocking = this.wizardBlocking;
    this.wizardBlocking = wantsBlock;

    if (this.wizardBlocking) {
      this.blockStamina -= dt * 1000;
      if (this.blockStamina <= 0) {
        this.blockStamina = 0;
        this.wizardBlocking = false;
        this.blockOnCooldown = true;
        this.blockCooldownRemaining = BLOCK_COOLDOWN_MS;
      }
    }

    if (this.wizardBlocking && !wasBlocking) {
      if (this.anims.exists("player-slide")) {
        this.wizard.play("player-slide");
        this._currentWizardAnim = "player-slide";
      }
      this.wizard.setTint(0x6688ff);
    } else if (!this.wizardBlocking && wasBlocking) {
      this.wizard.clearTint();
      this._currentWizardAnim = "";
      if (this.blockStamina <= 0 && !this.blockOnCooldown) {
        this.blockOnCooldown = true;
        this.blockCooldownRemaining = BLOCK_COOLDOWN_MS;
      }
    }
  }

  private emitBlockState(): void {
    eventBus.emit("castle:block_state", {
      stamina: this.blockStamina,
      maxStamina: BLOCK_MAX_MS,
      onCooldown: this.blockOnCooldown,
      cooldownRemaining: this.blockCooldownRemaining,
      maxCooldown: BLOCK_COOLDOWN_MS,
    });
  }

  // ===========================================================================
  // Bullets + AABB hitbox
  // ===========================================================================

  private bulletHitsBoss(bx: number, by: number): boolean {
    if (!this.boss?.active || this.bossDead) return false;
    const w = this.boss.displayWidth, h = this.boss.displayHeight;
    return bx >= this.boss.x - w / 2 && bx <= this.boss.x + w / 2 &&
           by >= this.boss.y - h && by <= this.boss.y;
  }

  private updateBullets(dt: number): void {
    const toRemove: number[] = [];
    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i] as Phaser.GameObjects.Arc & { _dir: number; _glow: Phaser.GameObjects.Arc; _age: number };
      b.x += BULLET_SPEED * b._dir * dt;
      b._glow.x = b.x; b._glow.y = b.y; b._age += dt;

      if (Math.random() < 0.25) {
        const t = this.add.circle(b.x - b._dir * 6, b.y, 2, 0x44aaff, 0.4).setDepth(18);
        this.tweens.add({ targets: t, alpha: 0, scale: 0, duration: 150, onComplete: () => t.destroy() });
      }

      if (this.bulletHitsBoss(b.x, b.y)) {
        this.spawnImpact(b.x, b.y);
        b._glow.destroy(); b.destroy(); toRemove.push(i);
        this.onBossHit(); continue;
      }

      if (b.x < -20 || b.x > GAME_WIDTH + 20 || b._age > 2) {
        b._glow.destroy(); b.destroy(); toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) this.bullets.splice(toRemove[i], 1);
  }

  private spawnImpact(x: number, y: number): void {
    const ring = this.add.circle(x, y, 6, 0x88ccff, 0.8).setDepth(21);
    this.tweens.add({ targets: ring, scaleX: 3, scaleY: 3, alpha: 0, duration: 200, onComplete: () => ring.destroy() });
    for (let i = 0; i < 4; i++) {
      const p = this.add.circle(x, y, 2, 0x44aaff, 0.7).setDepth(21);
      this.tweens.add({
        targets: p, x: x + (Math.random() - 0.5) * 35, y: y + (Math.random() - 0.5) * 35,
        alpha: 0, scale: 0, duration: 250, onComplete: () => p.destroy(),
      });
    }
  }

  // ===========================================================================
  // Boss — spawn, sprite, walking animation
  // ===========================================================================

  private spawnBoss(phase: number): void {
    this.gameState = "spawning";
    this.bossConfig = BOSS_CONFIGS[phase];
    this.maxBossHp = this.bossConfig.hp;
    this.bossHp = this.bossConfig.hp;
    this.bossDead = false;
    this.bossRevived = false;
    this.bossAttacking = false;
    this.bossEnraged = false;
    this.bossPatternIdx = 0;
    this.emitPhaseUpdate();

    this.playTornadoEffect(BOSS_START_X, GROUND_Y - 50, () => {
      if (!this.alive) return;
      this.createBossSprite();
      this.gameState = "fighting";
      this.emitPhaseUpdate();
    });
  }

  private playTornadoEffect(x: number, y: number, cb: () => void): void {
    const ps: Phaser.GameObjects.Arc[] = [];
    const colors = [0x442266, 0x663399, 0x8844bb, 0xaa66dd];
    for (let i = 0; i < 20; i++) {
      ps.push(this.add.circle(x, y, 3 + Math.random() * 5, colors[i % 4], 0.7).setDepth(15));
    }
    let el = 0;
    this.time.addEvent({ delay: 16, repeat: 80, callback: () => {
      el += 16; const t = el / 1300;
      ps.forEach((p, i) => {
        const a = t * 8 + i * (Math.PI * 2 / 20), r = 15 + t * 25;
        p.x = x + Math.cos(a) * r; p.y = y - t * 60 + Math.sin(a) * r * 0.4;
        p.setScale(0.3 + t * 1.2).setAlpha(Math.max(0, 1 - t * 0.5));
      });
    }});
    this.time.delayedCall(1300, () => { ps.forEach(p => p.destroy()); this.cameras.main.shake(200, 0.01); cb(); });
  }

  private createBossSprite(): void {
    if (this.boss) { this.tweens.killTweensOf(this.boss); this.boss.destroy(); }

    const staticKey = `boss${this.bossPhase}-static`;
    const idleKey = `boss${this.bossPhase}-idle`;
    const textureKey = this.textures.exists(`boss${this.bossPhase}-idle-0`) ? `boss${this.bossPhase}-idle-0` : staticKey;

    this.boss = this.add.sprite(BOSS_START_X, GROUND_Y, textureKey);
    this.boss.setScale(BOSS_SCALE).setOrigin(0.5, 1).setDepth(10);

    // Spawn scale-in, then start idle animation
    this.boss.setScale(0);
    this.tweens.add({
      targets: this.boss,
      scaleX: BOSS_SCALE, scaleY: BOSS_SCALE,
      duration: 400, ease: "Back.easeOut",
      onComplete: () => this.playBossAnim(idleKey),
    });

    this.bossOnGround = true;
    this.bossVelY = 0;
    this._currentBossAnim = "";
    this.bossLastAttackTime = this.time.now + 1200;
  }

  private playBossAnim(key: string): void {
    if (!this.boss?.active || this._currentBossAnim === key) return;
    if (this.anims.exists(key)) {
      this.boss.play(key, true);
      this._currentBossAnim = key;
    }
  }

  // West-facing frames: flipX=false is left (west), flipX=true is right (east)
  private updateBossFacing(right: boolean): void {
    if (!this.boss?.active) return;
    this.boss.setFlipX(right);
  }

  // ===========================================================================
  // Boss AI — pattern-based attacks with walking animation
  // ===========================================================================

  private updateBossAI(dt: number): void {
    if (!this.boss?.active || this.bossDead || this.bossAttacking) return;

    const dx = this.wizard.x - this.boss.x;
    const dist = Math.abs(dx);
    this.updateBossFacing(dx > 0);

    const now = this.time.now;
    const cd = this.bossEnraged ? this.bossConfig.attackCooldown * 0.65 : this.bossConfig.attackCooldown;
    if (now - this.bossLastAttackTime > cd) {
      this.bossLastAttackTime = now;
      this.executeBossPattern();
      return;
    }

    const idealDist = this.bossConfig.attackPatterns.includes("melee_rush") ? 80 : 200;
    if (dist > idealDist) {
      const spd = this.bossEnraged ? this.bossConfig.speed * 1.3 : this.bossConfig.speed;
      this.boss.x += (dx > 0 ? 1 : -1) * spd * dt;
      this.playBossAnim(`boss${this.bossPhase}-walk`);
    } else {
      this.playBossAnim(`boss${this.bossPhase}-idle`);
    }

    if (!this.bossOnGround) {
      this.bossVelY += 700 * dt;
      this.boss.y += this.bossVelY * dt;
      if (this.boss.y >= GROUND_Y) {
        this.boss.y = GROUND_Y; this.bossVelY = 0; this.bossOnGround = true;
        if (this.bossPhase === 3) { this.cameras.main.shake(300, 0.02); this.spawnDust(this.boss.x, GROUND_Y); }
      }
    }
    this.boss.x = Phaser.Math.Clamp(this.boss.x, 60, GAME_WIDTH - 60);
  }

  private executeBossPattern(): void {
    const patterns = this.bossConfig.attackPatterns;
    const pattern = patterns[this.bossPatternIdx % patterns.length];
    this.bossPatternIdx++;

    switch (pattern) {
      case "projectile": this.bossAttackProjectile(); break;
      case "triple_shot": this.bossAttackTripleShot(); break;
      case "melee_rush": this.bossAttackMeleeRush(); break;
      case "ground_pound": this.bossAttackGroundPound(); break;
      case "teleport_strike": this.bossAttackTeleport(); break;
    }
  }

  private bossAttackProjectile(): void {
    this.bossAttacking = true;
    this.telegraphAttack(0xff4444, () => {
      if (!this.alive || this.bossDead) { this.bossAttacking = false; return; }
      this.fireBossProjectile(this.wizard.x, this.wizard.y - 35, 0xff4444, 320);
      this.bossAttacking = false;
    });
  }

  private bossAttackTripleShot(): void {
    this.bossAttacking = true;
    this.telegraphAttack(0xff44ff, () => {
      if (!this.alive || this.bossDead) { this.bossAttacking = false; return; }
      const baseY = this.wizard.y - 35;
      this.fireBossProjectile(this.wizard.x, baseY - 40, 0xff44ff, 300);
      this.fireBossProjectile(this.wizard.x, baseY, 0xff44ff, 320);
      this.fireBossProjectile(this.wizard.x, baseY + 30, 0xff44ff, 300);
      this.bossAttacking = false;
    });
  }

  private bossAttackMeleeRush(): void {
    this.bossAttacking = true;
    this.boss.setTint(0xff2222);
    this.tweens.add({ targets: this.boss, scaleY: BOSS_SCALE * 0.85, duration: 400 });

    this.time.delayedCall(500, () => {
      if (!this.alive || this.bossDead) { this.bossAttacking = false; return; }
      this.boss.clearTint();
      this.tweens.add({ targets: this.boss, scaleY: BOSS_SCALE, duration: 100 });

      const targetX = this.wizard.x;
      const dir = targetX > this.boss.x ? 1 : -1;
      this.tweens.add({
        targets: this.boss, x: targetX + dir * 20, duration: 350, ease: "Power2",
        onComplete: () => {
          const xClose = Math.abs(this.wizard.x - this.boss.x) < 80;
          const yClose = Math.abs(this.wizard.y - this.boss.y) < 50;
          if (xClose && yClose) this.onWizardHit();
          this.cameras.main.shake(150, 0.01);
          this.bossAttacking = false;
        },
      });
    });
  }

  private bossAttackGroundPound(): void {
    this.bossAttacking = true;
    this.boss.setTint(0xffaa22);
    this.playBossAnim(`boss${this.bossPhase}-attack`);

    this.time.delayedCall(400, () => {
      if (!this.alive || this.bossDead) { this.bossAttacking = false; return; }
      this.boss.clearTint();

      this.tweens.add({
        targets: this.boss, y: GROUND_Y - 180, duration: 400, ease: "Power2",
        onComplete: () => {
          this.tweens.add({
            targets: this.boss, y: GROUND_Y, duration: 200, ease: "Power3",
            onComplete: () => {
              this.cameras.main.shake(400, 0.03);
              this.spawnShockwave(this.boss.x, GROUND_Y);
              this.playBossAnim(`boss${this.bossPhase}-idle`);
              this.bossAttacking = false;
            },
          });
        },
      });
    });
  }

  private spawnShockwave(x: number, y: number): void {
    const ring = this.add.circle(x, y - 5, 10, 0xffaa44, 0.6).setDepth(8);
    this.tweens.add({ targets: ring, scaleX: 20, scaleY: 3, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
    if (this.wizardOnGround && Math.abs(this.wizard.x - x) < 250) {
      this.time.delayedCall(100, () => this.onWizardHit());
    }
    for (let i = 0; i < 8; i++) {
      const d = this.add.circle(x + (Math.random() - 0.5) * 100, y, 3, 0x888866, 0.5).setDepth(9);
      this.tweens.add({ targets: d, y: y - 20 - Math.random() * 30, alpha: 0, duration: 400, onComplete: () => d.destroy() });
    }
  }

  private bossAttackTeleport(): void {
    this.bossAttacking = true;

    this.tweens.add({
      targets: this.boss, alpha: 0, scale: 0, duration: 250,
      onComplete: () => {
        if (!this.alive || this.bossDead) { this.bossAttacking = false; return; }
        const behindX = this.wizard.x + (this.wizardFacing === "right" ? -80 : 80);
        this.boss.x = Phaser.Math.Clamp(behindX, 60, GAME_WIDTH - 60);
        this.boss.y = GROUND_Y;
        this.updateBossFacing(this.wizard.x > this.boss.x);

        const warn = this.add.circle(this.boss.x, GROUND_Y - 40, 20, 0xff0000, 0.3).setDepth(8);
        this.tweens.add({ targets: warn, scale: 2, alpha: 0, duration: 300, onComplete: () => warn.destroy() });

        this.time.delayedCall(300, () => {
          this.tweens.add({
            targets: this.boss, alpha: 1, scaleX: BOSS_SCALE, scaleY: BOSS_SCALE,
            duration: 200, ease: "Back.easeOut",
            onComplete: () => {
              this.fireBossProjectile(this.wizard.x, this.wizard.y - 35, 0xff44ff, 380);
              this.playBossAnim(`boss${this.bossPhase}-idle`);
              this.bossAttacking = false;
            },
          });
        });
      },
    });
  }

  private telegraphAttack(color: number, onFire: () => void): void {
    this.boss.setTint(color);
    this.playBossAnim(`boss${this.bossPhase}-attack`);
    const warn = this.add.circle(this.boss.x, this.boss.y - 50, 8, color, 0.5).setDepth(15);
    this.tweens.add({
      targets: warn, scaleX: 4, scaleY: 4, alpha: 0, duration: 500,
      onComplete: () => {
        warn.destroy();
        if (this.boss?.active) this.boss.clearTint();
        onFire();
      },
    });
  }

  // Fire a boss projectile as a real object with velocity — collision checked
  // per-frame in updateBossProjectiles(), so the wizard can dodge by jumping.
  private fireBossProjectile(tx: number, ty: number, color: number, speed: number): void {
    if (!this.boss?.active) return;
    const sx = this.boss.x + (tx < this.boss.x ? -35 : 35);
    const sy = this.boss.y - 50;

    const dx = tx - sx, dy = ty - sy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const vx = (dx / len) * speed;
    const vy = (dy / len) * speed;

    const core = this.add.circle(sx, sy, 7, color, 1).setDepth(24);
    const glow = this.add.circle(sx, sy, 13, color, 0.3).setDepth(23);

    const proj = core as Phaser.GameObjects.Arc & {
      _vx: number; _vy: number; _glow: Phaser.GameObjects.Arc;
      _age: number; _color: number;
    };
    proj._vx = vx; proj._vy = vy; proj._glow = glow; proj._age = 0; proj._color = color;
    this.bossProjectiles.push(proj);
  }

  // Wizard AABB hitbox (origin 0.5, 1 → bottom-center)
  private getWizardBounds(): { left: number; right: number; top: number; bottom: number } {
    const w = this.wizard.displayWidth * 0.5;
    const h = this.wizard.displayHeight * 0.7;
    return {
      left: this.wizard.x - w / 2,
      right: this.wizard.x + w / 2,
      top: this.wizard.y - h,
      bottom: this.wizard.y,
    };
  }

  private updateBossProjectiles(dt: number): void {
    const toRemove: number[] = [];
    const wb = this.getWizardBounds();

    for (let i = 0; i < this.bossProjectiles.length; i++) {
      const p = this.bossProjectiles[i] as Phaser.GameObjects.Arc & {
        _vx: number; _vy: number; _glow: Phaser.GameObjects.Arc;
        _age: number; _color: number;
      };
      p.x += p._vx * dt;
      p.y += p._vy * dt;
      p._glow.x = p.x; p._glow.y = p.y;
      p._age += dt;

      // Trail particles
      if (Math.random() < 0.25) {
        const t = this.add.circle(p.x, p.y, 2, p._color, 0.4).setDepth(22);
        this.tweens.add({ targets: t, alpha: 0, scale: 0, duration: 150, onComplete: () => t.destroy() });
      }

      // AABB collision with wizard — only if not invincible
      if (!this.wizardInvincible && !this.wizardBlocking &&
          p.x >= wb.left && p.x <= wb.right && p.y >= wb.top && p.y <= wb.bottom) {
        this.spawnBossImpact(p.x, p.y, p._color);
        p._glow.destroy(); p.destroy(); toRemove.push(i);
        this.onWizardHit();
        continue;
      }

      // Blocked — absorb projectile
      if (this.wizardBlocking &&
          p.x >= wb.left - 15 && p.x <= wb.right + 15 && p.y >= wb.top && p.y <= wb.bottom) {
        p._glow.destroy(); p.destroy(); toRemove.push(i);
        this.onWizardHit(); // onWizardHit handles the block check internally
        continue;
      }

      // Off screen or too old
      if (p.x < -30 || p.x > GAME_WIDTH + 30 || p.y < -30 || p.y > GAME_HEIGHT + 30 || p._age > 3) {
        p._glow.destroy(); p.destroy(); toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) this.bossProjectiles.splice(toRemove[i], 1);
  }

  private spawnBossImpact(x: number, y: number, color: number): void {
    const ring = this.add.circle(x, y, 8, color, 0.8).setDepth(25);
    this.tweens.add({ targets: ring, scaleX: 3, scaleY: 3, alpha: 0, duration: 250, onComplete: () => ring.destroy() });
    for (let i = 0; i < 5; i++) {
      const p = this.add.circle(x, y, 2, color, 0.6).setDepth(25);
      this.tweens.add({ targets: p, x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 40, alpha: 0, duration: 300, onComplete: () => p.destroy() });
    }
  }

  private bossJump(): void {
    if (!this.bossOnGround) return;
    this.bossOnGround = false; this.bossVelY = -380;
  }

  // ===========================================================================
  // Damage
  // ===========================================================================

  private onBossHit(): void {
    if (this.bossDead) return;
    this.bossHp--;
    this.emitPhaseUpdate();
    this.hitstopFrames = 3;

    this.boss.setTint(0xffffff);
    const dir = this.boss.x > this.wizard.x ? 1 : -1;
    this.tweens.add({ targets: this.boss, x: this.boss.x + dir * 20, duration: 80, yoyo: true });
    this.cameras.main.shake(80, 0.008);
    this.time.delayedCall(120, () => { if (this.boss?.active) this.boss.clearTint(); });

    if (this.bossHp <= 0) this.onBossDefeated();
  }

  private onWizardHit(): void {
    if (this.wizardInvincible || this.gameState !== "fighting") return;

    if (this.wizardBlocking) {
      this.cameras.main.flash(80, 80, 80, 255, false);
      const dir = this.wizard.x > this.boss.x ? 1 : -1;
      this.tweens.add({ targets: this.wizard, x: this.wizard.x + dir * 12, duration: 60, yoyo: true });
      const sx = this.wizard.x + (this.wizardFacing === "right" ? 20 : -20), sy = this.wizard.y - 40;
      for (let i = 0; i < 5; i++) {
        const sp = this.add.circle(sx, sy, 3, 0x6688ff, 0.8).setDepth(21);
        this.tweens.add({ targets: sp, x: sx + (Math.random() - 0.5) * 30, y: sy + (Math.random() - 0.5) * 30, alpha: 0, duration: 200, onComplete: () => sp.destroy() });
      }
      return;
    }

    this.lives--;
    this.wizardInvincible = true;
    this.hitstopFrames = 4;
    this.emitPhaseUpdate();
    eventBus.emit("battle:lives", { lives: this.lives });

    this.wizard.setTint(0xff0000);
    this.cameras.main.flash(150, 255, 0, 0, false);
    this.cameras.main.shake(150, 0.015);
    const dir = this.wizard.x > this.boss.x ? 1 : -1;
    this.tweens.add({ targets: this.wizard, x: this.wizard.x + dir * 35, duration: 100, yoyo: true });
    this.time.delayedCall(120, () => { if (this.wizard?.active) this.wizard.clearTint(); });

    if (this.anims.exists("player-hit")) {
      this.wizard.play("player-hit");
      this._currentWizardAnim = "player-hit";
      this.wizard.once("animationcomplete", () => { this._currentWizardAnim = ""; });
    }

    this.time.delayedCall(1200, () => {
      this.wizardInvincible = false;
      if (this.wizard?.active) this.wizard.setAlpha(1);
    });

    if (this.lives <= 0) { this.lives = 1; eventBus.emit("battle:lives", { lives: this.lives }); }
  }

  // ===========================================================================
  // Boss Defeated / Revive
  // ===========================================================================

  private onBossDefeated(): void {
    this.bossDead = true;
    this.bossAttacking = false;
    this._currentBossAnim = "";
    if (this.boss?.active) { this.boss.stop(); this.tweens.killTweensOf(this.boss); }
    this.clearBossProjectiles();

    this.tweens.add({
      targets: this.boss, alpha: 0, scaleY: BOSS_SCALE * 0.1, y: this.boss.y + 20,
      duration: 800, ease: "Power2", onComplete: () => this.showQuestion(),
    });

    this.cameras.main.shake(400, 0.02);
    this.hitstopFrames = 6;

    for (let i = 0; i < 15; i++) {
      const c = [0xff8844, 0xff4444, 0xffdd44][Math.floor(Math.random() * 3)];
      const p = this.add.circle(this.boss.x, this.boss.y - 40, 3 + Math.random() * 3, c, 0.8).setDepth(20);
      this.tweens.add({
        targets: p,
        x: this.boss.x + (Math.random() - 0.5) * 140,
        y: this.boss.y - 40 + (Math.random() - 0.5) * 140,
        alpha: 0, scale: 0, duration: 700, onComplete: () => p.destroy(),
      });
    }
  }

  private showQuestion(): void {
    this.gameState = "question";
    this.emitPhaseUpdate();
    eventBus.emit(GameEvents.CASTLE_QUESTION, { bossPhase: this.bossPhase });
  }

  private onAnswerResult(correct: boolean): void {
    if (!this.alive) return;
    if (correct) {
      this.bossPhase++;
      if (this.bossPhase > 3) this.triggerVictory();
      else {
        this.gameState = "spawning";
        this.emitPhaseUpdate();
        this.time.delayedCall(600, () => { if (this.alive) this.spawnBoss(this.bossPhase); });
      }
    } else {
      this.reviveBoss();
    }
  }

  private reviveBoss(): void {
    this.gameState = "fighting";
    this.bossDead = false;
    this.bossRevived = true;
    this.bossEnraged = true;

    this.bossHp = this.bossConfig.hp + this.bossConfig.revivedBonusHp;
    this.maxBossHp = this.bossHp;
    this.emitPhaseUpdate();

    this.cameras.main.shake(500, 0.02);
    this.cameras.main.flash(400, 200, 0, 0, false);

    if (this.boss) this.tweens.killTweensOf(this.boss);
    this.boss.setActive(true).setVisible(true).setAlpha(0).setScale(0).setFlipX(false);
    this.boss.y = GROUND_Y; this.boss.x = BOSS_START_X;
    this.boss.setTint(0xff2222);
    this._currentBossAnim = "";

    this.tweens.add({
      targets: this.boss, alpha: 1, scaleX: BOSS_SCALE, scaleY: BOSS_SCALE,
      duration: 1000, ease: "Power2",
      onComplete: () => {
        if (this.boss?.active) {
          this.boss.clearTint();
          this.playBossAnim(`boss${this.bossPhase}-idle`);
        }
        this.bossLastAttackTime = this.time.now + 600;
      },
    });
  }

  // ===========================================================================
  // Victory
  // ===========================================================================

  private triggerVictory(): void {
    this.gameState = "victory";
    this.emitPhaseUpdate();

    if (this.textures.exists("player-celebrate")) this.wizard.setTexture("player-celebrate");
    this.tweens.add({ targets: this.wizard, y: this.wizard.y - 30, duration: 400, yoyo: true, repeat: 2, ease: "Sine.easeInOut" });

    for (let i = 0; i < 25; i++) {
      const c = [0xffdd44, 0xff8844, 0x44aaff, 0x44ff88, 0xff44ff][Math.floor(Math.random() * 5)];
      const p = this.add.circle(this.wizard.x, this.wizard.y - 40, 3, c, 0.8).setDepth(20);
      this.tweens.add({
        targets: p,
        x: this.wizard.x + (Math.random() - 0.5) * 180,
        y: this.wizard.y - 40 - Math.random() * 120,
        alpha: 0, scale: 0, duration: 900 + Math.random() * 400, onComplete: () => p.destroy(),
      });
    }
    this.time.delayedCall(2500, () => { eventBus.emit(GameEvents.CASTLE_VICTORY, { castleId: "castle" }); });
  }

  // ===========================================================================
  // Emitters
  // ===========================================================================

  private emitPhaseUpdate(): void {
    const p: CastlePhasePayload = {
      bossPhase: this.bossPhase, bossHp: Math.max(0, this.bossHp), maxBossHp: this.maxBossHp,
      playerHp: this.lives, maxPlayerHp: PLAYER_MAX_LIVES, gameState: this.gameState,
    };
    eventBus.emit(GameEvents.CASTLE_PHASE_UPDATE, p);
    eventBus.emit(GameEvents.PHASE_CHANGE, { phase: `Boss ${this.bossPhase}`, bossHp: Math.max(0, this.bossHp), maxBossHp: this.maxBossHp });
    eventBus.emit("battle:lives", { lives: this.lives });
  }
}

import Phaser from "phaser";
import {
  eventBus,
  GameEvents,
  type LevelStartPayload,
} from "../EventBus";
import { PlayerSprite } from "../sprites/PlayerSprite";
import { ParallaxBackground } from "../utils/ParallaxBackground";
import type { WorldTheme } from "@/lib/level-config";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";
import { SoundManager } from "../utils/SoundManager";

// ─── Types ───────────────────────────────────────────────
interface ResultData {
  isCorrect: boolean;
  correctAnswer: string;
  pointsEarned: number;
}

type Phase = "idle" | "animating" | "killing";

// ─── Layout constants ────────────────────────────────────
const PLAYER_X = 130;
const GROUND_Y = GAME_HEIGHT - 70;
const DRAGON_X = GAME_WIDTH - 120;
const DASH_START_X = DRAGON_X - 140;

// ═══════════════════════════════════════════════════════════
export class DragonBattleScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private dragon!: Phaser.GameObjects.Sprite;
  private background!: ParallaxBackground;
  private flashOverlay!: Phaser.GameObjects.Rectangle;
  private sound_!: SoundManager;

  private phase: Phase = "idle";
  private lives = 3;
  private bossHp = 1;
  private maxBossHp = 1;
  private worldTheme: WorldTheme = "mountain";

  private unsubs: Array<() => void> = [];
  private destroyed = false;

  constructor() {
    super({ key: "DragonBattleScene" });
  }

  private get alive(): boolean {
    try {
      return !this.destroyed && !!this.sys?.displayList;
    } catch {
      return false;
    }
  }

  // ─── Init (receives config from PhaserCanvas) ─────────
  init(data: unknown): void {
    const d = data as Partial<LevelStartPayload>;
    if (d?.worldTheme) this.worldTheme = d.worldTheme as WorldTheme;
    if (d?.maxProgress && d.maxProgress > 0) {
      this.maxBossHp = d.maxProgress;
      this.bossHp = d.maxProgress;
    }
  }

  // ─── Asset loading ─────────────────────────────────────
  preload(): void {
    for (let i = 0; i < 4; i++) {
      if (!this.textures.exists(`dragon-idle-${i}`)) {
        this.load.image(`dragon-idle-${i}`, `/game-assets/dragon-battle/dragon-idle/frame_00${i}.png`);
      }
    }
    for (let i = 0; i < 6; i++) {
      if (!this.textures.exists(`dragon-throw-${i}`)) {
        this.load.image(`dragon-throw-${i}`, `/game-assets/dragon-battle/dragon-throw/frame_00${i}.png`);
      }
    }
    if (!this.textures.exists("dragon-static")) {
      this.load.image("dragon-static", "/game-assets/dragon-battle/dragon-static.png");
    }
  }

  // ─── Scene creation ─────────────────────────────────────
  create(): void {
    this.phase = "idle";
    this.destroyed = false;
    this.lives = 3;

    this.background = new ParallaxBackground(this);
    this.background.create(this.worldTheme);

    this.sound_ = new SoundManager(this);

    this.flashOverlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT, 0xff0000, 0
    );
    this.flashOverlay.setDepth(50);

    this.createParticleTextures();

    // Player (left)
    this.player = new PlayerSprite(this, PLAYER_X, GROUND_Y);
    this.player.setDepth(10);
    this.player.setPlayerState("idle");
    this.player.onSlideComplete = () => this.onSlideComplete();

    // Dragon (right)
    this.createDragonAnimations();
    const dragonKey = this.textures.exists("dragon-idle-0") ? "dragon-idle-0" : "dragon-static";
    this.dragon = this.add.sprite(DRAGON_X, GROUND_Y - 16, dragonKey);
    this.dragon.setScale(3);
    this.dragon.setDepth(10);
    if (this.dragon.anims && this.anims.exists("dragon-breathe")) {
      this.dragon.play("dragon-breathe");
    }
    this.addDragonFloat();

    this.setupEvents();

    eventBus.emit(GameEvents.PHASE_CHANGE, {
      phase: "ready",
      bossHp: this.bossHp,
      maxBossHp: this.maxBossHp,
    });

    eventBus.emit("dragon:ready");
  }

  // ─── Dragon animations ─────────────────────────────────
  private createDragonAnimations(): void {
    if (!this.anims.exists("dragon-breathe")) {
      this.anims.create({
        key: "dragon-breathe",
        frames: [
          { key: "dragon-idle-0" }, { key: "dragon-idle-1" },
          { key: "dragon-idle-2" }, { key: "dragon-idle-3" },
        ],
        frameRate: 4,
        repeat: -1,
      });
    }
    if (!this.anims.exists("dragon-throw")) {
      this.anims.create({
        key: "dragon-throw",
        frames: [
          { key: "dragon-throw-0" }, { key: "dragon-throw-1" },
          { key: "dragon-throw-2" }, { key: "dragon-throw-3" },
          { key: "dragon-throw-4" }, { key: "dragon-throw-5" },
        ],
        frameRate: 10,
        repeat: 0,
      });
    }
  }

  private addDragonFloat(): void {
    if (!this.dragon || !this.alive) return;
    this.tweens.add({
      targets: this.dragon,
      y: this.dragon.y - 6,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // ─── Event listeners ───────────────────────────────────
  private setupEvents(): void {
    this.cleanupEvents();
    this.unsubs.push(
      eventBus.on(GameEvents.ANSWER_RESULT, (data) => {
        this.onAnswerResult(data as ResultData);
      })
    );
  }

  private cleanupEvents(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
  }

  // ═══════════════════════════════════════════════════════════
  // ANSWER RESULT — triggered by React ClassicAnswerOverlay
  // ═══════════════════════════════════════════════════════════

  private onAnswerResult(data: ResultData): void {
    if (!this.alive) return;
    if (this.phase !== "idle") return;
    this.phase = "animating";

    if (data.isCorrect) {
      this.playCorrect(data);
    } else {
      this.playWrong(data);
    }
  }

  // ─── CORRECT: pop explosion, boss HP decrements ────────
  private playCorrect(data: ResultData): void {
    this.sound_?.playCorrect();
    this.bossHp = Math.max(0, this.bossHp - 1);

    eventBus.emit(GameEvents.PHASE_CHANGE, {
      phase: "correct",
      bossHp: this.bossHp,
      maxBossHp: this.maxBossHp,
    });

    // Pop explosion at center
    this.stoneExplosion(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 0x44ff44);
    this.cameras.main.shake(200, 0.01);

    // Points popup
    if (data.pointsEarned > 0) {
      this.floatingText(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, `+${data.pointsEarned}`, "#ffdd00");
    }

    // Check boss killed
    if (this.bossHp <= 0) {
      this.cameras.main.shake(300, 0.015);
      this.cameras.main.flash(200, 255, 255, 255);
      this.sound_?.playBossDeath();

      if (this.dragon) {
        this.tweens.killTweensOf(this.dragon);
        this.tweens.add({
          targets: this.dragon,
          alpha: 0, y: this.dragon.y + 30,
          scaleX: 2.5, scaleY: 2.5,
          duration: 800, ease: "Power2",
        });
      }
      this.spawnBigExplosion(DRAGON_X, GROUND_Y);
      this.time.delayedCall(800, () => this.startKillRun());
    } else {
      this.player.setPlayerState("celebrating");
      this.time.delayedCall(1000, () => this.finishRound());
    }
  }

  // ─── WRONG: dragon attacks player ──────────────────────
  private playWrong(data: ResultData): void {
    this.sound_?.playIncorrect();

    eventBus.emit(GameEvents.PHASE_CHANGE, {
      phase: "incorrect",
      bossHp: this.bossHp,
      maxBossHp: this.maxBossHp,
    });

    // Dragon throw animation
    if (this.dragon?.anims && this.anims.exists("dragon-throw")) {
      this.tweens.killTweensOf(this.dragon);
      const origY = GROUND_Y - 16;
      this.dragon.y = origY;
      this.dragon.play("dragon-throw");

      const origX = this.dragon.x;
      this.tweens.add({
        targets: this.dragon,
        x: origX - 50,
        duration: 250,
        ease: "Power2",
        yoyo: true,
        onComplete: () => {
          if (!this.alive || !this.dragon?.anims) return;
          if (this.anims.exists("dragon-breathe")) this.dragon.play("dragon-breathe");
          this.addDragonFloat();
        },
      });
    }

    // Fire projectile from dragon to player
    this.time.delayedCall(200, () => {
      if (!this.alive) return;

      const projectile = this.add.circle(DRAGON_X - 60, GROUND_Y - 40, 10, 0xff4400, 1);
      projectile.setDepth(25);
      const glow = this.add.circle(DRAGON_X - 60, GROUND_Y - 40, 18, 0xff6600, 0.3);
      glow.setDepth(24);

      this.tweens.add({
        targets: [projectile, glow],
        x: PLAYER_X,
        y: GROUND_Y - 30,
        duration: 450,
        ease: "Quad.easeIn",
        onComplete: () => {
          projectile.destroy();
          glow.destroy();
          if (!this.alive) return;

          // Impact
          this.stoneExplosion(PLAYER_X, GROUND_Y - 30, 0xff4400);
          this.player.setPlayerState("hurt");

          this.cameras.main.shake(350, 0.02);
          this.flashOverlay.setAlpha(0.35);
          this.tweens.add({ targets: this.flashOverlay, alpha: 0, duration: 500 });

          // Lose life
          this.lives = Math.max(0, this.lives - 1);
          eventBus.emit("battle:lives", { lives: this.lives });
          this.floatingText(PLAYER_X + 30, GROUND_Y - 80, "-1 ❤️", "#ff4444");

          // Check game over
          if (this.lives <= 0) {
            this.time.delayedCall(600, () => {
              if (!this.alive) return;
              this.player.setPlayerState("dead");
              this.sound_?.playBossDeath();
            });
            this.time.delayedCall(2000, () => {
              eventBus.emit("battle:gameover", {});
            });
            return;
          }

          this.time.delayedCall(1400, () => this.finishRound());
        },
      });
    });
  }

  // ─── End of round ──────────────────────────────────────
  private finishRound(): void {
    if (!this.alive) return;
    this.player.setPlayerState("idle");
    this.phase = "idle";

    eventBus.emit(GameEvents.PHASE_CHANGE, {
      phase: "ready",
      bossHp: this.bossHp,
      maxBossHp: this.maxBossHp,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // FINAL KILL
  // ═══════════════════════════════════════════════════════════

  private startKillRun(): void {
    if (!this.alive) return;
    this.phase = "killing";
    this.player.setPlayerState("running");

    this.tweens.add({
      targets: this.player,
      x: DASH_START_X,
      duration: 600,
      ease: "Quad.easeIn",
      onComplete: () => {
        if (!this.alive) return;
        this.player.setPlayerState("sliding");
        this.sound_?.playSlide();
        this.tweens.add({
          targets: this.player,
          x: DRAGON_X - 10,
          duration: 350,
          ease: "Power3",
        });
      },
    });
  }

  private onSlideComplete(): void {
    if (!this.alive || this.phase !== "killing") return;

    this.spawnBigExplosion(DRAGON_X, GROUND_Y);
    this.cameras.main.shake(400, 0.02);
    this.cameras.main.flash(300, 255, 255, 255);

    if (this.dragon) this.dragon.setVisible(false);
    this.player.setPlayerState("celebrating");
    this.phase = "idle";

    this.time.delayedCall(1200, () => {
      eventBus.emit(GameEvents.LEVEL_COMPLETE, {});
    });
  }

  // ═══════════════════════════════════════════════════════════
  // VISUAL EFFECTS
  // ═══════════════════════════════════════════════════════════

  private createParticleTextures(): void {
    if (!this.textures.exists("p-circle")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1); g.fillCircle(4, 4, 4);
      g.generateTexture("p-circle", 8, 8); g.destroy();
    }
    if (!this.textures.exists("p-shard")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 8, 4);
      g.generateTexture("p-shard", 8, 4); g.destroy();
    }
    if (!this.textures.exists("p-spark")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1); g.fillCircle(2, 2, 2);
      g.generateTexture("p-spark", 4, 4); g.destroy();
    }
  }

  private stoneExplosion(x: number, y: number, tint: number): void {
    if (!this.alive) return;

    const shards = this.add.particles(x, y, "p-shard", {
      speed: { min: 80, max: 250 }, angle: { min: 0, max: 360 },
      lifespan: 600, quantity: 20,
      scale: { start: 2, end: 0.3 }, rotate: { min: 0, max: 360 },
      tint: [tint, 0x888888, 0x555555], emitting: false,
    });
    shards.setDepth(30); shards.explode(20);

    const dust = this.add.particles(x, y, "p-circle", {
      speed: { min: 30, max: 120 }, angle: { min: 0, max: 360 },
      lifespan: 500, quantity: 14,
      scale: { start: 1.5, end: 0 }, tint: [0xccbbaa, 0xddccbb, 0xffffff],
      alpha: { start: 0.7, end: 0 }, emitting: false,
    });
    dust.setDepth(29); dust.explode(14);

    const sparks = this.add.particles(x, y, "p-spark", {
      speed: { min: 50, max: 200 }, angle: { min: 200, max: 340 },
      lifespan: 400, quantity: 8,
      scale: { start: 1.2, end: 0 }, gravityY: 300,
      tint: [0xffdd44, 0xffffff], blendMode: "ADD", emitting: false,
    });
    sparks.setDepth(31); sparks.explode(8);

    this.time.delayedCall(800, () => {
      if (shards.active) shards.destroy();
      if (dust.active) dust.destroy();
      if (sparks.active) sparks.destroy();
    });
  }

  private spawnBigExplosion(x: number, y: number): void {
    if (!this.alive) return;

    const core = this.add.particles(x, y, "p-circle", {
      speed: { min: 100, max: 350 }, angle: { min: 0, max: 360 },
      lifespan: 600, quantity: 40,
      scale: { start: 2.5, end: 0 }, tint: [0xffffff, 0xffffaa, 0xffdd44],
      blendMode: "ADD", emitting: false,
    });
    core.setDepth(56); core.explode(40);

    const debris = this.add.particles(x, y, "p-shard", {
      speed: { min: 80, max: 280 }, angle: { min: 0, max: 360 },
      lifespan: 800, quantity: 30,
      scale: { start: 2, end: 0.3 }, rotate: { min: 0, max: 360 },
      tint: [0xff5a39, 0xff8800, 0xffcc00, 0xff3300], emitting: false,
    });
    debris.setDepth(55); debris.explode(30);

    const sparks2 = this.add.particles(x, y, "p-spark", {
      speed: { min: 30, max: 150 }, angle: { min: 200, max: 340 },
      lifespan: 1000, quantity: 20,
      scale: { start: 1.5, end: 0 }, gravityY: 200,
      tint: [0xff5a39, 0xffaa00, 0xffffff], blendMode: "ADD", emitting: false,
    });
    sparks2.setDepth(54); sparks2.explode(20);

    this.time.delayedCall(1200, () => {
      if (core.active) core.destroy();
      if (debris.active) debris.destroy();
      if (sparks2.active) sparks2.destroy();
    });
  }

  private floatingText(x: number, y: number, text: string, color: string): void {
    if (!this.alive) return;
    try {
      const t = this.add.text(x, y, text, {
        fontSize: "28px", color,
        fontFamily: "Fredoka, sans-serif",
        stroke: "#000000", strokeThickness: 4,
      });
      t.setOrigin(0.5).setDepth(60);
      this.tweens.add({
        targets: t, y: y - 60, alpha: 0,
        duration: 1200, ease: "Power2",
        onComplete: () => t.destroy(),
      });
    } catch {
      // Scene destroyed mid-call
    }
  }

  // ─── Cleanup ───────────────────────────────────────────
  shutdown(): void {
    this.destroyed = true;
    this.cleanupEvents();
    this.background?.destroy();
    this.sound_?.destroy();
  }
}

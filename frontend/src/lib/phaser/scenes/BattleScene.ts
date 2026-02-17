import Phaser from "phaser";
import {
  eventBus,
  GameEvents,
  type AnswerResultPayload,
  type LevelStartPayload,
} from "../EventBus";
import { PlayerSprite } from "../sprites/PlayerSprite";
import { BossSprite } from "../sprites/BossSprite";
import { ParallaxBackground } from "../utils/ParallaxBackground";
import type { BossType } from "@/lib/boss-config";
import type { WorldTheme } from "@/lib/level-config";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";
import { SoundManager } from "../utils/SoundManager";

// ── Game loop ─────────────────────────────────────────
// 1. "ready"      — wizard idle, waiting for question overlay
// 2. "casting"    — correct! wizard casts spell, projectile flies to boss
// 3. "boss_hurt"  — boss takes damage
// 4. "killing"    — boss HP=0: wizard runs to boss, slides, boss explodes
// 5. "wrong"      — incorrect: boss attacks
// 6. "game_over"  — kill complete
type BattlePhase =
  | "ready"
  | "casting"
  | "boss_hurt"
  | "killing"
  | "wrong"
  | "game_over";

const PLAYER_X = 150;
const GROUND_Y = GAME_HEIGHT - 80;
const BOSS_X = GAME_WIDTH - 160;
const DASH_START_X = BOSS_X - 140;

export class BattleScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private boss!: BossSprite;
  private background!: ParallaxBackground;
  private phase: BattlePhase = "ready";
  private sound_!: SoundManager;
  private flashOverlay!: Phaser.GameObjects.Rectangle;

  // Boss HP = total number of questions
  private bossHp = 1;
  private maxBossHp = 1;
  private bossType: BossType = "dark_sorcerer";
  private worldTheme: WorldTheme = "grassland";

  private unsubs: Array<() => void> = [];
  private destroyed = false;

  /** Check if scene is still alive and safe to call Phaser APIs */
  private get alive(): boolean {
    return !this.destroyed && !!this.add && !!this.scene;
  }

  constructor() {
    super({ key: "BattleScene" });
  }

  init(data: unknown): void {
    const d = data as Partial<LevelStartPayload>;
    if (d?.worldTheme) this.worldTheme = d.worldTheme as WorldTheme;
    if (d?.bossType) this.bossType = d.bossType as BossType;
    if (d?.maxProgress && d.maxProgress > 0) {
      this.maxBossHp = d.maxProgress;
      this.bossHp = d.maxProgress;
    }
  }

  create(): void {
    this.phase = "ready";

    // Background
    this.background = new ParallaxBackground(this);
    this.background.create(this.worldTheme);

    // Sound
    this.sound_ = new SoundManager(this);

    // Flash overlay
    this.flashOverlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT, 0xff0000, 0
    );
    this.flashOverlay.setDepth(50);

    // Particle textures
    this.createParticleTextures();

    // Player — idle on the left
    this.player = new PlayerSprite(this, PLAYER_X, GROUND_Y);
    this.player.setDepth(10);
    this.player.setPlayerState("idle");

    // Boss — on the right, offset Y so feet align with wizard
    // Boss sprite is 64px (scaled 3x=192px), wizard is 56px (scaled 3x=168px)
    // Difference in half-height: (192-168)/2 = 12px, so boss Y is 12px higher
    this.boss = new BossSprite(this, BOSS_X, GROUND_Y - 12, this.bossType);
    this.boss.setDepth(10);

    // Callbacks
    this.player.onCastComplete = () => this.onCastComplete();
    this.player.onSlideComplete = () => this.onSlideComplete();
    this.boss.onHurtComplete = () => this.onBossHurtDone();
    this.boss.onAttackComplete = () => this.onBossAttackDone();
    this.boss.onDeathComplete = () => {};

    // Event listeners
    this.cleanupListeners();
    this.unsubs.push(
      eventBus.on(GameEvents.ANSWER_RESULT, (detail) => {
        this.onAnswerResult(detail as AnswerResultPayload);
      })
    );

    // Tell HUD the initial HP
    eventBus.emit(GameEvents.PHASE_CHANGE, {
      phase: "ready",
      bossHp: this.bossHp,
      maxBossHp: this.maxBossHp,
    });
  }

  // ── Answer result from React ───────────────────────

  private onAnswerResult(result: AnswerResultPayload): void {
    if (!this.alive) return;
    if (this.phase !== "ready") return;

    if (result.isCorrect) {
      this.onCorrect(result);
    } else {
      this.onWrong();
    }
  }

  // ═══════════════════════════════════════════════════════
  // CORRECT: cast spell → projectile → boss hurt
  // ═══════════════════════════════════════════════════════

  private onCorrect(result: AnswerResultPayload): void {
    this.phase = "casting";
    this.bossHp = Math.max(0, this.bossHp - 1);
    this.sound_?.playCorrect();

    // Hide question overlay
    eventBus.emit(GameEvents.PHASE_CHANGE, {
      phase: "correct",
      bossHp: this.bossHp,
      maxBossHp: this.maxBossHp,
    });

    // Points popup
    if (result.pointsEarned > 0) {
      this.floatingText(PLAYER_X + 50, GROUND_Y - 100, `+${result.pointsEarned}`, "#ffdd00");
    }

    // Wizard casts spell
    this.player.setPlayerState("casting");
  }

  /** Spell cast animation finished — fire projectile */
  private onCastComplete(): void {
    if (!this.alive || this.phase !== "casting") return;
    this.fireProjectile();
  }

  private fireProjectile(): void {
    // Create glowing energy ball at wizard position
    const startX = PLAYER_X + 40;
    const startY = GROUND_Y - 20;
    const endX = BOSS_X - 20;
    const endY = GROUND_Y - 10;

    // Main projectile
    const ball = this.add.circle(startX, startY, 8, 0x44aaff, 1);
    ball.setDepth(20);

    // Glow ring around projectile
    const glow = this.add.circle(startX, startY, 16, 0x44aaff, 0.3);
    glow.setDepth(19);

    // Trail particles
    const trailTimer = this.time.addEvent({
      delay: 30,
      callback: () => {
        if (!ball.active) return;
        const trail = this.add.circle(ball.x, ball.y, 4, 0x66ccff, 0.5);
        trail.setDepth(18);
        this.tweens.add({
          targets: trail,
          alpha: 0,
          scale: 0.1,
          duration: 200,
          onComplete: () => trail.destroy(),
        });
      },
      repeat: 15,
    });

    // Fly projectile to boss
    this.tweens.add({
      targets: [ball, glow],
      x: endX,
      y: endY,
      duration: 400,
      ease: "Sine.easeIn",
      onComplete: () => {
        trailTimer.destroy();
        ball.destroy();
        glow.destroy();

        // Impact flash at boss
        this.spawnImpact(endX, endY);
        this.sound_?.playBossHurt();

        // Boss takes damage
        this.phase = "boss_hurt";

        if (this.bossHp <= 0) {
          // FINAL KILL — boss dies, then wizard runs and slides
          this.cameras.main.shake(300, 0.015);
          this.cameras.main.flash(200, 255, 255, 255);
          this.sound_?.playBossDeath();
          this.boss.setBossState("dying");
          this.spawnBigExplosion(BOSS_X, GROUND_Y);

          // After explosion, start kill run
          this.time.delayedCall(800, () => this.startKillRun());
        } else {
          // Boss hurt, not dead
          this.boss.setBossState("hurt");
          this.floatingText(BOSS_X, GROUND_Y - 60, `-1`, "#ff4444");
        }
      },
    });
  }

  private onBossHurtDone(): void {
    if (!this.alive || this.phase !== "boss_hurt") return;
    // Back to idle, ready for next question
    this.phase = "ready";
    this.player.setPlayerState("idle");
    eventBus.emit(GameEvents.PHASE_CHANGE, {
      phase: "ready",
      bossHp: this.bossHp,
      maxBossHp: this.maxBossHp,
    });
  }

  // ═══════════════════════════════════════════════════════
  // FINAL KILL: run to boss → slide → explode → game over
  // ═══════════════════════════════════════════════════════

  private startKillRun(): void {
    if (!this.alive) return;
    this.phase = "killing";
    this.player.setPlayerState("running");

    // Run to slide start position
    this.tweens.add({
      targets: this.player,
      x: DASH_START_X,
      duration: 600,
      ease: "Quad.easeIn",
      onComplete: () => {
        // Dash slide into boss
        this.player.setPlayerState("sliding");
        this.sound_?.playSlide();

        this.tweens.add({
          targets: this.player,
          x: BOSS_X - 10,
          duration: 350,
          ease: "Power3",
        });
      },
    });
  }

  private onSlideComplete(): void {
    if (!this.alive || this.phase !== "killing") return;

    // Final explosion
    this.spawnBigExplosion(BOSS_X, GROUND_Y);
    this.cameras.main.shake(400, 0.02);
    this.cameras.main.flash(300, 255, 255, 255);

    this.player.setPlayerState("celebrating");

    this.phase = "game_over";

    // Tell React the game is over
    this.time.delayedCall(1200, () => {
      eventBus.emit(GameEvents.LEVEL_COMPLETE, {});
    });
  }

  // ═══════════════════════════════════════════════════════
  // WRONG: boss attacks → flash → back to ready
  // ═══════════════════════════════════════════════════════

  private onWrong(): void {
    if (!this.alive) return;
    this.phase = "wrong";
    this.sound_?.playIncorrect();

    eventBus.emit(GameEvents.PHASE_CHANGE, {
      phase: "incorrect",
      bossHp: this.bossHp,
      maxBossHp: this.maxBossHp,
    });

    this.player.setPlayerState("hurt");
    this.boss.setBossState("attacking");

    this.flashOverlay.setAlpha(0.3);
    this.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: 400,
    });
  }

  private onBossAttackDone(): void {
    if (!this.alive || this.phase !== "wrong") return;
    this.time.delayedCall(300, () => {
      this.player.setPlayerState("idle");
      this.phase = "ready";
      eventBus.emit(GameEvents.PHASE_CHANGE, {
        phase: "ready",
        bossHp: this.bossHp,
        maxBossHp: this.maxBossHp,
      });
    });
  }

  // ═══════════════════════════════════════════════════════
  // Visual effects
  // ═══════════════════════════════════════════════════════

  private createParticleTextures(): void {
    if (!this.textures.exists("particle-circle")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1); g.fillCircle(4, 4, 4);
      g.generateTexture("particle-circle", 8, 8); g.destroy();
    }
    if (!this.textures.exists("particle-shard")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 6, 3);
      g.generateTexture("particle-shard", 6, 3); g.destroy();
    }
    if (!this.textures.exists("particle-spark")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1); g.fillCircle(2, 2, 2);
      g.generateTexture("particle-spark", 4, 4); g.destroy();
    }
  }

  private spawnImpact(x: number, y: number): void {
    // Small impact burst
    const burst = this.add.particles(x, y, "particle-circle", {
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      lifespan: 300,
      quantity: 12,
      scale: { start: 1.2, end: 0 },
      tint: [0x44aaff, 0x88ccff, 0xffffff],
      blendMode: "ADD",
      emitting: false,
    });
    burst.setDepth(25);
    burst.explode(12);

    // Impact ring
    const ring = this.add.circle(x, y, 5, 0x44aaff, 0.6);
    ring.setDepth(24);
    this.tweens.add({
      targets: ring,
      scaleX: 6,
      scaleY: 6,
      alpha: 0,
      duration: 300,
      ease: "Power2",
      onComplete: () => ring.destroy(),
    });

    this.time.delayedCall(500, () => burst.destroy());
  }

  private spawnBigExplosion(x: number, y: number): void {
    const core = this.add.particles(x, y, "particle-circle", {
      speed: { min: 100, max: 350 },
      angle: { min: 0, max: 360 },
      lifespan: 600,
      quantity: 40,
      scale: { start: 2.5, end: 0 },
      tint: [0xffffff, 0xffffaa, 0xffdd44],
      blendMode: "ADD",
      emitting: false,
    });
    core.setDepth(56);
    core.explode(40);

    const debris = this.add.particles(x, y, "particle-shard", {
      speed: { min: 80, max: 280 },
      angle: { min: 0, max: 360 },
      lifespan: 800,
      quantity: 30,
      scale: { start: 2, end: 0.3 },
      rotate: { min: 0, max: 360 },
      tint: [0xff5a39, 0xff8800, 0xffcc00, 0xff3300],
      emitting: false,
    });
    debris.setDepth(55);
    debris.explode(30);

    const sparks = this.add.particles(x, y, "particle-spark", {
      speed: { min: 30, max: 150 },
      angle: { min: 200, max: 340 },
      lifespan: 1000,
      quantity: 20,
      scale: { start: 1.5, end: 0 },
      gravityY: 200,
      tint: [0xff5a39, 0xffaa00, 0xffffff],
      blendMode: "ADD",
      emitting: false,
    });
    sparks.setDepth(54);
    sparks.explode(20);

    this.time.delayedCall(1200, () => {
      core.destroy();
      debris.destroy();
      sparks.destroy();
    });
  }

  private floatingText(x: number, y: number, text: string, color: string): void {
    if (!this.alive) return;
    try {
      const t = this.add.text(x, y, text, {
        fontSize: "28px",
        color,
        fontFamily: "Fredoka, sans-serif",
        stroke: "#000000",
        strokeThickness: 4,
      });
      t.setOrigin(0.5).setDepth(60);
      this.tweens.add({
        targets: t,
        y: y - 60,
        alpha: 0,
        duration: 1100,
        ease: "Power2",
        onComplete: () => t.destroy(),
      });
    } catch {
      // Scene was destroyed mid-call
    }
  }

  // ── Lifecycle ──────────────────────────────────────

  private cleanupListeners(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
  }

  shutdown(): void {
    this.destroyed = true;
    this.cleanupListeners();
    this.background?.destroy();
    this.sound_?.destroy();
  }
}

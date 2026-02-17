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
  private lives = 3;
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
    this.lives = 3;

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
  // WRONG: boss attack — different per boss type
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

    // Boss wind-up lunge — moves forward, then snaps back
    this.boss.setBossState("attacking");
    const origBossX = this.boss.x;
    this.tweens.add({
      targets: this.boss,
      x: origBossX - 30,
      duration: 200,
      ease: "Back.easeOut",
      yoyo: true,
      hold: 100,
      onYoyo: () => {
        if (!this.alive) return;
        // Launch the attack projectile at the peak of the lunge
        switch (this.bossType) {
          case "dark_sorcerer":
            this.attackTornado();
            break;
          case "shadow_beast":
            this.attackPoisonCloud();
            break;
          case "corrupted_knight":
            this.attackIceCrystal();
            break;
          case "giant_golem":
            this.attackEarthquake();
            break;
          default:
            this.attackFireball();
            break;
        }
      },
      onComplete: () => {
        if (!this.alive) return;
        this.boss.x = origBossX;
        this.boss.setBossState("idle");
      },
    });
  }

  private onBossAttackDone(): void {
    // Phase transition handled inside each attack method
  }

  /** Common impact handler — deducts life, checks game over, returns to ready */
  private onAttackImpact(): void {
    if (!this.alive) return;
    this.player.setPlayerState("hurt");
    this.cameras.main.shake(350, 0.02);
    this.flashOverlay.setAlpha(0.35);
    this.tweens.add({ targets: this.flashOverlay, alpha: 0, duration: 500 });

    this.lives = Math.max(0, this.lives - 1);
    eventBus.emit("battle:lives", { lives: this.lives });
    this.floatingText(PLAYER_X + 30, GROUND_Y - 80, "-1 ❤️", "#ff4444");

    if (this.lives <= 0) {
      // Play death animation then emit game over
      this.time.delayedCall(600, () => {
        if (!this.alive) return;
        this.player.setPlayerState("dead");
        this.sound_?.playBossDeath();
      });
      this.time.delayedCall(2000, () => eventBus.emit("battle:gameover", {}));
      return;
    }

    this.time.delayedCall(1200, () => {
      if (!this.alive || this.phase !== "wrong") return;
      this.player.setPlayerState("idle");
      this.phase = "ready";
      eventBus.emit(GameEvents.PHASE_CHANGE, { phase: "ready", bossHp: this.bossHp, maxBossHp: this.maxBossHp });
    });
  }

  // ═══════════════════════════════════════════════════════
  // Universal boss projectile launcher
  // All bosses: animation → projectile flies → hits wizard
  // ═══════════════════════════════════════════════════════

  private launchProjectile(config: {
    coreColor: number;
    outerColor: number;
    glowColor: number;
    trailColors: number[];
    impactColors: number[];
    arcHeight?: number;
    speed?: number;
  }): void {
    const startX = BOSS_X - 50;
    const startY = GROUND_Y - 50;
    const flightDuration = config.speed ?? 600;
    const arcH = config.arcHeight ?? 40;

    // Projectile core
    const core = this.add.circle(startX, startY, 8, config.coreColor, 1);
    core.setDepth(26);

    // Outer layer
    const outer = this.add.circle(startX, startY, 13, config.outerColor, 0.7);
    outer.setDepth(25);

    // Soft glow
    const glow = this.add.circle(startX, startY, 22, config.glowColor, 0.2);
    glow.setDepth(24);

    // Pulsing animation
    this.tweens.add({ targets: core, scaleX: 1.15, scaleY: 0.9, duration: 180, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: outer, scaleX: 1.2, scaleY: 0.85, duration: 220, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // Trail particles
    const trailTimer = this.time.addEvent({
      delay: 20,
      callback: () => {
        if (!core.active) return;
        const c = config.trailColors[Math.floor(Math.random() * config.trailColors.length)];
        const p = this.add.circle(
          core.x + (Math.random() - 0.5) * 10,
          core.y + (Math.random() - 0.5) * 8,
          2 + Math.random() * 3, c, 0.7
        );
        p.setDepth(23);
        this.tweens.add({
          targets: p,
          x: p.x + 8 + Math.random() * 12,
          y: p.y - 4 - Math.random() * 12,
          alpha: 0, scaleX: 0.2, scaleY: 0.2,
          duration: 250 + Math.random() * 150,
          ease: "Quad.easeOut",
          onComplete: () => p.destroy(),
        });
      },
      repeat: -1,
    });

    // Fly along arc from boss to player
    let elapsed = 0;
    const flight = this.time.addEvent({
      delay: 16,
      callback: () => {
        elapsed += 16;
        const t = Math.min(elapsed / flightDuration, 1);
        const eased = t * t;
        const nx = startX + (PLAYER_X - startX) * eased;
        const ny = startY + (GROUND_Y - 30 - startY) * eased - Math.sin(Math.PI * t) * arcH;
        core.setPosition(nx, ny);
        outer.setPosition(nx, ny);
        glow.setPosition(nx, ny);

        if (t >= 1) {
          flight.destroy();
          trailTimer.destroy();
          core.destroy();
          outer.destroy();
          glow.destroy();
          if (!this.alive) return;

          // Impact burst
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
            const dist = 25 + Math.random() * 25;
            const sc = config.impactColors[Math.floor(Math.random() * config.impactColors.length)];
            const spark = this.add.circle(PLAYER_X, GROUND_Y - 30, 2 + Math.random() * 2, sc, 0.9);
            spark.setDepth(27);
            this.tweens.add({
              targets: spark,
              x: PLAYER_X + Math.cos(a) * dist,
              y: GROUND_Y - 30 + Math.sin(a) * dist,
              alpha: 0,
              duration: 300 + Math.random() * 150,
              ease: "Quad.easeOut",
              onComplete: () => spark.destroy(),
            });
          }

          // Impact ring
          const ring = this.add.circle(PLAYER_X, GROUND_Y - 30, 6, config.coreColor, 0.5);
          ring.setDepth(26);
          this.tweens.add({
            targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 300,
            ease: "Quad.easeOut", onComplete: () => ring.destroy(),
          });

          this.cameras.main.shake(400, 0.03);
          this.onAttackImpact();
        }
      },
      repeat: -1,
    });
  }

  // ── Dark Sorcerer: dark magic bolt ──
  private attackTornado(): void {
    this.launchProjectile({
      coreColor: 0xcc88ff,
      outerColor: 0x8844dd,
      glowColor: 0xaa55ff,
      trailColors: [0xaa55ff, 0xcc77ff, 0x8844dd, 0xddaaff],
      impactColors: [0xaa55ff, 0xcc77ff, 0xddaaff],
      arcHeight: 50,
    });
  }

  // ── Shadow Beast: dark shadow projectile ──
  private attackPoisonCloud(): void {
    this.launchProjectile({
      coreColor: 0x444444,
      outerColor: 0x222222,
      glowColor: 0x660066,
      trailColors: [0x553355, 0x442244, 0x663366, 0x331133],
      impactColors: [0x553355, 0x442244, 0x663366],
      speed: 550,
      arcHeight: 30,
    });
  }

  // ── Corrupted Knight: dark energy lance ──
  private attackIceCrystal(): void {
    this.launchProjectile({
      coreColor: 0xaaddff,
      outerColor: 0x4488cc,
      glowColor: 0x3366aa,
      trailColors: [0x88ccff, 0xaaddff, 0x4488cc, 0x66aadd],
      impactColors: [0x88ccff, 0xaaddff, 0x4488cc],
      speed: 500,
      arcHeight: 35,
    });
  }

  // ── Giant Golem: boulder toss ──
  private attackEarthquake(): void {
    this.launchProjectile({
      coreColor: 0x8B7355,
      outerColor: 0x5a3a1a,
      glowColor: 0xaa8855,
      trailColors: [0x8B7355, 0xaa8855, 0xccbb99, 0x5a3a1a],
      impactColors: [0x8B7355, 0xaa8855, 0xccbb99],
      speed: 700,
      arcHeight: 60,
    });
  }

  // ── Default / Dragon: fireball with comet trail ──
  private attackFireball(): void {
    this.launchProjectile({
      coreColor: 0xffee44,
      outerColor: 0xff6600,
      glowColor: 0xff4400,
      trailColors: [0xff6600, 0xffaa00, 0xffcc00, 0xff3300],
      impactColors: [0xff6600, 0xffaa00, 0xffcc00, 0xff3300],
      arcHeight: 40,
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

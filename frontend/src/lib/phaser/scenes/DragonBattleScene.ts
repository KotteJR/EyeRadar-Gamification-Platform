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
interface QuestionData {
  question: string;
  options: string[];
  word?: string;
  displayWord?: string;
  itemIndex?: number;
}

interface ResultData {
  isCorrect: boolean;
  correctAnswer: string;
  pointsEarned: number;
}

type Phase =
  | "idle"
  | "word_show"
  | "throwing"
  | "answering"
  | "waiting_result"
  | "animating"
  | "killing";

// ─── Layout constants ────────────────────────────────────
const PLAYER_X = 130;
const GROUND_Y = GAME_HEIGHT - 70;
const DRAGON_X = GAME_WIDTH - 120;
const DASH_START_X = DRAGON_X - 140;
const STONE_CENTER_X = GAME_WIDTH / 2;
const STONE_CENTER_Y = 140;

// Answer stones: 2x2 grid positioned below main stone
const ANSWER_POSITIONS_4 = [
  { x: STONE_CENTER_X - 120, y: 280 },
  { x: STONE_CENTER_X + 120, y: 280 },
  { x: STONE_CENTER_X - 120, y: 345 },
  { x: STONE_CENTER_X + 120, y: 345 },
];

const ANSWER_POSITIONS_2 = [
  { x: STONE_CENTER_X - 120, y: 310 },
  { x: STONE_CENTER_X + 120, y: 310 },
];

// Answer stone dimensions (wide and short for text readability)
const ANSWER_W = 200;
const ANSWER_H = 48;

// ═══════════════════════════════════════════════════════════
export class DragonBattleScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private dragon!: Phaser.GameObjects.Sprite;
  private background!: ParallaxBackground;
  private flashOverlay!: Phaser.GameObjects.Rectangle;
  private sound_!: SoundManager;

  private mainStone: Phaser.GameObjects.Container | null = null;
  private answerStones: Phaser.GameObjects.Container[] = [];
  private speechContainer: Phaser.GameObjects.Container | null = null;

  private phase: Phase = "idle";
  private lives = 6;
  private bossHp = 1;
  private maxBossHp = 1;
  private worldTheme: WorldTheme = "mountain";
  private pendingQuestion: QuestionData | null = null;
  private currentOptions: string[] = [];
  private currentItemIndex = -1;

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

  // ─── Asset loading (only dragon/stone assets — player/bg already loaded by PreloadScene) ──
  preload(): void {
    // Dragon sprites (PixelLab generated)
    for (let i = 0; i < 4; i++) {
      if (!this.textures.exists(`dragon-idle-${i}`)) {
        this.load.image(
          `dragon-idle-${i}`,
          `/game-assets/dragon-battle/dragon-idle/frame_00${i}.png`
        );
      }
    }
    for (let i = 0; i < 6; i++) {
      if (!this.textures.exists(`dragon-throw-${i}`)) {
        this.load.image(
          `dragon-throw-${i}`,
          `/game-assets/dragon-battle/dragon-throw/frame_00${i}.png`
        );
      }
    }
    if (!this.textures.exists("dragon-static")) {
      this.load.image("dragon-static", "/game-assets/dragon-battle/dragon-static.png");
    }

    // Stones are now drawn procedurally — no sprite assets needed

    // Explosion debris
    if (!this.textures.exists("stone-explosion")) {
      this.load.image("stone-explosion", "/game-assets/dragon-battle/stone-explosion.png");
    }
  }

  // ─── Scene creation ─────────────────────────────────────
  create(): void {
    this.phase = "idle";
    this.destroyed = false;
    this.lives = 6;

    // Background (uses the same parallax system as BattleScene)
    this.background = new ParallaxBackground(this);
    this.background.create(this.worldTheme);

    // Sound
    this.sound_ = new SoundManager(this);

    // Red flash overlay
    this.flashOverlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT, 0xff0000, 0
    );
    this.flashOverlay.setDepth(50);

    // Particle textures
    this.createParticleTextures();

    // Player (left)
    this.player = new PlayerSprite(this, PLAYER_X, GROUND_Y);
    this.player.setDepth(10);
    this.player.setPlayerState("idle");
    this.player.onSlideComplete = () => this.onSlideComplete();

    // Dragon (right) — use PixelLab animated sprite
    this.createDragonAnimations();
    const dragonKey = this.textures.exists("dragon-idle-0") ? "dragon-idle-0" : "dragon-static";
    this.dragon = this.add.sprite(DRAGON_X, GROUND_Y - 16, dragonKey);
    this.dragon.setScale(3);
    this.dragon.setDepth(10);
    if (this.dragon.anims && this.anims.exists("dragon-breathe")) {
      this.dragon.play("dragon-breathe");
    }
    this.addDragonFloat();

    // Event listeners
    this.setupEvents();

    // Tell HUD the initial HP
    eventBus.emit(GameEvents.PHASE_CHANGE, {
      phase: "ready",
      bossHp: this.bossHp,
      maxBossHp: this.maxBossHp,
    });

    // Tell React we're ready for questions
    eventBus.emit("dragon:ready");
  }

  // ─── Create dragon animations from individual frames ───
  private createDragonAnimations(): void {
    if (!this.anims.exists("dragon-breathe")) {
      this.anims.create({
        key: "dragon-breathe",
        frames: [
          { key: "dragon-idle-0" },
          { key: "dragon-idle-1" },
          { key: "dragon-idle-2" },
          { key: "dragon-idle-3" },
        ],
        frameRate: 4,
        repeat: -1,
      });
    }

    if (!this.anims.exists("dragon-throw")) {
      this.anims.create({
        key: "dragon-throw",
        frames: [
          { key: "dragon-throw-0" },
          { key: "dragon-throw-1" },
          { key: "dragon-throw-2" },
          { key: "dragon-throw-3" },
          { key: "dragon-throw-4" },
          { key: "dragon-throw-5" },
        ],
        frameRate: 10,
        repeat: 0,
      });
    }
  }

  // ─── Dragon idle float ──────────────────────────────────
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

  // ─── Event bus listeners ────────────────────────────────
  private setupEvents(): void {
    this.cleanupEvents();

    this.unsubs.push(
      eventBus.on("dragon:question", (data) => {
        this.onNewQuestion(data as QuestionData);
      }),
      eventBus.on("dragon:result", (data) => {
        this.onResult(data as ResultData);
      }),
      // Also listen for ANSWER_RESULT from React overlays (e.g., sequence_tap)
      // so bossHp still decrements even when stones aren't handling the question
      eventBus.on(GameEvents.ANSWER_RESULT, (data) => {
        this.onOverlayResult(data as ResultData);
      })
    );
  }

  private cleanupEvents(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
  }

  // ═══════════════════════════════════════════════════════════
  // QUESTION FLOW
  // ═══════════════════════════════════════════════════════════

  private onNewQuestion(data: QuestionData): void {
    if (!this.alive) return;

    const isNewItem =
      data.itemIndex !== undefined && data.itemIndex !== this.currentItemIndex;

    if (isNewItem) {
      // New exercise item — force-clear any stale state from previous item
      this.tweens.killAll();
      this.cleanupStones();
      this.removeSpeechBubble();
      this.pendingQuestion = null;
      this.phase = "idle";
      this.currentItemIndex = data.itemIndex!;
      // Restore dragon idle state
      if (this.dragon && this.dragon.active) {
        this.dragon.setAlpha(1);
        this.dragon.setVisible(true);
        this.dragon.y = GROUND_Y - 16;
        if (this.dragon.anims && this.anims.exists("dragon-breathe")) {
          this.dragon.play("dragon-breathe");
        }
        this.addDragonFloat();
      }
      this.player.setPlayerState("idle");
    }

    if (this.phase !== "idle") {
      // Same item, different phase (e.g. recall after math) — queue it
      this.pendingQuestion = data;
      return;
    }

    if (data.itemIndex !== undefined) {
      this.currentItemIndex = data.itemIndex;
    }
    this.startQuestion(data);
  }

  private startQuestion(data: QuestionData): void {
    if (!this.alive) return;
    this.cleanupStones();
    this.removeSpeechBubble();
    this.currentOptions = data.options || [];
    this.player.setPlayerState("idle");

    if (data.word) {
      this.phase = "word_show";
      this.showWordBubble(data.word);
      this.time.delayedCall(2500, () => {
        if (!this.alive) return;
        this.removeSpeechBubble();
        this.dragonThrow(data.question, data.options, data.displayWord);
      });
    } else {
      this.dragonThrow(data.question, data.options, data.displayWord);
    }
  }

  // ─── Word display ───────────────────────────────────────
  private showWordBubble(word: string): void {
    if (!this.alive) return;
    this.speechContainer = this.createSpeechBubble(
      DRAGON_X - 60,
      GROUND_Y - 130,
      "Remember this word:",
      word
    );
  }

  private removeSpeechBubble(): void {
    if (this.speechContainer) {
      this.speechContainer.destroy();
      this.speechContainer = null;
    }
  }

  // ─── Dragon throws stone ────────────────────────────────
  private dragonThrow(question: string, options: string[], displayWord?: string): void {
    if (!this.alive) return;
    if (!this.dragon || !this.dragon.anims) return;
    this.phase = "throwing";

    // Stop floating and play throw animation
    this.tweens.killTweensOf(this.dragon);
    const origY = GROUND_Y - 16;
    this.dragon.y = origY;

    // Play throwing animation (safe check for animation existence)
    if (this.anims.exists("dragon-throw")) {
      this.dragon.play("dragon-throw");
    }

    // Dragon lunge forward during throw
    const origX = this.dragon.x;
    this.tweens.add({
      targets: this.dragon,
      x: origX - 50,
      duration: 250,
      ease: "Power2",
      yoyo: true,
      onComplete: () => {
        if (!this.alive || !this.dragon?.anims) return;
        // Return to idle breathing after throw finishes
        if (this.anims.exists("dragon-breathe")) {
          this.dragon.play("dragon-breathe");
        }
        this.addDragonFloat();
      },
    });

    // Create main stone at dragon position and fly to center
    this.time.delayedCall(180, () => {
      if (!this.alive) return;
      this.createAndThrowMainStone(question, options, displayWord);
    });
  }

  // ─── Main stone (drawn procedurally — wide, readable) ────
  private createAndThrowMainStone(
    question: string,
    options: string[],
    displayWord?: string
  ): void {
    const container = this.add.container(DRAGON_X - 80, GROUND_Y - 30);
    container.setDepth(20);
    container.setScale(0.3);

    const hasDisplay = displayWord && displayWord.length > 0;
    const stoneW = 320;
    const stoneH = hasDisplay ? 100 : 72;

    // Draw a wide rounded stone panel
    const bg = this.add.graphics();
    // Outer glow
    bg.fillStyle(0x2a1f14, 0.5);
    bg.fillRoundedRect(-stoneW / 2 - 4, -stoneH / 2 - 4, stoneW + 8, stoneH + 8, 18);
    // Main stone body (dark medieval brown)
    bg.fillStyle(0x3d2b1f, 1);
    bg.fillRoundedRect(-stoneW / 2, -stoneH / 2, stoneW, stoneH, 14);
    // Inner lighter area
    bg.fillStyle(0x5a4230, 0.8);
    bg.fillRoundedRect(-stoneW / 2 + 4, -stoneH / 2 + 4, stoneW - 8, stoneH - 8, 12);
    // Top highlight
    bg.fillStyle(0x7a6245, 0.4);
    bg.fillRoundedRect(-stoneW / 2 + 8, -stoneH / 2 + 4, stoneW - 16, 6, 3);
    // Border
    bg.lineStyle(2, 0xb8943d, 0.7);
    bg.strokeRoundedRect(-stoneW / 2, -stoneH / 2, stoneW, stoneH, 14);
    container.add(bg);

    // Question text — white with black stroke
    const questionY = hasDisplay ? -14 : 0;
    const txt = this.add.text(0, questionY, question, {
      fontSize: "18px",
      color: "#ffffff",
      fontFamily: "Fredoka, sans-serif",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
      wordWrap: { width: stoneW - 30 },
    });
    txt.setOrigin(0.5);
    container.add(txt);

    // Display word prominently (golden, below question)
    if (hasDisplay) {
      const wordTxt = this.add.text(0, 22, displayWord, {
        fontSize: "26px",
        color: "#ffe066",
        fontFamily: "Fredoka, sans-serif",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 5,
        align: "center",
      });
      wordTxt.setOrigin(0.5);
      container.add(wordTxt);
    }

    this.mainStone = container;

    // Fly to center
    this.tweens.add({
      targets: container,
      x: STONE_CENTER_X,
      y: STONE_CENTER_Y,
      scaleX: 1,
      scaleY: 1,
      duration: 650,
      ease: "Power2",
      onUpdate: () => {
        container.setRotation(
          Phaser.Math.DegToRad(Phaser.Math.Linear(-10, 0, container.scaleX))
        );
      },
      onComplete: () => {
        if (!this.alive) return;
        container.setRotation(0);
        this.cameras.main.shake(120, 0.006);
        this.stoneBreakParticles(STONE_CENTER_X, STONE_CENTER_Y);

        this.time.delayedCall(300, () => {
          if (!this.alive) return;
          this.showAnswerStones(options);
        });
      },
    });
  }

  /** Small rock debris to sell the "break-off" effect */
  private stoneBreakParticles(x: number, y: number): void {
    if (!this.alive) return;
    const shards = this.add.particles(x, y, "p-shard", {
      speed: { min: 40, max: 140 },
      angle: { min: 180, max: 360 },
      lifespan: 450,
      quantity: 10,
      scale: { start: 1.5, end: 0.3 },
      rotate: { min: 0, max: 360 },
      tint: [0x888888, 0x666666, 0x999999],
      emitting: false,
    });
    shards.setDepth(21);
    shards.explode(10);
    this.time.delayedCall(600, () => {
      if (shards.active) shards.destroy();
    });
  }

  // ─── Answer stones (drawn as wide HUD-like buttons) ─────
  private showAnswerStones(options: string[]): void {
    if (!this.alive) return;
    this.phase = "answering";

    const positions =
      options.length <= 2 ? ANSWER_POSITIONS_2 : ANSWER_POSITIONS_4;
    const startX = STONE_CENTER_X;
    const startY = STONE_CENTER_Y;

    options.forEach((opt, i) => {
      const pos = positions[i % positions.length];

      const container = this.add.container(startX, startY);
      container.setDepth(22);
      container.setScale(0.15);
      container.setAlpha(0);

      // Draw answer stone as a wide rounded button
      const bg = this.add.graphics();
      // Stone body
      bg.fillStyle(0x4a3828, 1);
      bg.fillRoundedRect(-ANSWER_W / 2, -ANSWER_H / 2, ANSWER_W, ANSWER_H, 12);
      // Inner lighter fill
      bg.fillStyle(0x6b5340, 0.8);
      bg.fillRoundedRect(-ANSWER_W / 2 + 3, -ANSWER_H / 2 + 3, ANSWER_W - 6, ANSWER_H - 6, 10);
      // Top edge highlight
      bg.fillStyle(0x8a7050, 0.5);
      bg.fillRoundedRect(-ANSWER_W / 2 + 6, -ANSWER_H / 2 + 3, ANSWER_W - 12, 4, 2);
      // Border
      bg.lineStyle(2, 0xb8943d, 0.6);
      bg.strokeRoundedRect(-ANSWER_W / 2, -ANSWER_H / 2, ANSWER_W, ANSWER_H, 12);
      container.add(bg);

      // Answer text — white, centered, readable
      const label = this.add.text(0, 0, opt, {
        fontSize: "16px",
        color: "#ffffff",
        fontFamily: "Fredoka, sans-serif",
        stroke: "#000000",
        strokeThickness: 3,
        align: "center",
        wordWrap: { width: ANSWER_W - 20 },
      });
      label.setOrigin(0.5);
      container.add(label);

      // Make interactive
      container.setSize(ANSWER_W, ANSWER_H);
      container.setInteractive({ useHandCursor: true });

      container.on("pointerover", () => {
        if (this.phase !== "answering") return;
        this.tweens.add({ targets: container, scaleX: 1.08, scaleY: 1.08, duration: 80 });
        // Golden highlight on hover
        bg.clear();
        bg.fillStyle(0x5a4830, 1);
        bg.fillRoundedRect(-ANSWER_W / 2, -ANSWER_H / 2, ANSWER_W, ANSWER_H, 12);
        bg.fillStyle(0x8a7050, 0.9);
        bg.fillRoundedRect(-ANSWER_W / 2 + 3, -ANSWER_H / 2 + 3, ANSWER_W - 6, ANSWER_H - 6, 10);
        bg.fillStyle(0xa09060, 0.5);
        bg.fillRoundedRect(-ANSWER_W / 2 + 6, -ANSWER_H / 2 + 3, ANSWER_W - 12, 4, 2);
        bg.lineStyle(2, 0xffd700, 0.8);
        bg.strokeRoundedRect(-ANSWER_W / 2, -ANSWER_H / 2, ANSWER_W, ANSWER_H, 12);
      });

      container.on("pointerout", () => {
        if (this.phase !== "answering") return;
        this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 80 });
        // Reset to normal style
        bg.clear();
        bg.fillStyle(0x4a3828, 1);
        bg.fillRoundedRect(-ANSWER_W / 2, -ANSWER_H / 2, ANSWER_W, ANSWER_H, 12);
        bg.fillStyle(0x6b5340, 0.8);
        bg.fillRoundedRect(-ANSWER_W / 2 + 3, -ANSWER_H / 2 + 3, ANSWER_W - 6, ANSWER_H - 6, 10);
        bg.fillStyle(0x8a7050, 0.5);
        bg.fillRoundedRect(-ANSWER_W / 2 + 6, -ANSWER_H / 2 + 3, ANSWER_W - 12, 4, 2);
        bg.lineStyle(2, 0xb8943d, 0.6);
        bg.strokeRoundedRect(-ANSWER_W / 2, -ANSWER_H / 2, ANSWER_W, ANSWER_H, 12);
      });

      container.on("pointerdown", () => {
        if (this.phase !== "answering") return;
        this.onStoneClicked(opt, i);
      });

      this.answerStones.push(container);

      // Break off from main stone — start at center, fly outward
      this.tweens.add({
        targets: container,
        x: pos.x,
        y: pos.y,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 400,
        delay: i * 90,
        ease: "Back.easeOut",
        onComplete: () => {
          if (!this.alive) return;
          this.tweens.add({
            targets: container,
            y: pos.y - 4,
            duration: 900 + i * 150,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
        },
      });
    });
  }

  // ─── Stone click handler ────────────────────────────────
  private onStoneClicked(answer: string, index: number): void {
    if (this.phase !== "answering") return;
    this.phase = "waiting_result";

    // Disable all interactivity
    this.answerStones.forEach((s) => s.disableInteractive());

    // Brief flash on clicked stone
    const clicked = this.answerStones[index];
    if (clicked) {
      this.tweens.add({
        targets: clicked,
        scaleX: 1.18,
        scaleY: 1.18,
        duration: 100,
        yoyo: true,
      });
    }

    // Tell React the answer
    eventBus.emit("dragon:submit", { answer });
  }

  // ═══════════════════════════════════════════════════════════
  // RESULT HANDLING
  // ═══════════════════════════════════════════════════════════

  // Called from React overlays (sequence_tap etc.) — silently track bossHp
  private onOverlayResult(data: ResultData): void {
    if (!this.alive) return;
    // Only process when scene is idle (no active stone question)
    if (this.phase !== "idle") return;

    if (data.isCorrect) {
      this.bossHp = Math.max(0, this.bossHp - 1);
      eventBus.emit(GameEvents.PHASE_CHANGE, {
        phase: "correct",
        bossHp: this.bossHp,
        maxBossHp: this.maxBossHp,
      });

      // If boss killed, trigger kill animation
      if (this.bossHp <= 0) {
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
        this.cameras.main.shake(300, 0.015);
        this.cameras.main.flash(200, 255, 255, 255);
        this.time.delayedCall(800, () => this.startKillRun());
      }
    }
  }

  // Called from stones — full result handling with animations
  private onResult(data: ResultData): void {
    if (!this.alive) return;
    if (this.phase !== "waiting_result") return;
    this.phase = "animating";

    if (data.isCorrect) {
      this.playCorrect(data);
    } else {
      this.playWrong(data);
    }
  }

  // ─── CORRECT: explode all stones ────────────────────────
  private playCorrect(data: ResultData): void {
    this.sound_?.playCorrect();
    this.bossHp = Math.max(0, this.bossHp - 1);

    // Tell HUD
    eventBus.emit(GameEvents.PHASE_CHANGE, {
      phase: "correct",
      bossHp: this.bossHp,
      maxBossHp: this.maxBossHp,
    });

    // Highlight correct answer stone green
    const correctIdx = this.currentOptions.indexOf(data.correctAnswer);
    if (correctIdx >= 0 && this.answerStones[correctIdx]) {
      const stone = this.answerStones[correctIdx];
      this.tweens.add({
        targets: stone,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 150,
      });
    }

    // After brief highlight, explode everything
    this.time.delayedCall(300, () => {
      if (!this.alive) return;

      // Explode main stone
      if (this.mainStone) {
        this.stoneExplosion(this.mainStone.x, this.mainStone.y, 0x6b5d4f);
        this.mainStone.destroy();
        this.mainStone = null;
      }

      // Explode answer stones
      this.answerStones.forEach((stone, i) => {
        this.time.delayedCall(i * 60, () => {
          if (!stone.active) return;
          this.stoneExplosion(stone.x, stone.y, 0x777777);
          stone.destroy();
        });
      });
      this.answerStones = [];

      // Camera effect
      this.cameras.main.shake(250, 0.012);

      // Points popup
      if (data.pointsEarned > 0) {
        this.floatingText(
          STONE_CENTER_X,
          STONE_CENTER_Y,
          `+${data.pointsEarned}`,
          "#ffdd00"
        );
      }

      // Check for boss killed
      if (this.bossHp <= 0) {
        // FINAL KILL — dragon dies, wizard runs and slides
        this.cameras.main.shake(300, 0.015);
        this.cameras.main.flash(200, 255, 255, 255);
        this.sound_?.playBossDeath();

        // Stop dragon animations and make it "die"
        if (this.dragon) {
          this.tweens.killTweensOf(this.dragon);
          this.tweens.add({
            targets: this.dragon,
            alpha: 0,
            y: this.dragon.y + 30,
            scaleX: 2.5,
            scaleY: 2.5,
            duration: 800,
            ease: "Power2",
          });
        }
        this.spawnBigExplosion(DRAGON_X, GROUND_Y);

        // After explosion, start kill run
        this.time.delayedCall(800, () => this.startKillRun());
      } else {
        // Player celebrates, normal round
        this.player.setPlayerState("celebrating");
        this.time.delayedCall(1200, () => this.finishRound());
      }
    });
  }

  // ─── WRONG: stone continues to wizard ───────────────────
  private playWrong(data: ResultData): void {
    this.sound_?.playIncorrect();

    // Tell HUD
    eventBus.emit(GameEvents.PHASE_CHANGE, {
      phase: "incorrect",
      bossHp: this.bossHp,
      maxBossHp: this.maxBossHp,
    });

    // Highlight the correct answer green
    const correctIdx = this.currentOptions.indexOf(data.correctAnswer);
    if (correctIdx >= 0 && this.answerStones[correctIdx]) {
      const correctStone = this.answerStones[correctIdx];
      this.tweens.add({
        targets: correctStone,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 150,
      });
    }

    // Fade out answer stones
    this.answerStones.forEach((stone, i) => {
      this.tweens.add({
        targets: stone,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 300,
        delay: i === correctIdx ? 800 : 200,
        onComplete: () => {
          if (stone.active) stone.destroy();
        },
      });
    });

    // After showing correct answer, main stone flies to wizard
    this.time.delayedCall(900, () => {
      if (!this.alive || !this.mainStone) return;

      this.tweens.add({
        targets: this.mainStone,
        x: PLAYER_X - 20,
        y: GROUND_Y - 40,
        scaleX: 0.7,
        scaleY: 0.7,
        rotation: Phaser.Math.DegToRad(-25),
        duration: 500,
        ease: "Quad.easeIn",
        onComplete: () => {
          if (!this.alive) return;

          // Impact on wizard — explosion with stone debris sprite
          this.stoneExplosion(PLAYER_X, GROUND_Y - 30, 0x6b5d4f);

          // Show stone-explosion sprite at impact
          if (this.textures.exists("stone-explosion")) {
            const explosionImg = this.add.image(PLAYER_X, GROUND_Y - 30, "stone-explosion");
            explosionImg.setScale(2.5);
            explosionImg.setDepth(35);
            explosionImg.setAlpha(0.9);
            this.tweens.add({
              targets: explosionImg,
              alpha: 0,
              scaleX: 4,
              scaleY: 4,
              duration: 500,
              ease: "Power2",
              onComplete: () => explosionImg.destroy(),
            });
          }

          if (this.mainStone) {
            this.mainStone.destroy();
            this.mainStone = null;
          }

          // Wizard hurt
          this.player.setPlayerState("hurt");

          // Camera shake + red flash
          this.cameras.main.shake(350, 0.02);
          this.flashOverlay.setAlpha(0.35);
          this.tweens.add({
            targets: this.flashOverlay,
            alpha: 0,
            duration: 500,
          });

          // Lose life
          this.lives = Math.max(0, this.lives - 1);
          eventBus.emit("dragon:lives", { lives: this.lives });

          // Floating damage text
          this.floatingText(PLAYER_X + 30, GROUND_Y - 80, "-1 ❤️", "#ff4444");

          this.time.delayedCall(1400, () => this.finishRound());
        },
      });
    });
  }

  // ─── End of round ───────────────────────────────────────
  private finishRound(): void {
    if (!this.alive) return;

    this.cleanupStones();
    this.player.setPlayerState("idle");
    this.phase = "idle";

    // Tell HUD we're ready for next question
    eventBus.emit(GameEvents.PHASE_CHANGE, {
      phase: "ready",
      bossHp: this.bossHp,
      maxBossHp: this.maxBossHp,
    });

    // Process queued question
    if (this.pendingQuestion) {
      const q = this.pendingQuestion;
      this.pendingQuestion = null;
      this.time.delayedCall(400, () => this.startQuestion(q));
    }
  }

  // ═══════════════════════════════════════════════════════════
  // FINAL KILL: run to dragon → slide → explode → game over
  // ═══════════════════════════════════════════════════════════

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
        if (!this.alive) return;
        // Dash slide into dragon
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

    // Final explosion at dragon position
    this.spawnBigExplosion(DRAGON_X, GROUND_Y);
    this.cameras.main.shake(400, 0.02);
    this.cameras.main.flash(300, 255, 255, 255);

    // Hide dragon completely
    if (this.dragon) {
      this.dragon.setVisible(false);
    }

    this.player.setPlayerState("celebrating");
    this.phase = "idle";

    // Tell React the game is over
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
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture("p-circle", 8, 8);
      g.destroy();
    }
    if (!this.textures.exists("p-shard")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 8, 4);
      g.generateTexture("p-shard", 8, 4);
      g.destroy();
    }
    if (!this.textures.exists("p-spark")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(2, 2, 2);
      g.generateTexture("p-spark", 4, 4);
      g.destroy();
    }
  }

  private stoneExplosion(x: number, y: number, tint: number): void {
    if (!this.alive) return;

    // Rock shards
    const shards = this.add.particles(x, y, "p-shard", {
      speed: { min: 80, max: 250 },
      angle: { min: 0, max: 360 },
      lifespan: 600,
      quantity: 20,
      scale: { start: 2, end: 0.3 },
      rotate: { min: 0, max: 360 },
      tint: [tint, 0x888888, 0x555555],
      emitting: false,
    });
    shards.setDepth(30);
    shards.explode(20);

    // Dust puff
    const dust = this.add.particles(x, y, "p-circle", {
      speed: { min: 30, max: 120 },
      angle: { min: 0, max: 360 },
      lifespan: 500,
      quantity: 14,
      scale: { start: 1.5, end: 0 },
      tint: [0xccbbaa, 0xddccbb, 0xffffff],
      alpha: { start: 0.7, end: 0 },
      emitting: false,
    });
    dust.setDepth(29);
    dust.explode(14);

    // Sparks
    const sparks = this.add.particles(x, y, "p-spark", {
      speed: { min: 50, max: 200 },
      angle: { min: 200, max: 340 },
      lifespan: 400,
      quantity: 8,
      scale: { start: 1.2, end: 0 },
      gravityY: 300,
      tint: [0xffdd44, 0xffffff],
      blendMode: "ADD",
      emitting: false,
    });
    sparks.setDepth(31);
    sparks.explode(8);

    this.time.delayedCall(800, () => {
      if (shards.active) shards.destroy();
      if (dust.active) dust.destroy();
      if (sparks.active) sparks.destroy();
    });
  }

  private spawnBigExplosion(x: number, y: number): void {
    if (!this.alive) return;

    const core = this.add.particles(x, y, "p-circle", {
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

    const debris = this.add.particles(x, y, "p-shard", {
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

    const sparks2 = this.add.particles(x, y, "p-spark", {
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
    sparks2.setDepth(54);
    sparks2.explode(20);

    this.time.delayedCall(1200, () => {
      if (core.active) core.destroy();
      if (debris.active) debris.destroy();
      if (sparks2.active) sparks2.destroy();
    });
  }

  private createSpeechBubble(
    x: number,
    y: number,
    text: string,
    subtext?: string
  ): Phaser.GameObjects.Container | null {
    if (!this.alive) return null;
    const container = this.add.container(x, y);
    container.setDepth(25);

    const padding = 16;
    const maxW = 260;

    const mainText = this.add.text(0, 0, text, {
      fontSize: "14px",
      color: "#444444",
      fontFamily: "Fredoka, sans-serif",
      align: "center",
      wordWrap: { width: maxW - padding * 2 },
    });
    mainText.setOrigin(0.5, 0.5);

    let subObj: Phaser.GameObjects.Text | null = null;
    const totalH = mainText.height + (subtext ? 32 : 0) + padding * 2;
    const totalW = Math.max(mainText.width + padding * 2, 160);

    if (subtext) {
      mainText.setY(-totalH / 2 + padding + mainText.height / 2);
      subObj = this.add.text(0, mainText.y + mainText.height / 2 + 18, subtext, {
        fontSize: "26px",
        color: "#475093",
        fontFamily: "Fredoka, sans-serif",
        fontStyle: "bold",
        align: "center",
      });
      subObj.setOrigin(0.5, 0.5);
    }

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(-totalW / 2, -totalH / 2, totalW, totalH, 12);
    bg.lineStyle(2, 0x888888, 0.4);
    bg.strokeRoundedRect(-totalW / 2, -totalH / 2, totalW, totalH, 12);
    bg.fillStyle(0xffffff, 0.95);
    bg.fillTriangle(-8, totalH / 2, 8, totalH / 2, 0, totalH / 2 + 14);

    container.add(bg);
    container.add(mainText);
    if (subObj) container.add(subObj);

    // Animate in
    container.setScale(0);
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 250,
      ease: "Back.easeOut",
    });

    return container;
  }

  private floatingText(
    x: number,
    y: number,
    text: string,
    color: string
  ): void {
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
        duration: 1200,
        ease: "Power2",
        onComplete: () => t.destroy(),
      });
    } catch {
      // Scene destroyed mid-call
    }
  }

  // ─── Cleanup ────────────────────────────────────────────
  private cleanupStones(): void {
    if (this.mainStone && this.mainStone.active) {
      this.mainStone.destroy();
    }
    this.mainStone = null;

    this.answerStones.forEach((s) => {
      if (s.active) s.destroy();
    });
    this.answerStones = [];
  }

  shutdown(): void {
    this.destroyed = true;
    this.cleanupEvents();
    this.cleanupStones();
    this.removeSpeechBubble();
    this.background?.destroy();
    this.sound_?.destroy();
  }
}

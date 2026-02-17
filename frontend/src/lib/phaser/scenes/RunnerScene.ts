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

type RunnerPhase =
  | "running"
  | "answering"
  | "correct"
  | "incorrect"
  | "complete";

const PLAYER_X = 180;
const PLAYER_Y = GAME_HEIGHT - 80;
const BOSS_X = GAME_WIDTH - 140;
const BOSS_Y = GAME_HEIGHT - 80;
const SCROLL_SPEED = 2;

export class RunnerScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private boss!: BossSprite;
  private background!: ParallaxBackground;
  private phase: RunnerPhase = "running";

  private bossType: BossType = "shadow_beast";
  private worldTheme: WorldTheme = "grassland";
  private scrollOffset = 0;
  private autoScrolling = false;

  // Timer
  private timerText!: Phaser.GameObjects.Text;
  private timerBar!: Phaser.GameObjects.Rectangle;
  private timerBarBg!: Phaser.GameObjects.Rectangle;
  private timeLimit = 10;
  private timeRemaining = 10;
  private timerEvent: Phaser.Time.TimerEvent | null = null;

  private unsubs: Array<() => void> = [];
  private flashOverlay!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: "RunnerScene" });
  }

  init(data: unknown): void {
    const levelData = data as Partial<LevelStartPayload>;
    if (levelData?.worldTheme)
      this.worldTheme = levelData.worldTheme as WorldTheme;
    if (levelData?.bossType)
      this.bossType = levelData.bossType as BossType;
  }

  create(): void {
    this.phase = "running";
    this.scrollOffset = 0;

    // Background
    this.background = new ParallaxBackground(this);
    this.background.create(this.worldTheme);

    // Flash overlay
    this.flashOverlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0xff0000,
      0
    );
    this.flashOverlay.setDepth(50);

    // Player
    this.player = new PlayerSprite(this, PLAYER_X, PLAYER_Y);
    this.player.setDepth(10);
    this.player.setPlayerState("running");

    // Boss (starts off-screen)
    this.boss = new BossSprite(
      this,
      GAME_WIDTH + 100,
      BOSS_Y,
      this.bossType
    );
    this.boss.setDepth(10);
    this.boss.setVisible(false);

    // Timer UI
    this.timerBarBg = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 20,
      GAME_WIDTH - 40,
      8,
      0x000000,
      0.3
    );
    this.timerBarBg.setDepth(40);
    this.timerBarBg.setVisible(false);

    this.timerBar = this.add.rectangle(
      20,
      GAME_HEIGHT - 20,
      GAME_WIDTH - 40,
      8,
      0x44ff44,
      1
    );
    this.timerBar.setOrigin(0, 0.5);
    this.timerBar.setDepth(41);
    this.timerBar.setVisible(false);

    this.timerText = this.add.text(GAME_WIDTH - 30, GAME_HEIGHT - 35, "", {
      fontSize: "14px",
      color: "#ffffff",
      fontFamily: "Fredoka, sans-serif",
      stroke: "#000000",
      strokeThickness: 2,
    });
    this.timerText.setOrigin(1, 0.5);
    this.timerText.setDepth(42);
    this.timerText.setVisible(false);

    // Boss callbacks
    this.boss.onDeathComplete = () => {
      this.onBossDefeated();
    };
    this.boss.onAttackComplete = () => {
      this.onBossAttackDone();
    };

    // Start auto-scrolling, then bring in boss
    this.autoScrolling = true;
    this.time.delayedCall(800, () => {
      this.bringInBoss();
    });

    // Event listeners
    this.setupEvents();
  }

  update(_time: number, delta: number): void {
    if (this.autoScrolling) {
      this.scrollOffset += SCROLL_SPEED;
      this.background.scrollLayers(SCROLL_SPEED);
    }

    // Update timer bar
    if (this.phase === "answering" && this.timeRemaining > 0) {
      const pct = this.timeRemaining / this.timeLimit;
      this.timerBar.width = (GAME_WIDTH - 40) * pct;

      const color =
        pct > 0.5 ? 0x44ff44 : pct > 0.2 ? 0xffaa00 : 0xff4444;
      this.timerBar.setFillStyle(color, 1);
      this.timerText.setText(`${Math.ceil(this.timeRemaining)}s`);
    }
  }

  private setupEvents(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];

    this.unsubs.push(
      eventBus.on(GameEvents.ANSWER_RESULT, (detail) => {
        const result = detail as AnswerResultPayload;
        this.handleAnswer(result);
      })
    );

    this.unsubs.push(
      eventBus.on(GameEvents.LEVEL_START, (detail) => {
        const d = detail as LevelStartPayload;
        if (d.bossType) this.bossType = d.bossType as BossType;
        if (d.worldTheme) {
          this.worldTheme = d.worldTheme as WorldTheme;
          this.background.create(this.worldTheme);
        }
        this.restartRun();
      })
    );
  }

  private bringInBoss(): void {
    this.autoScrolling = false;
    this.player.setPlayerState("idle");
    this.boss.setVisible(true);
    this.boss.x = GAME_WIDTH + 100;
    this.boss.changeBossType(this.bossType);

    this.tweens.add({
      targets: this.boss,
      x: BOSS_X,
      duration: 600,
      ease: "Power2",
      onComplete: () => {
        this.startAnswering();
      },
    });
  }

  private startAnswering(): void {
    this.phase = "answering";
    this.timeRemaining = this.timeLimit;

    // Show timer
    this.timerBarBg.setVisible(true);
    this.timerBar.setVisible(true);
    this.timerText.setVisible(true);

    // Start countdown
    this.timerEvent = this.time.addEvent({
      delay: 100,
      callback: () => {
        this.timeRemaining -= 0.1;
        if (this.timeRemaining <= 0) {
          this.timeRemaining = 0;
          this.timerEvent?.destroy();
          // Time's up - send timeout
          eventBus.emit(GameEvents.REQUEST_SUBMIT, {
            answer: "__timeout__",
          });
        }
      },
      loop: true,
    });

    // Tell React to show question
    eventBus.emit(GameEvents.QUESTION_READY, { questionIndex: 0 });
    eventBus.emit(GameEvents.PHASE_CHANGE, {
      phase: "answering",
      bossHp: 1,
      maxBossHp: 1,
    });
  }

  private handleAnswer(result: AnswerResultPayload): void {
    if (this.phase !== "answering") return;
    this.timerEvent?.destroy();
    this.timerBarBg.setVisible(false);
    this.timerBar.setVisible(false);
    this.timerText.setVisible(false);

    if (result.isCorrect) {
      this.phase = "correct";
      this.player.setPlayerState("sliding");
      this.boss.setBossState("dying");

      if (result.pointsEarned > 0) {
        this.showPointsText(PLAYER_X + 30, PLAYER_Y - 80, `+${result.pointsEarned}`);
      }

      eventBus.emit(GameEvents.PHASE_CHANGE, {
        phase: "correct",
        bossHp: 0,
        maxBossHp: 1,
      });
    } else {
      this.phase = "incorrect";
      this.player.setPlayerState("hurt");
      this.boss.setBossState("attacking");

      this.flashOverlay.setAlpha(0.4);
      this.tweens.add({
        targets: this.flashOverlay,
        alpha: 0,
        duration: 400,
      });

      eventBus.emit(GameEvents.PHASE_CHANGE, {
        phase: "incorrect",
        bossHp: 1,
        maxBossHp: 1,
      });
    }
  }

  private onBossDefeated(): void {
    this.autoScrolling = true;
    this.player.setPlayerState("running");

    // Boss slides off screen
    this.tweens.add({
      targets: this.boss,
      x: GAME_WIDTH + 200,
      alpha: 0,
      duration: 500,
    });

    // After scrolling a bit, bring new boss
    this.time.delayedCall(1500, () => {
      this.bringInBoss();
    });
  }

  private onBossAttackDone(): void {
    this.time.delayedCall(400, () => {
      this.phase = "answering";
      this.player.setPlayerState("idle");
      this.startAnswering();
    });
  }

  private restartRun(): void {
    this.player.x = PLAYER_X;
    this.player.setPlayerState("running");
    this.autoScrolling = true;
    this.boss.setVisible(false);

    this.time.delayedCall(800, () => {
      this.bringInBoss();
    });
  }

  private showPointsText(x: number, y: number, text: string): void {
    const pts = this.add.text(x, y, text, {
      fontSize: "22px",
      color: "#ffdd00",
      fontFamily: "Fredoka, sans-serif",
      stroke: "#000000",
      strokeThickness: 3,
    });
    pts.setOrigin(0.5);
    pts.setDepth(60);

    this.tweens.add({
      targets: pts,
      y: y - 50,
      alpha: 0,
      duration: 1200,
      ease: "Power2",
      onComplete: () => pts.destroy(),
    });
  }

  shutdown(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.timerEvent?.destroy();
    this.background?.destroy();
  }
}

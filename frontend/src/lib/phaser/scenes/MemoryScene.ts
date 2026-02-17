import Phaser from "phaser";
import {
  eventBus,
  GameEvents,
  type AnswerResultPayload,
  type LevelStartPayload,
} from "../EventBus";
import { BossSprite } from "../sprites/BossSprite";
import { PlayerSprite } from "../sprites/PlayerSprite";
import { ParallaxBackground } from "../utils/ParallaxBackground";
import type { BossType } from "@/lib/boss-config";
import type { WorldTheme } from "@/lib/level-config";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";

type MemoryPhase = "show" | "play" | "result";

const GRID_SIZE = 4;
const CELL_SIZE = 56;
const CELL_GAP = 6;

export class MemoryScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private boss!: BossSprite;
  private background!: ParallaxBackground;

  private phase: MemoryPhase = "show";
  private bossType: BossType = "giant_golem";
  private worldTheme: WorldTheme = "mountain";

  private gridCells: Phaser.GameObjects.Rectangle[] = [];
  private pattern: number[] = [];
  private selected: Set<number> = new Set();
  private gridContainer!: Phaser.GameObjects.Container;

  private unsubs: Array<() => void> = [];
  private flashOverlay!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: "MemoryScene" });
  }

  init(data: unknown): void {
    const d = data as Partial<LevelStartPayload>;
    if (d?.worldTheme) this.worldTheme = d.worldTheme as WorldTheme;
    if (d?.bossType) this.bossType = d.bossType as BossType;
  }

  create(): void {
    this.phase = "show";
    this.selected = new Set();

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

    // Player (small, on the left)
    this.player = new PlayerSprite(this, 80, GAME_HEIGHT - 80);
    this.player.setDepth(10);
    this.player.setPlayerState("idle");

    // Boss (on the right)
    this.boss = new BossSprite(
      this,
      GAME_WIDTH - 120,
      GAME_HEIGHT - 80,
      this.bossType
    );
    this.boss.setDepth(10);

    this.boss.onDeathComplete = () => {
      this.player.setPlayerState("celebrating");
    };

    // Create grid
    this.createGrid();

    // Setup events
    this.setupEvents();

    // Receive pattern from question data
    const questionData = this.registry.get("currentQuestion");
    if (questionData?.extraData?.pattern) {
      this.pattern = questionData.extraData.pattern as number[];
    } else {
      // Default random pattern
      this.pattern = this.generateRandomPattern(5);
    }

    // Show the pattern
    this.showPattern();
  }

  private createGrid(): void {
    const totalSize =
      GRID_SIZE * CELL_SIZE + (GRID_SIZE - 1) * CELL_GAP;
    const startX = GAME_WIDTH / 2 - totalSize / 2;
    const startY = GAME_HEIGHT / 2 - totalSize / 2 - 20;

    this.gridContainer = this.add.container(0, 0);
    this.gridContainer.setDepth(20);
    this.gridCells = [];

    // Grid background panel
    const panel = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 20,
      totalSize + 24,
      totalSize + 24,
      0x000000,
      0.4
    );
    panel.setStrokeStyle(2, 0xffffff, 0.2);
    this.gridContainer.add(panel);

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const idx = row * GRID_SIZE + col;
        const x = startX + col * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
        const y = startY + row * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;

        const cell = this.add.rectangle(
          x,
          y,
          CELL_SIZE,
          CELL_SIZE,
          0x444466,
          1
        );
        cell.setStrokeStyle(2, 0x666688);
        cell.setInteractive({ useHandCursor: true });

        cell.on("pointerdown", () => {
          if (this.phase !== "play") return;
          this.toggleCell(idx);
        });

        cell.on("pointerover", () => {
          if (this.phase === "play") {
            cell.setStrokeStyle(2, 0xffffff);
          }
        });

        cell.on("pointerout", () => {
          if (!this.selected.has(idx)) {
            cell.setStrokeStyle(2, 0x666688);
          }
        });

        this.gridContainer.add(cell);
        this.gridCells.push(cell);
      }
    }

    // "Attack!" button
    const attackBtn = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + totalSize / 2 + 30,
      160,
      40,
      0xff5a39,
      1
    );
    attackBtn.setStrokeStyle(3, 0xcc4730);
    attackBtn.setInteractive({ useHandCursor: true });
    attackBtn.setDepth(21);

    const attackText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + totalSize / 2 + 30,
      "Attack!",
      {
        fontSize: "16px",
        color: "#ffffff",
        fontFamily: "Fredoka, sans-serif",
        stroke: "#000000",
        strokeThickness: 2,
      }
    );
    attackText.setOrigin(0.5);
    attackText.setDepth(22);

    attackBtn.on("pointerdown", () => {
      if (this.phase === "play" && this.selected.size > 0) {
        const answer = Array.from(this.selected)
          .sort((a, b) => a - b)
          .join(",");
        eventBus.emit(GameEvents.REQUEST_SUBMIT, { answer });
      }
    });

    this.gridContainer.add(attackBtn);
    this.gridContainer.add(attackText);
  }

  private showPattern(): void {
    this.phase = "show";

    // Highlight pattern cells
    for (const idx of this.pattern) {
      if (this.gridCells[idx]) {
        this.gridCells[idx].setFillStyle(0xff5a39, 1);
      }
    }

    // Instruction text
    const instructionText = this.add.text(
      GAME_WIDTH / 2,
      40,
      "Memorize the pattern!",
      {
        fontSize: "20px",
        color: "#ffffff",
        fontFamily: "Fredoka, sans-serif",
        stroke: "#000000",
        strokeThickness: 3,
      }
    );
    instructionText.setOrigin(0.5);
    instructionText.setDepth(30);

    // After delay, hide pattern and enter play phase
    this.time.delayedCall(2500, () => {
      for (const cell of this.gridCells) {
        cell.setFillStyle(0x444466, 1);
        cell.setStrokeStyle(2, 0x666688);
      }
      instructionText.setText("Tap to recreate the pattern!");

      this.time.delayedCall(500, () => {
        instructionText.destroy();
      });

      this.phase = "play";
      eventBus.emit(GameEvents.QUESTION_READY, { questionIndex: 0 });
    });
  }

  private toggleCell(idx: number): void {
    if (this.selected.has(idx)) {
      this.selected.delete(idx);
      this.gridCells[idx].setFillStyle(0x444466, 1);
      this.gridCells[idx].setStrokeStyle(2, 0x666688);
    } else {
      this.selected.add(idx);
      this.gridCells[idx].setFillStyle(0x475093, 1);
      this.gridCells[idx].setStrokeStyle(2, 0xffffff);
    }
  }

  private generateRandomPattern(count: number): number[] {
    const total = GRID_SIZE * GRID_SIZE;
    const indices: number[] = [];
    while (indices.length < count) {
      const r = Phaser.Math.Between(0, total - 1);
      if (!indices.includes(r)) indices.push(r);
    }
    return indices;
  }

  private setupEvents(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];

    this.unsubs.push(
      eventBus.on(GameEvents.ANSWER_RESULT, (detail) => {
        const result = detail as AnswerResultPayload;
        this.handleResult(result);
      })
    );
  }

  private handleResult(result: AnswerResultPayload): void {
    this.phase = "result";

    // Show correct/incorrect cells
    for (let i = 0; i < this.gridCells.length; i++) {
      const isPattern = this.pattern.includes(i);
      const isSelected = this.selected.has(i);

      if (isPattern && isSelected) {
        this.gridCells[i].setFillStyle(0x44ff44, 1); // Correct
      } else if (isPattern && !isSelected) {
        this.gridCells[i].setFillStyle(0xffaa00, 1); // Missed
      } else if (!isPattern && isSelected) {
        this.gridCells[i].setFillStyle(0xff4444, 1); // Wrong
      }
    }

    if (result.isCorrect) {
      this.boss.setBossState("dying");
      this.cameras.main.flash(200, 255, 255, 255);
    } else {
      this.boss.setBossState("attacking");
      this.flashOverlay.setAlpha(0.3);
      this.tweens.add({
        targets: this.flashOverlay,
        alpha: 0,
        duration: 400,
      });
      this.player.setPlayerState("hurt");
    }
  }

  shutdown(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.background?.destroy();
  }
}

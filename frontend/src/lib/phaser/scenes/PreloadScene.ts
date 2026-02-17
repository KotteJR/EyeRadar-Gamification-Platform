import Phaser from "phaser";
import { eventBus, GameEvents } from "../EventBus";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  preload(): void {
    // ── Loading bar ────────────────────────────────────
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const barBg = this.add.rectangle(w / 2, h / 2, 320, 24, 0x222222);
    barBg.setStrokeStyle(2, 0x444444);
    const bar = this.add.rectangle(w / 2 - 156, h / 2, 0, 18, 0xff5a39);
    bar.setOrigin(0, 0.5);

    const loadingText = this.add.text(w / 2, h / 2 - 30, "Loading...", {
      fontSize: "16px",
      color: "#ffffff",
      fontFamily: "Fredoka, sans-serif",
    });
    loadingText.setOrigin(0.5);

    this.load.on("progress", (value: number) => {
      bar.width = 312 * value;
    });

    this.load.on("complete", () => {
      barBg.destroy();
      bar.destroy();
      loadingText.destroy();
    });

    // ── Player sprites (individual frames) ─────────────
    this.load.image("player-idle", "/game-assets/player/idle.png");
    this.load.image("player-walk", "/game-assets/player/walk.png");
    this.load.image("player-celebrate", "/game-assets/player/celebrate.png");

    for (let i = 0; i < 6; i++) {
      this.load.image(
        `player-run-${i}`,
        `/game-assets/player/running/frame_00${i}.png`
      );
    }
    for (let i = 0; i < 6; i++) {
      this.load.image(
        `player-slide-${i}`,
        `/game-assets/player/slide/frame_00${i}.png`
      );
    }
    for (let i = 0; i < 8; i++) {
      this.load.image(
        `player-jump-${i}`,
        `/game-assets/player/jumping/frame_00${i}.png`
      );
    }

    // Player fireball/spell cast frames
    for (let i = 0; i < 6; i++) {
      this.load.image(
        `player-fireball-${i}`,
        `/game-assets/player/fireball/frame_00${i}.png`
      );
    }

    // ── Boss sprites ───────────────────────────────────
    const bosses = [
      "dark_sorcerer",
      "giant_golem",
      "shadow_beast",
      "dragon",
      "corrupted_knight",
    ];
    for (const boss of bosses) {
      this.load.image(`boss-${boss}`, `/game-assets/bosses/${boss}.png`);
    }

    const bossesWithDeathPreload = [
      "dark_sorcerer",
      "dragon",
      "corrupted_knight",
    ];
    for (const boss of bossesWithDeathPreload) {
      for (let i = 0; i < 7; i++) {
        this.load.image(
          `boss-${boss}-death-${i}`,
          `/game-assets/bosses/${boss}_death/frame_00${i}.png`
        );
      }
    }

    // ── UI elements ─────────────────────────────────────
    this.load.image("ui-panel", "/game-assets/ui/panel-frame.png");
    this.load.image("ui-healthbar", "/game-assets/ui/health-bar.png");
    this.load.image("ui-button", "/game-assets/ui/button.png");
    this.load.image("ui-banner", "/game-assets/ui/banner.png");

    // ── Background images ──────────────────────────────
    const themes = [
      "grassland",
      "forest",
      "mountain",
      "sunset",
      "night",
      "cloud_kingdom",
    ];
    for (const theme of themes) {
      this.load.image(`bg-${theme}`, `/game-assets/backgrounds/${theme}.png`);
    }
    for (const theme of themes) {
      this.load.image(
        `tileset-${theme}`,
        `/game-assets/tilesets/${theme}.png`
      );
    }
  }

  create(): void {
    this.createPlayerAnimations();
    this.createBossAnimations();

    // Signal to React that assets are loaded — React will start the scene
    eventBus.emit(GameEvents.GAME_READY);
  }

  private createPlayerAnimations(): void {
    if (!this.anims.exists("player-run")) {
      this.anims.create({
        key: "player-run",
        frames: Array.from({ length: 6 }, (_, i) => ({
          key: `player-run-${i}`,
        })),
        frameRate: 10,
        repeat: -1,
      });
    }
    if (!this.anims.exists("player-slide")) {
      this.anims.create({
        key: "player-slide",
        frames: Array.from({ length: 6 }, (_, i) => ({
          key: `player-slide-${i}`,
        })),
        frameRate: 12,
        repeat: 0,
      });
    }
    if (!this.anims.exists("player-jump")) {
      this.anims.create({
        key: "player-jump",
        frames: Array.from({ length: 8 }, (_, i) => ({
          key: `player-jump-${i}`,
        })),
        frameRate: 10,
        repeat: 0,
      });
    }
    if (!this.anims.exists("player-fireball")) {
      this.anims.create({
        key: "player-fireball",
        frames: Array.from({ length: 6 }, (_, i) => ({
          key: `player-fireball-${i}`,
        })),
        frameRate: 10,
        repeat: 0,
      });
    }
  }

  private createBossAnimations(): void {
    const bossesWithDeathAnim = [
      "dark_sorcerer",
      "dragon",
      "corrupted_knight",
    ];
    for (const boss of bossesWithDeathAnim) {
      const animKey = `boss-${boss}-death`;
      if (
        !this.anims.exists(animKey) &&
        this.textures.exists(`boss-${boss}-death-0`)
      ) {
        this.anims.create({
          key: animKey,
          frames: Array.from({ length: 7 }, (_, i) => ({
            key: `boss-${boss}-death-${i}`,
          })),
          frameRate: 10,
          repeat: 0,
        });
      }
    }
  }
}

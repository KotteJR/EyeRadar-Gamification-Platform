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

    // Player death animation frames (7 frames)
    for (let i = 0; i < 7; i++) {
      this.load.image(
        `player-death-${i}`,
        `/game-assets/player/death/frame_00${i}.png`
      );
    }

    // Player hit/take-damage animation frames (6 frames)
    for (let i = 0; i < 6; i++) {
      this.load.image(
        `player-hit-${i}`,
        `/game-assets/player/hit/frame_00${i}.png`
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

    // ── Boss attack animation frames ──────────────────
    const bossAttacks: Array<{ boss: string; frameCount: number }> = [
      { boss: "dark_sorcerer", frameCount: 6 },
      { boss: "shadow_beast", frameCount: 6 },
      { boss: "giant_golem", frameCount: 6 },
      { boss: "corrupted_knight", frameCount: 6 },
    ];
    for (const { boss, frameCount } of bossAttacks) {
      for (let i = 0; i < frameCount; i++) {
        this.load.image(
          `boss-${boss}-attack-${i}`,
          `/game-assets/bosses/${boss}_attack/frame_00${i}.png`
        );
      }
    }

    // ── UI elements (legacy + PixelLab HUD) ────────────
    this.load.image("ui-panel", "/game-assets/ui/panel-frame.png");
    this.load.image("ui-healthbar", "/game-assets/ui/health-bar.png");
    this.load.image("ui-button", "/game-assets/ui/button.png");
    this.load.image("ui-banner", "/game-assets/ui/banner.png");

    // PixelLab generated HUD assets
    const hud = "/game-assets/ui/hud";
    this.load.image("hud-dialog", `${hud}/dialog-question.png`);
    this.load.image("hud-notification", `${hud}/dialog-notification.png`);
    this.load.image("hud-btn-normal", `${hud}/answer-btn-normal.png`);
    this.load.image("hud-btn-hover", `${hud}/answer-btn-hover.png`);
    this.load.image("hud-btn-correct", `${hud}/answer-btn-correct.png`);
    this.load.image("hud-btn-wrong", `${hud}/answer-btn-wrong.png`);
    this.load.image("hud-hp-frame", `${hud}/healthbar-frame-player.png`);
    this.load.image("hud-hp-fill", `${hud}/healthbar-fill-red.png`);
    this.load.image("hud-boss-frame", `${hud}/boss-healthbar-frame.png`);
    this.load.image("hud-boss-fill", `${hud}/boss-healthbar-fill.png`);
    this.load.image("hud-heart-full", `${hud}/heart-full.png`);
    this.load.image("hud-heart-empty", `${hud}/heart-empty.png`);
    this.load.image("hud-coin", `${hud}/coin-icon.png`);
    this.load.image("hud-star", `${hud}/star-icon.png`);
    this.load.image("hud-stone-normal", `${hud}/answer-stone-normal.png`);
    this.load.image("hud-stone-hover", `${hud}/answer-stone-hover.png`);
    this.load.image("hud-stone-large", `${hud}/projectile-stone-large.png`);
    this.load.image("hud-progress-frame", `${hud}/progress-bar-frame.png`);
    this.load.image("hud-progress-fill", `${hud}/progress-bar-fill.png`);
    this.load.image("hud-speech", `${hud}/speech-bubble-normal.png`);
    this.load.image("hud-speech-evil", `${hud}/speech-bubble-evil.png`);
    this.load.image("hud-timer", `${hud}/timer-frame.png`);

    // Boss attack effects are now fully procedural (Phaser graphics + tweens)
    // No external sprite frames needed for tornado, fireball, poison, ice, etc.

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

    // Death animation (7 frames, plays once)
    if (!this.anims.exists("player-death") && this.textures.exists("player-death-0")) {
      this.anims.create({
        key: "player-death",
        frames: Array.from({ length: 7 }, (_, i) => ({
          key: `player-death-${i}`,
        })),
        frameRate: 8,
        repeat: 0,
      });
    }

    // Hit/take-damage animation (6 frames, plays once)
    if (!this.anims.exists("player-hit") && this.textures.exists("player-hit-0")) {
      this.anims.create({
        key: "player-hit",
        frames: Array.from({ length: 6 }, (_, i) => ({
          key: `player-hit-${i}`,
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

    // Boss attack animations
    const bossesWithAttackAnim = [
      "dark_sorcerer",
      "shadow_beast",
      "giant_golem",
      "corrupted_knight",
    ];
    for (const boss of bossesWithAttackAnim) {
      const animKey = `boss-${boss}-attack`;
      if (
        !this.anims.exists(animKey) &&
        this.textures.exists(`boss-${boss}-attack-0`)
      ) {
        this.anims.create({
          key: animKey,
          frames: Array.from({ length: 6 }, (_, i) => ({
            key: `boss-${boss}-attack-${i}`,
          })),
          frameRate: 10,
          repeat: 0,
        });
      }
    }
  }
}

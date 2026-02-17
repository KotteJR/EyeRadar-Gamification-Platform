import Phaser from "phaser";
import { eventBus, GameEvents } from "../EventBus";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    // Minimal assets for boot - just enough for loading screen
  }

  create(): void {
    // Set up global event bus reference on the game registry
    this.registry.set("eventBus", eventBus);

    // Listen for scene change requests from React
    eventBus.on(GameEvents.SCENE_CHANGE, (detail) => {
      const { scene } = detail as { scene: string };
      if (this.scene.isActive(scene) || this.scene.isPaused(scene)) {
        this.scene.bringToTop(scene);
      }
    });

    // Go straight to preload
    this.scene.start("PreloadScene");
  }
}

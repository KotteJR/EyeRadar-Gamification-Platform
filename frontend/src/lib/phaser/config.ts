import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { BattleScene } from "./scenes/BattleScene";
import { DragonBattleScene } from "./scenes/DragonBattleScene";
import { RunnerScene } from "./scenes/RunnerScene";
import { MemoryScene } from "./scenes/MemoryScene";
import { WorldMapScene } from "./scenes/WorldMapScene";
import { CastleBossScene } from "./scenes/CastleBossScene";
import { CastleDungeonScene } from "./scenes/CastleDungeonScene";
import { WizardTestScene } from "./scenes/WizardTestScene";
import { CastleDungeon3StageScene } from "./scenes/CastleDungeon3StageScene";
import { GAME_WIDTH, GAME_HEIGHT } from "./constants";

// Re-export so existing consumers still work
export { GAME_WIDTH, GAME_HEIGHT };

export function createGameConfig(
  parent: HTMLElement
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: "#000000",
    scale: {
      mode: Phaser.Scale.ENVELOP,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 800 },
        debug: false,
      },
    },
    scene: [BootScene, PreloadScene, BattleScene, DragonBattleScene, RunnerScene, MemoryScene, WorldMapScene, CastleBossScene, CastleDungeonScene, WizardTestScene, CastleDungeon3StageScene],
  };
}

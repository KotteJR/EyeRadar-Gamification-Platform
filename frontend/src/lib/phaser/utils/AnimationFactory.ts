import Phaser from "phaser";

/**
 * Creates animations from individual frame textures.
 * Used because our PixelLab assets are individual PNGs, not sprite sheets.
 */
export class AnimationFactory {
  static createFromFrames(
    scene: Phaser.Scene,
    key: string,
    framePrefix: string,
    frameCount: number,
    frameRate: number = 10,
    repeat: number = -1
  ): Phaser.Animations.Animation | false {
    if (scene.anims.exists(key)) return false;

    // Check if first frame exists
    if (!scene.textures.exists(`${framePrefix}0`)) {
      return false;
    }

    const frames = Array.from({ length: frameCount }, (_, i) => ({
      key: `${framePrefix}${i}`,
    }));

    return scene.anims.create({
      key,
      frames,
      frameRate,
      repeat,
    });
  }

  /**
   * Checks if all frames for an animation exist in the texture cache
   */
  static hasAllFrames(
    scene: Phaser.Scene,
    prefix: string,
    count: number
  ): boolean {
    for (let i = 0; i < count; i++) {
      if (!scene.textures.exists(`${prefix}${i}`)) return false;
    }
    return true;
  }
}

import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";

/**
 * Screen transition effects for scene changes
 */
export class Transitions {
  /**
   * Fade to black, call callback, then fade back in
   */
  static fadeThrough(
    scene: Phaser.Scene,
    duration: number,
    callback: () => void
  ): void {
    const overlay = scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0
    );
    overlay.setDepth(9999);

    scene.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: duration / 2,
      ease: "Power2",
      onComplete: () => {
        callback();
        scene.tweens.add({
          targets: overlay,
          alpha: 0,
          duration: duration / 2,
          ease: "Power2",
          onComplete: () => overlay.destroy(),
        });
      },
    });
  }

  /**
   * Circle wipe transition (like Mario)
   */
  static circleWipe(
    scene: Phaser.Scene,
    duration: number,
    callback: () => void
  ): void {
    const mask = scene.add.graphics();
    mask.setDepth(9999);

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

    // Closing circle
    let progress = 0;
    const closeTimer = scene.time.addEvent({
      delay: 16,
      callback: () => {
        progress += 16 / (duration / 2);
        if (progress >= 1) {
          progress = 1;
          closeTimer.destroy();
          callback();

          // Opening circle
          let openProgress = 0;
          const openTimer = scene.time.addEvent({
            delay: 16,
            callback: () => {
              openProgress += 16 / (duration / 2);
              if (openProgress >= 1) {
                openTimer.destroy();
                mask.destroy();
                return;
              }
              mask.clear();
              mask.fillStyle(0x000000, 1);
              mask.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
              mask.fillStyle(0x000000, 0);
              mask.fillCircle(
                centerX,
                centerY,
                maxRadius * openProgress
              );
            },
            loop: true,
          });
        }

        mask.clear();
        mask.fillStyle(0x000000, 1);
        mask.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        // Clear a circle in the center (shrinking)
        const radius = maxRadius * (1 - progress);
        mask.fillStyle(0x000000, 0);
        mask.fillCircle(centerX, centerY, radius);
      },
      loop: true,
    });
  }

  /**
   * Star wipe (5 pointed star expands)
   */
  static starBurst(
    scene: Phaser.Scene,
    x: number,
    y: number,
    color: number = 0xffd700
  ): void {
    const particles = scene.add.graphics();
    particles.setDepth(100);

    const numRays = 8;
    const maxLength = 400;
    let progress = 0;

    const timer = scene.time.addEvent({
      delay: 16,
      callback: () => {
        progress += 0.03;
        if (progress >= 1) {
          timer.destroy();
          scene.tweens.add({
            targets: particles,
            alpha: 0,
            duration: 300,
            onComplete: () => particles.destroy(),
          });
          return;
        }

        particles.clear();
        particles.lineStyle(3, color, 1 - progress * 0.5);

        for (let i = 0; i < numRays; i++) {
          const angle = (i / numRays) * Math.PI * 2;
          const length = maxLength * progress;
          particles.lineBetween(
            x,
            y,
            x + Math.cos(angle) * length,
            y + Math.sin(angle) * length
          );
        }
      },
      loop: true,
    });
  }
}

import Phaser from "phaser";
import type { BossType } from "@/lib/boss-config";

export type BossState = "idle" | "hurt" | "attacking" | "dying" | "dead";

export class BossSprite extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private currentBossState: BossState = "idle";
  private bossType: BossType;
  private deathFrameIndex = 0;
  private deathTimer: Phaser.Time.TimerEvent | null = null;
  public onDeathComplete?: () => void;
  public onHurtComplete?: () => void;
  public onAttackComplete?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, bossType: BossType) {
    super(scene, x, y);
    this.bossType = bossType;

    // Use `new` instead of scene.add.sprite to avoid double-ownership
    this.sprite = new Phaser.GameObjects.Sprite(scene, 0, 0, `boss-${bossType}`);
    this.sprite.setScale(3);
    this.add(this.sprite);

    scene.add.existing(this);
    this.setBossState("idle");
  }

  private get alive(): boolean {
    return !!(this.sprite && this.scene && this.active);
  }

  get bossState(): BossState {
    return this.currentBossState;
  }

  setBossState(newState: BossState): void {
    if (this.currentBossState === newState) return;
    if (!this.alive) return;
    this.currentBossState = newState;

    this.cleanupTimers();
    this.scene.tweens.killTweensOf(this.sprite);

    switch (newState) {
      case "idle":
        this.sprite.setTexture(`boss-${this.bossType}`);
        this.sprite.clearTint();
        this.sprite.setAlpha(1);
        this.addIdleFloat();
        break;
      case "hurt":
        this.playHurt();
        break;
      case "attacking":
        this.playAttack();
        break;
      case "dying":
        this.playDeath();
        break;
      case "dead":
        this.sprite.setAlpha(0);
        this.setVisible(false);
        break;
    }
  }

  changeBossType(newType: BossType): void {
    if (!this.alive) return;
    this.bossType = newType;
    this.currentBossState = "idle"; // force re-enter idle
    this.sprite.setTexture(`boss-${newType}`);
    this.sprite.clearTint();
    this.sprite.setAlpha(1);
    this.setVisible(true);
    this.addIdleFloat();
  }

  private addIdleFloat(): void {
    this.scene.tweens.add({
      targets: this.sprite,
      y: { from: 0, to: -5 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private playHurt(): void {
    this.sprite.setTint(0xff0000);

    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.4,
      duration: 80,
      yoyo: true,
      repeat: 2,
    });

    this.scene.tweens.add({
      targets: this,
      x: this.x + 15,
      duration: 100,
      yoyo: true,
      ease: "Bounce.easeOut",
      onComplete: () => {
        if (!this.alive) return;
        this.sprite.clearTint();
        this.sprite.setAlpha(1);
        // Return to idle after hurt
        this.currentBossState = "idle";
        this.addIdleFloat();
        if (this.onHurtComplete) this.onHurtComplete();
      },
    });
  }

  private playAttack(): void {
    // Try PixelLab attack animation first
    const animKey = `boss-${this.bossType}-attack`;
    if (this.scene.anims.exists(animKey)) {
      this.sprite.play(animKey);
      this.sprite.once("animationcomplete", () => {
        if (!this.alive) return;
        this.sprite.setTexture(`boss-${this.bossType}`);
        this.sprite.setScale(3);
        if (this.onAttackComplete) this.onAttackComplete();
      });
      return;
    }

    // Fallback: tint red + scale pulse for casting visual
    this.sprite.setTint(0xff4444);

    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 3.3,
      scaleY: 2.8,
      duration: 150,
      yoyo: true,
      ease: "Sine.easeOut",
      onComplete: () => {
        if (!this.alive) return;
        this.sprite.clearTint();
        this.sprite.setScale(3);
        if (this.onAttackComplete) this.onAttackComplete();
      },
    });
  }

  private playDeath(): void {
    const hasDeathFrames = this.scene.textures.exists(
      `boss-${this.bossType}-death-0`
    );

    if (hasDeathFrames) {
      this.deathFrameIndex = 0;
      this.sprite.setTexture(`boss-${this.bossType}-death-0`);

      this.deathTimer = this.scene.time.addEvent({
        delay: 100,
        callback: () => {
          this.deathFrameIndex++;
          if (!this.alive) return;
          if (this.deathFrameIndex < 7) {
            this.sprite.setTexture(
              `boss-${this.bossType}-death-${this.deathFrameIndex}`
            );
          } else {
            this.cleanupTimers();
            this.onDeathAnimComplete();
          }
        },
        repeat: 6,
      });
    } else {
      this.sprite.setTint(0xffffff);
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        scaleX: 4,
        scaleY: 4,
        duration: 600,
        ease: "Power2",
        onComplete: () => {
          if (this.alive) this.onDeathAnimComplete();
        },
      });
    }
  }

  private onDeathAnimComplete(): void {
    this.currentBossState = "dead";
    this.setVisible(false);
    if (this.onDeathComplete) this.onDeathComplete();
  }

  private cleanupTimers(): void {
    if (this.deathTimer) {
      this.deathTimer.destroy();
      this.deathTimer = null;
    }
  }

  destroy(fromScene?: boolean): void {
    this.cleanupTimers();
    if (this.scene) {
      this.scene.tweens.killTweensOf(this.sprite);
      this.scene.tweens.killTweensOf(this);
    }
    super.destroy(fromScene);
  }
}

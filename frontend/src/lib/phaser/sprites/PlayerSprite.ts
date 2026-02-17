import Phaser from "phaser";

export type PlayerState =
  | "idle"
  | "running"
  | "sliding"
  | "casting"
  | "celebrating"
  | "hurt"
  | "jumping";

export class PlayerSprite extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private currentPlayerState: PlayerState = "idle";
  private _facingRight = true;
  private runFrameIndex = 0;
  private runTimer: Phaser.Time.TimerEvent | null = null;
  private ghostTimer: Phaser.Time.TimerEvent | null = null;
  private ghosts: Phaser.GameObjects.Sprite[] = [];
  public onSlideComplete?: () => void;
  public onCastComplete?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.sprite = new Phaser.GameObjects.Sprite(scene, 0, 0, "player-idle");
    this.sprite.setScale(3);
    this.add(this.sprite);
    scene.add.existing(this);
  }

  private get alive(): boolean {
    return !!(this.sprite && this.scene && this.active);
  }

  get playerState(): PlayerState {
    return this.currentPlayerState;
  }
  get facingRight(): boolean {
    return this._facingRight;
  }
  setFacing(right: boolean): void {
    if (!this.alive) return;
    this._facingRight = right;
    this.sprite.setFlipX(!right);
  }

  setPlayerState(newState: PlayerState): void {
    if (this.currentPlayerState === newState) return;
    if (!this.alive) return;
    this.currentPlayerState = newState;

    this.stopRunTimer();
    this.stopGhostTimer();
    this.clearGhosts();
    this.sprite.setRotation(0);
    this.sprite.clearTint();

    switch (newState) {
      case "idle":
        this.sprite.setTexture("player-idle");
        this.sprite.y = 0;
        this.addIdleBob();
        break;
      case "running":
        this.startRunAnimation();
        break;
      case "sliding":
        this.startDashSlide();
        break;
      case "casting":
        this.startCastAnimation();
        break;
      case "celebrating":
        this.sprite.setTexture("player-celebrate");
        this.sprite.y = 0;
        this.addCelebrateBounce();
        break;
      case "hurt":
        this.sprite.setTexture("player-idle");
        this.sprite.y = 0;
        this.playHurtFlash();
        break;
      case "jumping":
        this.startJumpAnimation();
        break;
    }
  }

  // ── IDLE ───────────────────────────────────────────

  private addIdleBob(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.add({
      targets: this.sprite,
      y: { from: 0, to: -3 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // ── CELEBRATE ──────────────────────────────────────

  private addCelebrateBounce(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.add({
      targets: this.sprite,
      y: { from: 0, to: -12 },
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeOut",
    });
  }

  // ── RUN ────────────────────────────────────────────

  private startRunAnimation(): void {
    this.runFrameIndex = 0;
    this.sprite.setTexture("player-run-0");
    this.sprite.y = 0;
    this.scene.tweens.killTweensOf(this.sprite);

    this.scene.tweens.add({
      targets: this.sprite,
      y: { from: 0, to: -4 },
      duration: 120,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.runTimer = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        if (!this.alive) return;
        this.runFrameIndex = (this.runFrameIndex + 1) % 6;
        this.sprite.setTexture(`player-run-${this.runFrameIndex}`);
      },
      loop: true,
    });
  }

  // ── SPELL CAST (raise arm, glow, fire!) ───────────

  private startCastAnimation(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.y = 0;

    // Use fireball sprite frames if available
    const hasFireballFrames = this.scene.textures.exists("player-fireball-0");

    if (hasFireballFrames) {
      // Play through fireball frames
      let frame = 0;
      this.sprite.setTexture("player-fireball-0");
      this.sprite.setTint(0xaaccff);

      const timer = this.scene.time.addEvent({
        delay: 80,
        callback: () => {
          frame++;
          if (!this.alive) return;
          if (frame < 6) {
            this.sprite.setTexture(`player-fireball-${frame}`);
          } else {
            timer.destroy();
            this.sprite.clearTint();
            this.sprite.setAlpha(1);
            if (this.onCastComplete) this.onCastComplete();
          }
        },
        repeat: 5,
      });
    } else {
      // Fallback: use idle frame with glow effects
      this.sprite.setTexture("player-idle");
      this.sprite.setTint(0xaaccff);

      this.scene.tweens.add({
        targets: this.sprite,
        y: -8,
        duration: 200,
        ease: "Back.easeOut",
      });

      this.scene.tweens.add({
        targets: this.sprite,
        alpha: { from: 1, to: 0.7 },
        duration: 150,
        yoyo: true,
        repeat: 2,
      });
    }

    // Glow particles around wizard for both paths
    this.spawnCastParticles();

    // Fallback timer if no frames
    if (!hasFireballFrames) {
      this.scene.time.delayedCall(500, () => {
        if (!this.alive) return;
        this.sprite.clearTint();
        this.sprite.setAlpha(1);
        this.sprite.y = 0;
        if (this.onCastComplete) this.onCastComplete();
      });
    }
  }

  private spawnCastParticles(): void {
    if (!this.alive) return;

    // Create glowing dots around the wizard
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = 15;
      const px = this.x + Math.cos(angle) * r;
      const py = this.y - 10 + Math.sin(angle) * r;

      const dot = this.scene.add.circle(px, py, 3, 0x66bbff, 0.8);
      dot.setDepth(this.depth + 1);

      this.scene.tweens.add({
        targets: dot,
        x: this.x + Math.cos(angle) * 30,
        y: this.y - 10 + Math.sin(angle) * 30,
        alpha: 0,
        scale: 0.2,
        duration: 400,
        delay: i * 30,
        ease: "Power2",
        onComplete: () => dot.destroy(),
      });
    }
  }

  // ── DASH SLIDE (for final kill) ───────────────────

  private startDashSlide(): void {
    this.scene.tweens.killTweensOf(this.sprite);

    this.sprite.setTexture("player-run-2");
    this.sprite.y = 6;
    this.sprite.setRotation(-0.35);
    this.sprite.setTint(0xaaddff);

    this.ghostTimer = this.scene.time.addEvent({
      delay: 50,
      callback: () => this.spawnGhost(),
      repeat: 7,
    });

    this.addSpeedLines();

    this.scene.time.delayedCall(420, () => {
      if (!this.alive) return;
      this.sprite.setRotation(0);
      this.sprite.clearTint();
      this.sprite.y = 0;
      this.clearGhosts();
      if (this.onSlideComplete) this.onSlideComplete();
    });
  }

  private spawnGhost(): void {
    if (!this.alive) return;
    const worldX = this.x + this.sprite.x;
    const worldY = this.y + this.sprite.y;
    const ghost = new Phaser.GameObjects.Sprite(
      this.scene, worldX, worldY, this.sprite.texture.key
    );
    ghost.setScale(this.sprite.scaleX, this.sprite.scaleY);
    ghost.setRotation(this.sprite.rotation);
    ghost.setFlipX(this.sprite.flipX);
    ghost.setAlpha(0.5);
    ghost.setTint(0x66bbff);
    ghost.setDepth(this.depth - 1);
    this.scene.add.existing(ghost);
    this.ghosts.push(ghost);

    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: ghost.scaleX * 0.7,
      scaleY: ghost.scaleY * 0.7,
      duration: 300,
      ease: "Power2",
      onComplete: () => ghost.destroy(),
    });
  }

  private addSpeedLines(): void {
    if (!this.alive) return;
    for (let i = 0; i < 5; i++) {
      const offsetY = (Math.random() - 0.5) * 40;
      const line = this.scene.add.rectangle(
        this.x - 20 - Math.random() * 30,
        this.y + offsetY,
        30 + Math.random() * 40, 2, 0xffffff, 0.6
      );
      line.setDepth(this.depth - 1);
      this.scene.tweens.add({
        targets: line,
        x: line.x - 60,
        alpha: 0,
        scaleX: 0.3,
        duration: 250 + Math.random() * 150,
        ease: "Power2",
        onComplete: () => line.destroy(),
      });
    }
  }

  // ── JUMP ───────────────────────────────────────────

  private startJumpAnimation(): void {
    let jumpFrame = 0;
    this.sprite.setTexture("player-jump-0");
    this.sprite.y = 0;
    this.scene.tweens.killTweensOf(this.sprite);

    const timer = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        jumpFrame++;
        if (!this.alive) return;
        if (jumpFrame < 8) {
          this.sprite.setTexture(`player-jump-${jumpFrame}`);
        } else {
          timer.destroy();
          this.setPlayerState("idle");
        }
      },
      repeat: 7,
    });
  }

  // ── HURT ───────────────────────────────────────────

  private playHurtFlash(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setTint(0xff0000);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        if (!this.alive) return;
        this.sprite.clearTint();
        this.sprite.setAlpha(1);
        this.setPlayerState("idle");
      },
    });
    this.scene.tweens.add({
      targets: this,
      x: this.x + 8,
      duration: 50,
      yoyo: true,
      repeat: 3,
    });
  }

  // ── Cleanup ────────────────────────────────────────

  private stopRunTimer(): void {
    if (this.runTimer) { this.runTimer.destroy(); this.runTimer = null; }
  }
  private stopGhostTimer(): void {
    if (this.ghostTimer) { this.ghostTimer.destroy(); this.ghostTimer = null; }
  }
  private clearGhosts(): void {
    for (const g of this.ghosts) { if (g.active) g.destroy(); }
    this.ghosts = [];
  }

  destroy(fromScene?: boolean): void {
    this.stopRunTimer();
    this.stopGhostTimer();
    this.clearGhosts();
    if (this.scene) {
      this.scene.tweens.killTweensOf(this.sprite);
      this.scene.tweens.killTweensOf(this);
    }
    super.destroy(fromScene);
  }
}

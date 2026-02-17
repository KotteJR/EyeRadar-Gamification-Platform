import Phaser from "phaser";

/**
 * Sound effect manager with placeholders.
 * Generates simple synth sounds as placeholders until real audio assets are added.
 */
export class SoundManager {
  private scene: Phaser.Scene;
  private audioContext: AudioContext | null = null;
  private enabled = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    try {
      this.audioContext = new AudioContext();
    } catch {
      this.enabled = false;
    }
  }

  playCorrect(): void {
    this.playTone(523.25, 0.15, "sine"); // C5
    setTimeout(() => this.playTone(659.25, 0.15, "sine"), 100); // E5
    setTimeout(() => this.playTone(783.99, 0.2, "sine"), 200); // G5
  }

  playIncorrect(): void {
    this.playTone(200, 0.3, "sawtooth");
  }

  playBossHurt(): void {
    this.playTone(300, 0.1, "square");
    setTimeout(() => this.playTone(200, 0.15, "square"), 80);
  }

  playBossDeath(): void {
    for (let i = 0; i < 5; i++) {
      setTimeout(
        () => this.playTone(400 - i * 60, 0.1, "square"),
        i * 80
      );
    }
  }

  playSlide(): void {
    this.playTone(150, 0.1, "sawtooth");
    setTimeout(() => this.playTone(250, 0.08, "sawtooth"), 50);
  }

  playFootstep(): void {
    this.playTone(100 + Math.random() * 50, 0.03, "triangle");
  }

  playExplosion(): void {
    this.playNoise(0.2);
  }

  playSelect(): void {
    this.playTone(440, 0.05, "sine");
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType
  ): void {
    if (!this.enabled || !this.audioContext) return;

    try {
      const ctx = this.audioContext;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + duration
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Ignore audio errors silently
    }
  }

  private playNoise(duration: number): void {
    if (!this.enabled || !this.audioContext) return;

    try {
      const ctx = this.audioContext;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {
      // Ignore audio errors silently
    }
  }

  destroy(): void {
    this.audioContext?.close();
    this.audioContext = null;
  }
}

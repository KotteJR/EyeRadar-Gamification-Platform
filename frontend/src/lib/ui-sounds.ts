/**
 * Lightweight UI sound effects using Web Audio API.
 * Works anywhere in React — no Phaser dependency.
 * Singleton AudioContext shared across all calls.
 */

let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      enabled = false;
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.08,
  delay = 0
): void {
  const c = getCtx();
  if (!c) return;
  try {
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch {
    /* silent */
  }
}

function noise(dur: number, vol = 0.04): void {
  const c = getCtx();
  if (!c) return;
  try {
    const len = c.sampleRate * dur;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.2));
    }
    const src = c.createBufferSource();
    const gain = c.createGain();
    src.buffer = buf;
    gain.gain.setValueAtTime(vol, c.currentTime);
    src.connect(gain);
    gain.connect(c.destination);
    src.start();
  } catch {
    /* silent */
  }
}

export const UISounds = {
  /** Quick click — short bright tap for buttons, nav links */
  click() {
    tone(880, 0.06, "sine", 0.06);
  },

  /** Soft select — for choosing an option, selecting a card */
  select() {
    tone(660, 0.08, "sine", 0.07);
    tone(880, 0.06, "sine", 0.04, 0.04);
  },

  /** Tile tap — for memory game tile selection */
  tile() {
    tone(520, 0.05, "triangle", 0.07);
    tone(780, 0.04, "sine", 0.03, 0.03);
  },

  /** Card flip — for memory match card reveal */
  flip() {
    tone(400, 0.04, "triangle", 0.06);
    tone(600, 0.06, "sine", 0.05, 0.03);
  },

  /** Start / confirm — rising tone for starting a game */
  start() {
    tone(440, 0.1, "sine", 0.07);
    tone(554, 0.1, "sine", 0.06, 0.08);
    tone(659, 0.12, "sine", 0.07, 0.16);
  },

  /** Submit — slightly punchy confirmation */
  submit() {
    tone(523, 0.08, "square", 0.04);
    tone(659, 0.1, "sine", 0.06, 0.06);
  },

  /** Correct answer — happy ascending triad */
  correct() {
    tone(523, 0.12, "sine", 0.07);
    tone(659, 0.12, "sine", 0.06, 0.08);
    tone(784, 0.18, "sine", 0.07, 0.16);
  },

  /** Wrong answer — low descending buzz */
  wrong() {
    tone(250, 0.2, "sawtooth", 0.05);
    tone(200, 0.25, "sawtooth", 0.04, 0.1);
  },

  /** Match found — bright sparkle for matching pairs */
  match() {
    tone(784, 0.08, "sine", 0.06);
    tone(988, 0.08, "sine", 0.05, 0.06);
    tone(1175, 0.12, "sine", 0.06, 0.12);
  },

  /** Navigate — gentle transition for page/world switches */
  navigate() {
    tone(440, 0.06, "sine", 0.05);
    tone(554, 0.08, "sine", 0.04, 0.05);
  },

  /** Purchase — coin-like for shop purchases */
  purchase() {
    tone(1047, 0.06, "sine", 0.06);
    tone(1319, 0.06, "sine", 0.05, 0.06);
    tone(1568, 0.1, "sine", 0.06, 0.12);
    tone(2093, 0.15, "sine", 0.05, 0.18);
  },

  /** Boss hit — impact sound */
  impact() {
    noise(0.12, 0.05);
    tone(150, 0.1, "square", 0.04);
  },

  /** Toggle mute */
  setEnabled(on: boolean) {
    enabled = on;
  },

  /** Check if enabled */
  isEnabled() {
    return enabled;
  },
};

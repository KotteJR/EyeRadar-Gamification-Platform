/**
 * Background music manager — singleton.
 * Handles looping, crossfade between tracks, and global mute.
 * Persists mute preference in localStorage.
 */

const STORAGE_KEY = "eyeradar_music_muted";
const FADE_MS = 800;
const VOLUME = 0.25;

export type MusicTrack =
  | "worldmap"
  | "memory"
  | "boss"
  | null;

/** Map logical tracks to actual files (picks randomly for variety) */
const TRACK_FILES: Record<string, string[]> = {
  worldmap: ["/music/worldmap1.mp3", "/music/worldmap2.mp3"],
  memory: ["/music/memory.mp3"],
  boss: ["/music/reading-comprehension1.mp3", "/music/reading-comprehension2.mp3"],
};

class MusicManagerClass {
  private audio: HTMLAudioElement | null = null;
  private currentTrack: MusicTrack = null;
  private currentFile: string | null = null;
  private muted: boolean = false;
  private fadingOut = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.muted = localStorage.getItem(STORAGE_KEY) === "true";
      } catch {
        /* noop */
      }
    }
  }

  /** Subscribe to mute state changes */
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  get isMuted() {
    return this.muted;
  }

  /** Toggle mute on/off */
  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem(STORAGE_KEY, String(this.muted));
    } catch {
      /* noop */
    }
    if (this.audio) {
      if (this.muted) {
        this.audio.volume = 0;
      } else {
        this.audio.volume = VOLUME;
      }
    }
    this.notify();
  }

  /** Play a track. If already playing, do nothing. If different, crossfade. */
  play(track: MusicTrack) {
    if (!track) {
      this.stop();
      return;
    }
    if (track === this.currentTrack && this.audio && !this.audio.paused) {
      return; // already playing this track
    }

    const files = TRACK_FILES[track];
    if (!files || files.length === 0) return;

    // Pick a random file from the pool
    const file = files[Math.floor(Math.random() * files.length)];

    // If same file already playing, skip
    if (file === this.currentFile && this.audio && !this.audio.paused) {
      this.currentTrack = track;
      return;
    }

    this.fadeOutAndPlay(track, file);
  }

  /** Stop all music */
  stop() {
    if (this.audio) {
      this.fadeOut(this.audio);
      this.audio = null;
    }
    this.currentTrack = null;
    this.currentFile = null;
  }

  private fadeOutAndPlay(track: MusicTrack, file: string) {
    const oldAudio = this.audio;

    // Create new audio
    const newAudio = new Audio(file);
    newAudio.loop = true;
    newAudio.volume = 0;
    newAudio.preload = "auto";

    this.audio = newAudio;
    this.currentTrack = track;
    this.currentFile = file;

    // Fade out old audio
    if (oldAudio && !oldAudio.paused) {
      this.fadeOut(oldAudio);
    }

    // Play new and fade in
    const playPromise = newAudio.play();
    if (playPromise) {
      playPromise
        .then(() => {
          this.fadeIn(newAudio);
        })
        .catch(() => {
          // Autoplay blocked — wait for user interaction
          const resume = () => {
            newAudio.play().then(() => this.fadeIn(newAudio)).catch(() => {});
            document.removeEventListener("click", resume);
            document.removeEventListener("touchstart", resume);
            document.removeEventListener("keydown", resume);
          };
          document.addEventListener("click", resume, { once: true });
          document.addEventListener("touchstart", resume, { once: true });
          document.addEventListener("keydown", resume, { once: true });
        });
    }
  }

  private fadeIn(audio: HTMLAudioElement) {
    const target = this.muted ? 0 : VOLUME;
    const steps = 20;
    const stepMs = FADE_MS / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      audio.volume = Math.min(target, (step / steps) * target);
      if (step >= steps) {
        clearInterval(interval);
        audio.volume = target;
      }
    }, stepMs);
  }

  private fadeOut(audio: HTMLAudioElement) {
    const startVol = audio.volume;
    const steps = 15;
    const stepMs = FADE_MS / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      audio.volume = Math.max(0, startVol * (1 - step / steps));
      if (step >= steps) {
        clearInterval(interval);
        audio.pause();
        audio.src = "";
      }
    }, stepMs);
  }
}

/** Global singleton */
export const MusicManager = new MusicManagerClass();

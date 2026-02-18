type TTSOptions = {
  lang?: string;
  rate?: number | string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class TTSManager {
  private playing = false;
  private enabled = true;
  private currentAudio: HTMLAudioElement | null = null;
  private cache = new Map<string, string>();

  private cacheKey(text: string, lang: string, rate: string): string {
    return `${text}|${lang}|${rate}`;
  }

  async speak(text: string, opts: TTSOptions = {}): Promise<void> {
    if (!this.enabled || !text.trim()) return;

    this.cancel();

    const rawLang = opts.lang || "el";
    const lang = rawLang.split("-")[0];
    const rawRate = opts.rate;
    const rate =
      typeof rawRate === "number"
        ? `${rawRate < 1 ? "-" : "+"}${Math.abs(Math.round((rawRate - 1) * 100))}%`
        : rawRate || "+0%";
    const key = this.cacheKey(text, lang, rate);

    let audioUrl = this.cache.get(key);

    if (!audioUrl) {
      const params = new URLSearchParams({ text, lang, rate });
      const url = `${API_BASE}/tts?${params.toString()}`;

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`TTS request failed: ${res.status}`);
        const blob = await res.blob();
        audioUrl = URL.createObjectURL(blob);
        this.cache.set(key, audioUrl);
      } catch {
        this.fallbackSpeak(text, lang);
        return;
      }
    }

    return new Promise<void>((resolve) => {
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;
      this.playing = true;

      audio.onended = () => {
        this.playing = false;
        this.currentAudio = null;
        resolve();
      };
      audio.onerror = () => {
        this.playing = false;
        this.currentAudio = null;
        resolve();
      };

      audio.play().catch(() => {
        this.playing = false;
        this.currentAudio = null;
        resolve();
      });
    });
  }

  private fallbackSpeak(text: string, lang: string): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang.includes("-") ? lang : lang === "el" ? "el-GR" : "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  cancel() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.playing = false;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  isSpeaking(): boolean {
    return this.playing;
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (!v) this.cancel();
  }
}

export const tts = new TTSManager();

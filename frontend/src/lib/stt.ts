type STTOptions = {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxDuration?: number;
};

export type STTResult = {
  transcript: string;
  confidence: number;
  isFinal: boolean;
};

type STTCallback = (result: STTResult) => void;

/* eslint-disable @typescript-eslint/no-explicit-any */

class STTManager {
  private recognition: any = null;
  private recording = false;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  isSupported(): boolean {
    if (typeof window === "undefined") return false;
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }

  private createRecognition(opts: STTOptions): any {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      throw new Error("SpeechRecognition not supported");
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = opts.lang || "el-GR";
    recognition.continuous = opts.continuous ?? false;
    recognition.interimResults = opts.interimResults ?? true;
    recognition.maxAlternatives = 3;
    return recognition;
  }

  /**
   * Start listening. Returns a promise that resolves with the final transcript.
   * Also calls onInterim with intermediate results if provided.
   */
  start(
    opts: STTOptions = {},
    onInterim?: STTCallback
  ): Promise<STTResult> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error("Speech recognition not supported in this browser"));
        return;
      }

      this.stop();

      try {
        this.recognition = this.createRecognition(opts);
      } catch (e) {
        reject(e);
        return;
      }

      let finalResult: STTResult | null = null;
      this.recording = true;

      this.recognition.onresult = (event: any) => {
        const last = event.results[event.results.length - 1];
        const result: STTResult = {
          transcript: last[0].transcript.trim(),
          confidence: last[0].confidence,
          isFinal: last.isFinal,
        };

        if (result.isFinal) {
          finalResult = result;
        }

        onInterim?.(result);
      };

      this.recognition.onerror = (event: any) => {
        this.recording = false;
        this.clearTimeout();
        if (event.error === "aborted" || event.error === "no-speech") {
          resolve({ transcript: "", confidence: 0, isFinal: true });
        } else {
          reject(new Error(`STT error: ${event.error}`));
        }
      };

      this.recognition.onend = () => {
        this.recording = false;
        this.clearTimeout();
        resolve(
          finalResult || { transcript: "", confidence: 0, isFinal: true }
        );
      };

      this.recognition.start();

      const maxDuration = opts.maxDuration ?? 10000;
      this.timeoutId = setTimeout(() => {
        this.stop();
      }, maxDuration);
    });
  }

  /**
   * Record for a fixed duration, collecting all speech.
   * Useful for Rapid Naming where the child speaks continuously.
   */
  record(
    durationMs: number,
    opts: STTOptions = {},
    onInterim?: STTCallback
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error("Speech recognition not supported"));
        return;
      }

      this.stop();

      try {
        this.recognition = this.createRecognition({
          ...opts,
          continuous: true,
          interimResults: true,
        });
      } catch (e) {
        reject(e);
        return;
      }

      const transcripts: string[] = [];
      this.recording = true;

      this.recognition.onresult = (event: any) => {
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const sttResult: STTResult = {
            transcript: result[0].transcript.trim(),
            confidence: result[0].confidence,
            isFinal: result.isFinal,
          };

          if (result.isFinal && sttResult.transcript) {
            transcripts.push(sttResult.transcript);
          }

          onInterim?.(sttResult);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.recording = false;
        if (event.error === "aborted" || event.error === "no-speech") {
          resolve(transcripts);
        } else {
          reject(new Error(`STT error: ${event.error}`));
        }
      };

      this.recognition.onend = () => {
        this.recording = false;
        resolve(transcripts);
      };

      this.recognition.start();

      this.timeoutId = setTimeout(() => {
        this.stop();
      }, durationMs);
    });
  }

  stop() {
    this.clearTimeout();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // already stopped
      }
      this.recognition = null;
    }
    this.recording = false;
  }

  isRecording(): boolean {
    return this.recording;
  }

  private clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

export const stt = new STTManager();

// React ↔ Phaser communication bridge
// Lives outside both React and Phaser so both can import it

type EventCallback = (detail?: unknown) => void;

class GameEventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  emit(event: string, detail?: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      // Snapshot so newly-added listeners during iteration are not visited
      const snapshot = [...callbacks];
      snapshot.forEach((cb) => cb(detail));
    }
  }

  on(event: string, cb: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(cb);
    return () => {
      this.listeners.get(event)?.delete(cb);
    };
  }

  off(event: string, cb: EventCallback): void {
    this.listeners.get(event)?.delete(cb);
  }

  removeAll(): void {
    this.listeners.clear();
  }
}

export const eventBus = new GameEventBus();

// Event type constants
export const GameEvents = {
  // Phaser → React: player reached boss, show question UI
  QUESTION_READY: "question:ready",
  // React → Phaser: user answered, animate result
  ANSWER_RESULT: "answer:result",
  // React → Phaser: send new question data
  QUESTION_DATA: "question:data",
  // Phaser → React: phase changed (for HUD updates)
  PHASE_CHANGE: "phase:change",
  // Phaser → React: score/HP update
  SCORE_UPDATE: "score:update",
  // React → Phaser: start level with config
  LEVEL_START: "level:start",
  // Phaser → React: level complete
  LEVEL_COMPLETE: "level:complete",
  // React → Phaser: scene transition
  SCENE_CHANGE: "scene:change",
  // Phaser → React: game fully ready
  GAME_READY: "game:ready",
  // Phaser → React: player requesting to submit answer
  REQUEST_SUBMIT: "request:submit",
} as const;

// Payload types for type safety
export interface QuestionReadyPayload {
  questionIndex: number;
}

export interface AnswerResultPayload {
  isCorrect: boolean;
  correctAnswer: string;
  pointsEarned: number;
  studentAnswer: string;
}

export interface QuestionDataPayload {
  question: string;
  options: string[];
  itemType: string;
  hint?: string;
  extraData?: Record<string, unknown>;
}

export interface PhaseChangePayload {
  phase: string;
  bossHp?: number;
  maxBossHp?: number;
}

export interface ScoreUpdatePayload {
  points: number;
  streak: number;
  lives: number;
  progress: number;
  maxProgress: number;
}

export interface LevelStartPayload {
  worldTheme: string;
  bossType: string;
  itemType: string;
  questionData: QuestionDataPayload;
  progress: number;
  maxProgress: number;
  streak: number;
  points: number;
}

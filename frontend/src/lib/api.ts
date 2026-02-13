const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const API_ROOT = API_BASE.replace(/\/api\/v1$/, "");

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API Error: ${res.status}`);
  }
  return res.json();
}

// ─── Students ────────────────────────────────────────────────────────────────

import type {
  Student,
  StudentCreate,
  GameDefinition,
  ExerciseSession,
  ExerciseItemResult,
  GamificationSummary,
  Badge,
  AnalyticsOverview,
  ExerciseRecommendation,
  AIStatus,
} from "@/types";

export const api = {
  // Students
  getStudents: () => fetchAPI<Student[]>("/students"),
  getStudent: (id: string) => fetchAPI<Student>(`/students/${id}`),
  createStudent: (data: StudentCreate) =>
    fetchAPI<Student>("/students", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  upsertStudent: (id: string, data: StudentCreate) =>
    fetchAPI<Student>(`/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  updateStudent: (id: string, data: Partial<StudentCreate>) =>
    fetchAPI<Student>(`/students/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteStudent: (id: string) =>
    fetchAPI<{ message: string }>(`/students/${id}`, { method: "DELETE" }),
  importAssessment: (studentId: string, assessment: Record<string, unknown>) =>
    fetchAPI<Student>(`/students/${studentId}/assessment`, {
      method: "POST",
      body: JSON.stringify(assessment),
    }),

  // Games
  getGames: () => fetchAPI<GameDefinition[]>("/games"),
  getGame: (id: string) => fetchAPI<GameDefinition>(`/games/${id}`),
  getGamesByArea: (area: string) =>
    fetchAPI<GameDefinition[]>(`/games/by-area/${area}`),

  // Exercises
  startSession: (studentId: string, gameId: string) =>
    fetchAPI<ExerciseSession>("/exercises/start", {
      method: "POST",
      body: JSON.stringify({ student_id: studentId, game_id: gameId }),
    }),
  getSession: (id: string) => fetchAPI<ExerciseSession>(`/exercises/${id}`),
  submitAnswer: (
    sessionId: string,
    itemIndex: number,
    answer: string,
    responseTimeMs: number
  ) =>
    fetchAPI<ExerciseItemResult>(`/exercises/${sessionId}/submit`, {
      method: "POST",
      body: JSON.stringify({
        item_index: itemIndex,
        student_answer: answer,
        response_time_ms: responseTimeMs,
      }),
    }),
  completeSession: (sessionId: string) =>
    fetchAPI<ExerciseSession>(`/exercises/${sessionId}/complete`, {
      method: "POST",
    }),
  getStudentSessions: (studentId: string) =>
    fetchAPI<ExerciseSession[]>(`/exercises/student/${studentId}`),
  getRecommendations: (studentId: string) =>
    fetchAPI<ExerciseRecommendation[]>(
      `/exercises/recommendations/${studentId}`
    ),

  // Gamification
  getGamificationSummary: (studentId: string) =>
    fetchAPI<GamificationSummary>(`/gamification/${studentId}/summary`),
  getStudentBadges: (studentId: string) =>
    fetchAPI<Badge[]>(`/gamification/${studentId}/badges`),

  // Analytics
  getAnalytics: (studentId: string) =>
    fetchAPI<AnalyticsOverview>(`/analytics/${studentId}/overview`),
  getReport: (studentId: string) =>
    fetchAPI<Record<string, unknown>>(`/analytics/${studentId}/report`),

  // AI Status
  getAIStatus: async (): Promise<AIStatus> => {
    const res = await fetch(`${API_ROOT}/ai-status`);
    return res.json();
  },
};

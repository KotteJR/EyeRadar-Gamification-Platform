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
  AdventureMap,
  AdventureMapCreate,
  AdventureSuggestRequest,
  AdventureSuggestResponse,
  AvailableGameForArea,
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
  uploadAssessmentFile: async (studentId: string, file: File): Promise<Student> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/students/${studentId}/assessment/upload`, {
      method: "POST",
      body: formData,
      // Do NOT set Content-Type here — browser sets it automatically with the multipart boundary
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || `API Error: ${res.status}`);
    }
    return res.json();
  },

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

  // Adventures
  getAdventureStatusAll: () =>
    fetchAPI<Record<string, { has_adventure: boolean; adventure_id: string; title: string; world_count: number; total_games: number }>>(
      "/adventures/status/all"
    ),
  getStudentAdventure: (studentId: string) =>
    fetchAPI<AdventureMap | null>(`/adventures/student/${studentId}`),
  getStudentAdventures: (studentId: string) =>
    fetchAPI<AdventureMap[]>(`/adventures/student/${studentId}/all`),
  createAdventure: (data: AdventureMapCreate) =>
    fetchAPI<AdventureMap>("/adventures", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateAdventure: (id: string, data: Partial<AdventureMapCreate>) =>
    fetchAPI<AdventureMap>(`/adventures/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteAdventure: (id: string) =>
    fetchAPI<{ message: string }>(`/adventures/${id}`, { method: "DELETE" }),
  suggestAdventure: (data: AdventureSuggestRequest) =>
    fetchAPI<AdventureSuggestResponse>("/adventures/suggest", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getGamesForArea: (area: string, age: number, severity?: string) =>
    fetchAPI<AvailableGameForArea[]>(
      `/adventures/games-for-area/${area}?age=${age}${severity ? `&severity=${severity}` : ""}`
    ),

  // AI Status
  getAIStatus: async (): Promise<AIStatus> => {
    const res = await fetch(`${API_ROOT}/ai-status`);
    return res.json();
  },
};

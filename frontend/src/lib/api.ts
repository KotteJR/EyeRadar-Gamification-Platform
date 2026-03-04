import { getSession } from "next-auth/react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const API_ROOT = API_BASE.replace(/\/api\/v1$/, "");
const SESSION_CACHE_TTL_MS = 30_000;

let cachedBearerToken = "";
let cachedAtMs = 0;

function clearBearerTokenCache() {
  cachedBearerToken = "";
  cachedAtMs = 0;
}

async function getBearerToken(forceRefresh = false): Promise<string> {
  if (forceRefresh) clearBearerTokenCache();
  const now = Date.now();
  if (cachedBearerToken && now - cachedAtMs < SESSION_CACHE_TTL_MS) {
    return cachedBearerToken;
  }

  const session = await getSession();
  if (session?.error === "RefreshAccessTokenError") {
    clearBearerTokenCache();
    throw new Error("Your session expired. Please sign in again.");
  }
  const bearerToken =
    session?.accessToken ||
    ((session as unknown as { user?: { accessToken?: string } })?.user
      ?.accessToken ?? "");

  cachedBearerToken = bearerToken || "";
  cachedAtMs = now;
  return cachedBearerToken;
}

const DEFAULT_TIMEOUT_MS = 30_000;

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const doFetch = async (forceRefresh = false) => {
    const bearerToken = await getBearerToken(forceRefresh);
    const authHeader: Record<string, string> = bearerToken
      ? { Authorization: `Bearer ${bearerToken}` }
      : {};

    return fetch(`${API_BASE}${path}`, {
      ...options,
      signal: options?.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
        ...(options?.headers as Record<string, string>),
      },
    });
  };

  let res = await doFetch(false);
  if (res.status === 401) {
    // One forced refresh/retry in case access token just expired.
    res = await doFetch(true);
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = String(error.detail || `API Error: ${res.status}`);
    if (res.status === 401 && /expired|invalid token|unauthorized/i.test(detail)) {
      throw new Error("Your session expired. Please sign in again.");
    }
    throw new Error(detail);
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
  AccountSyncResponse,
  BillingSummary,
  ParentChildCreate,
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
    const upload = async (forceRefresh = false) => {
      const bearerToken = await getBearerToken(forceRefresh);
      const formData = new FormData();
      formData.append("file", file);
      return fetch(`${API_BASE}/students/${studentId}/assessment/upload`, {
        method: "POST",
        body: formData,
        headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {},
        // Do NOT set Content-Type here — browser sets it automatically with the multipart boundary
      });
    };

    let res = await upload(false);
    if (res.status === 401) {
      res = await upload(true);
    }
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      const detail = String(error.detail || `API Error: ${res.status}`);
      if (res.status === 401 && /expired|invalid token|unauthorized/i.test(detail)) {
        throw new Error("Your session expired. Please sign in again.");
      }
      throw new Error(detail);
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

  // Shop
  getStudentPurchases: (studentId: string) =>
    fetchAPI<string[]>(`/gamification/${studentId}/purchases`),
  purchaseShopItem: (studentId: string, itemId: string) =>
    fetchAPI<{ item_id: string; remaining_points: number }>(
      `/gamification/${studentId}/purchase`,
      { method: "POST", body: JSON.stringify({ item_id: itemId }) }
    ),

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
    try {
      const res = await fetch(`${API_ROOT}/ai-status`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        return { status: "unavailable", provider: "none" } as AIStatus;
      }
      return res.json();
    } catch {
      return { status: "unavailable", provider: "none" } as AIStatus;
    }
  },

  // Account / Billing
  syncAccount: () => fetchAPI<AccountSyncResponse>("/account/me"),
  getParentStudents: () => fetchAPI<Student[]>("/students/parent/mine"),
  getParentLimits: () =>
    fetchAPI<{
      children_count: number;
      child_slots: number;
      can_add_child: boolean;
      subscription: BillingSummary["subscription"];
    }>("/students/parent/limits"),
  createParentStudent: (data: ParentChildCreate) =>
    fetchAPI<Student>("/students/parent/create", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getBillingSummary: () => fetchAPI<BillingSummary>("/billing/summary"),
  createParentPlanCheckout: () =>
    fetchAPI<{ url: string }>("/billing/checkout/parent-plan", {
      method: "POST",
    }),
  createAddChildSlotCheckout: () =>
    fetchAPI<{ url: string }>("/billing/checkout/add-child-slot", {
      method: "POST",
    }),
  createBillingPortal: () =>
    fetchAPI<{ url: string }>("/billing/portal", {
      method: "POST",
    }),
};

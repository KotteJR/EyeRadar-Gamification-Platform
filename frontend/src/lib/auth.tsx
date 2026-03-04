"use client";

/**
 * Auth context — wraps next-auth session with localStorage preferences.
 *
 * Authentication is handled by Keycloak via next-auth.
 * User preferences (avatar, items, etc.) are persisted in localStorage keyed
 * by the Keycloak subject (sub).
 *
 * Public interface is intentionally identical to the previous localStorage-only
 * implementation so that all existing consumers continue to work unchanged.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { api } from "@/lib/api";
import type { AvatarConfig } from "@/components/Avatar";
import { DEFAULT_AVATAR } from "@/components/Avatar";

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserRole = "teacher" | "student" | "guardian";

export interface User {
  username: string;
  role: UserRole;
  displayName: string;
  age: number;
  studentId: string;
  interests: string[];
  wizardCompleted: boolean;
  ownedItems: string[];
  avatarConfig: AvatarConfig;
}

/** Legacy type kept for teacher-UI backward compatibility */
export interface DynamicAccount {
  username: string;
  password: string | null;
  displayName: string;
  age: number;
  studentId: string;
}

interface AuthContextType {
  user: User | null;
  login: () => void;
  logout: () => Promise<void>;
  updateInterests: (interests: string[]) => void;
  completeWizard: () => void;
  purchaseItem: (itemId: string) => void;
  updateAvatar: (config: AvatarConfig) => void;
  setPassword: (newPassword: string) => void;
  isLoggedIn: boolean;
}

// ─── User Preferences (localStorage) ─────────────────────────────────────────

interface UserPrefs {
  age: number;
  interests: string[];
  wizardCompleted: boolean;
  ownedItems: string[];
  avatarConfig: AvatarConfig;
}

function prefsKey(sub: string) {
  return `eyeradar_prefs_${sub}`;
}

function loadPrefs(sub: string): Partial<UserPrefs> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(prefsKey(sub)) || "{}");
  } catch {
    return {};
  }
}

function savePrefs(sub: string, updates: Partial<UserPrefs>) {
  if (typeof window === "undefined") return;
  const existing = loadPrefs(sub);
  localStorage.setItem(prefsKey(sub), JSON.stringify({ ...existing, ...updates }));
}

// ─── Role derivation ──────────────────────────────────────────────────────────

function deriveRole(roles: string[] = []): UserRole {
  if (roles.includes("teacher")) return "teacher";
  if (roles.includes("guardian") || roles.includes("parent")) return "guardian";
  return "student";
}

// ─── Legacy dynamic accounts (teacher-created, stored locally) ───────────────
// These are kept for backward compat with the students UI.
// Keycloak is the source of truth for auth; these only store display metadata.

const ACCOUNTS_KEY = "eyeradar_accounts";

export function getDynamicAccounts(): DynamicAccount[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function registerStudentAccount(account: DynamicAccount) {
  const accounts = getDynamicAccounts();
  const idx = accounts.findIndex((a) => a.username === account.username);
  if (idx >= 0) {
    accounts[idx] = account;
  } else {
    accounts.push(account);
  }
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [prefs, setPrefs] = useState<Partial<UserPrefs>>({});
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [resolvedStudentId, setResolvedStudentId] = useState<string>("");

  const sub = session?.user?.id ?? "";
  const role = deriveRole(session?.roles);

  // Load prefs from localStorage when user identity is known
  useEffect(() => {
    if (sub) {
      const loaded = loadPrefs(sub);
      setPrefs(loaded);
      setPrefsLoaded(true);
    } else {
      setPrefsLoaded(false);
      setResolvedStudentId("");
    }
  }, [sub]);

  // Provision student in the backend whenever they log in and capture canonical DB student ID.
  useEffect(() => {
    if (sub && role === "student" && prefsLoaded) {
      api
        .upsertStudent(sub, {
          name: session?.user?.name || "Student",
          age: prefs.age ?? 10,
          grade: Math.max(1, Math.round((prefs.age ?? 10) - 5)),
          language: "en",
          interests: prefs.interests ?? [],
        })
        .then((student) => {
          if (student?.id) setResolvedStudentId(student.id);
        })
        .catch(() => {});
    }
  }, [sub, role, prefsLoaded]);

  // Ensure Keycloak account is mirrored into backend users/subscriptions on login.
  useEffect(() => {
    if (!sub) return;
    api.syncAccount().catch(() => {});
  }, [sub]);

  const user: User | null = useMemo(() => {
    if (!session || !sub) return null;
    const effectiveStudentId = role === "student" ? (resolvedStudentId || sub) : sub;
    return {
      username: session.user?.email || sub,
      role,
      displayName: session.user?.name || "User",
      age: prefs.age ?? 10,
      studentId: effectiveStudentId,
      interests: prefs.interests ?? [],
      wizardCompleted: prefs.wizardCompleted ?? false,
      ownedItems: prefs.ownedItems ?? [],
      avatarConfig: prefs.avatarConfig ?? { ...DEFAULT_AVATAR },
    };
  }, [session, sub, role, prefs, resolvedStudentId]);

  // ── Auth actions ────────────────────────────────────────────────────────────

  const login = useCallback(() => {
    signIn("keycloak");
  }, []);

  const logout = useCallback(async () => {
    const idToken = session?.idToken;
    await signOut({ redirect: false });

    const redirectUri =
      typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";

    // Always finish with a local redirect so logout cannot get stuck.
    if (typeof window === "undefined") return;

    const issuer = (process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER ?? "").replace(/\/$/, "");
    const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "";

    if (!issuer) {
      window.location.assign("/login");
      return;
    }

    // Best-effort Keycloak logout (do not block app logout if Keycloak rejects it).
    const params = new URLSearchParams({
      post_logout_redirect_uri: redirectUri,
    });
    if (clientId) params.set("client_id", clientId);
    if (idToken) params.set("id_token_hint", idToken);

    const keycloakLogoutUrl = `${issuer}/protocol/openid-connect/logout?${params.toString()}`;
    try {
      window.location.assign(keycloakLogoutUrl);
    } catch {
      window.location.assign("/login");
    }
  }, [session?.idToken]);

  // ── Preference mutations ────────────────────────────────────────────────────

  const updatePrefs = useCallback(
    (updates: Partial<UserPrefs>) => {
      if (!sub) return;
      setPrefs((prev) => {
        const next = { ...prev, ...updates };
        savePrefs(sub, next);
        return next;
      });
    },
    [sub]
  );

  const updateInterests = useCallback(
    (interests: string[]) => {
      updatePrefs({ interests });
      if (sub && role === "student") {
        api
          .upsertStudent(sub, {
            name: user?.displayName || "Student",
            age: user?.age ?? 10,
            grade: Math.max(1, Math.round((user?.age ?? 10) - 5)),
            language: "en",
            interests,
          })
          .catch(() => {});
      }
    },
    [updatePrefs, sub, role, user]
  );

  const completeWizard = useCallback(
    () => updatePrefs({ wizardCompleted: true }),
    [updatePrefs]
  );

  const purchaseItem = useCallback(
    (itemId: string) => {
      const current = prefs.ownedItems ?? [];
      if (!current.includes(itemId)) {
        updatePrefs({ ownedItems: [...current, itemId] });
      }
    },
    [updatePrefs, prefs.ownedItems]
  );

  const updateAvatar = useCallback(
    (config: AvatarConfig) => {
      updatePrefs({ avatarConfig: { ...(prefs.avatarConfig ?? DEFAULT_AVATAR), ...config } });
    },
    [updatePrefs, prefs.avatarConfig]
  );

  // Passwords are now managed by Keycloak — no-op here
  const setPassword = useCallback((_: string) => {}, []);

  // ── Loading state ───────────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F5F5]">
        <div className="w-8 h-8 border-2 border-[#FF5A39] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateInterests,
        completeWizard,
        purchaseItem,
        updateAvatar,
        setPassword,
        isLoggedIn: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

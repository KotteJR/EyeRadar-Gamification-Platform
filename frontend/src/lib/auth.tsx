"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api } from "@/lib/api";
import type { AvatarConfig } from "@/components/Avatar";
import { DEFAULT_AVATAR } from "@/components/Avatar";

// ─── Types ──────────────────────────────────────────────────────────────────

export type UserRole = "teacher" | "student";

export interface User {
  username: string;
  role: UserRole;
  displayName: string;
  age: number;
  studentId: string;
  interests: string[];
  wizardCompleted: boolean;
  ownedItems: string[];       // purchased shop item IDs
  avatarConfig: AvatarConfig; // current avatar look (DiceBear options)
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  updateInterests: (interests: string[]) => void;
  completeWizard: () => void;
  purchaseItem: (itemId: string) => void;
  updateAvatar: (config: AvatarConfig) => void;
  isLoggedIn: boolean;
}

// ─── Hardcoded Users ────────────────────────────────────────────────────────

const USERS: Record<string, { password: string; user: User }> = {
  teacher: {
    password: "teacher",
    user: {
      username: "teacher",
      role: "teacher",
      displayName: "Ms. Johnson",
      age: 35,
      studentId: "",
      interests: [],
      wizardCompleted: true,
      ownedItems: [],
      avatarConfig: DEFAULT_AVATAR,
    },
  },
  student5yrs: {
    password: "student5yrs",
    user: {
      username: "student5yrs",
      role: "student",
      displayName: "Alex",
      age: 5,
      studentId: "student-5",
      interests: [],
      wizardCompleted: false,
      ownedItems: [],
      avatarConfig: { ...DEFAULT_AVATAR },
    },
  },
  student10yrs: {
    password: "student10yrs",
    user: {
      username: "student10yrs",
      role: "student",
      displayName: "Jordan",
      age: 10,
      studentId: "student-10",
      interests: [],
      wizardCompleted: false,
      ownedItems: [],
      avatarConfig: { ...DEFAULT_AVATAR },
    },
  },
  student15yrs: {
    password: "student15yrs",
    user: {
      username: "student15yrs",
      role: "student",
      displayName: "Sam",
      age: 15,
      studentId: "student-15",
      interests: [],
      wizardCompleted: false,
      ownedItems: [],
      avatarConfig: { ...DEFAULT_AVATAR },
    },
  },
};

// ─── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("eyeradar_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate old format: if they have old avatarItems/equippedItems, reset to new format
        if (parsed && !parsed.avatarConfig) {
          parsed.avatarConfig = DEFAULT_AVATAR;
          parsed.ownedItems = parsed.ownedItems || [];
          delete parsed.avatarItems;
          delete parsed.equippedItems;
        }
        setUser(parsed);
        if (parsed?.role === "student" && parsed?.studentId) {
          api.upsertStudent(parsed.studentId, {
            name: parsed.displayName,
            age: parsed.age,
            grade: Math.max(1, Math.round(parsed.age - 5)),
            language: "en",
            interests: parsed.interests || [],
          }).catch(() => {});
        }
      } catch {
        localStorage.removeItem("eyeradar_user");
      }
    }
    setLoaded(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (loaded) {
      if (user) {
        localStorage.setItem("eyeradar_user", JSON.stringify(user));
      } else {
        localStorage.removeItem("eyeradar_user");
      }
    }
  }, [user, loaded]);

  const provisionStudent = useCallback(async (u: User) => {
    if (u.role !== "student" || !u.studentId) return;
    try {
      await api.upsertStudent(u.studentId, {
        name: u.displayName,
        age: u.age,
        grade: Math.max(1, Math.round(u.age - 5)),
        language: "en",
        interests: u.interests,
      });
    } catch { /* non-fatal */ }
  }, []);

  const login = (username: string, password: string): boolean => {
    const entry = USERS[username];
    if (!entry || entry.password !== password) return false;

    let userToSet: User;
    const saved = localStorage.getItem(`eyeradar_user_${username}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate old format
        if (!parsed.avatarConfig) {
          parsed.avatarConfig = DEFAULT_AVATAR;
          parsed.ownedItems = parsed.ownedItems || [];
          delete parsed.avatarItems;
          delete parsed.equippedItems;
        }
        userToSet = parsed;
      } catch {
        userToSet = { ...entry.user };
      }
    } else {
      userToSet = { ...entry.user };
    }

    setUser(userToSet);
    provisionStudent(userToSet);
    return true;
  };

  const logout = () => {
    if (user) {
      localStorage.setItem(`eyeradar_user_${user.username}`, JSON.stringify(user));
    }
    setUser(null);
  };

  const updateInterests = (interests: string[]) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, interests };
      provisionStudent(updated);
      return updated;
    });
  };

  const completeWizard = () => {
    setUser((prev) => prev ? { ...prev, wizardCompleted: true } : null);
  };

  const purchaseItem = (itemId: string) => {
    setUser((prev) => {
      if (!prev || prev.ownedItems.includes(itemId)) return prev;
      return { ...prev, ownedItems: [...prev.ownedItems, itemId] };
    });
  };

  const updateAvatar = (config: AvatarConfig) => {
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, avatarConfig: { ...prev.avatarConfig, ...config } };
    });
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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

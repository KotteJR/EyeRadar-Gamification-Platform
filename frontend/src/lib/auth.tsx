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

/** Dynamic student account created by teacher (stored in localStorage) */
export interface DynamicAccount {
  username: string;
  password: string | null;  // null = no password required
  displayName: string;
  age: number;
  studentId: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  updateInterests: (interests: string[]) => void;
  completeWizard: () => void;
  purchaseItem: (itemId: string) => void;
  updateAvatar: (config: AvatarConfig) => void;
  setPassword: (newPassword: string) => void;
  isLoggedIn: boolean;
}

// ─── Hardcoded Demo Users ────────────────────────────────────────────────────

const DEMO_USERS: Record<string, { password: string; user: User }> = {
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

// ─── Dynamic Accounts Helpers ────────────────────────────────────────────────

const ACCOUNTS_KEY = "eyeradar_accounts";

export function getDynamicAccounts(): DynamicAccount[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveDynamicAccounts(accounts: DynamicAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

/** Called by the teacher create-student form */
export function registerStudentAccount(account: DynamicAccount) {
  const accounts = getDynamicAccounts();
  const idx = accounts.findIndex((a) => a.username === account.username);
  if (idx >= 0) {
    accounts[idx] = account;
  } else {
    accounts.push(account);
  }
  saveDynamicAccounts(accounts);
}

/** Update the password for a dynamic account */
function updateDynamicPassword(username: string, password: string) {
  const accounts = getDynamicAccounts();
  const acc = accounts.find((a) => a.username === username);
  if (acc) {
    acc.password = password;
    saveDynamicAccounts(accounts);
  }
}

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
    // 1. Check hardcoded demo users
    const demoEntry = DEMO_USERS[username];
    if (demoEntry && demoEntry.password === password) {
      let userToSet: User;
      const saved = localStorage.getItem(`eyeradar_user_${username}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (!parsed.avatarConfig) {
            parsed.avatarConfig = DEFAULT_AVATAR;
            parsed.ownedItems = parsed.ownedItems || [];
          }
          userToSet = parsed;
        } catch {
          userToSet = { ...demoEntry.user };
        }
      } else {
        userToSet = { ...demoEntry.user };
      }
      setUser(userToSet);
      provisionStudent(userToSet);
      return true;
    }

    // 2. Check dynamic student accounts (created by teacher)
    const accounts = getDynamicAccounts();
    const dynAccount = accounts.find((a) => a.username === username);
    if (dynAccount) {
      // If no password set, accept any password (including empty)
      if (dynAccount.password !== null && dynAccount.password !== password) {
        return false;
      }

      let userToSet: User;
      const saved = localStorage.getItem(`eyeradar_user_${username}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (!parsed.avatarConfig) {
            parsed.avatarConfig = DEFAULT_AVATAR;
            parsed.ownedItems = parsed.ownedItems || [];
          }
          userToSet = parsed;
        } catch {
          userToSet = buildUserFromAccount(dynAccount);
        }
      } else {
        userToSet = buildUserFromAccount(dynAccount);
      }
      setUser(userToSet);
      provisionStudent(userToSet);
      return true;
    }

    return false;
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

  const setPassword = (newPassword: string) => {
    if (!user) return;
    // Update dynamic accounts storage
    updateDynamicPassword(user.username, newPassword);
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildUserFromAccount(acc: DynamicAccount): User {
  return {
    username: acc.username,
    role: "student",
    displayName: acc.displayName,
    age: acc.age,
    studentId: acc.studentId,
    interests: [],
    wizardCompleted: false,
    ownedItems: [],
    avatarConfig: { ...DEFAULT_AVATAR },
  };
}

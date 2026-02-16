"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, getDynamicAccounts } from "@/lib/auth";
import { api } from "@/lib/api";
import type {
  Student,
  GameDefinition,
  GamificationSummary,
  ExerciseSession,
  AdventureMap,
} from "@/types";
import { DEFICIT_AREA_LABELS } from "@/types";
import Avatar from "@/components/Avatar";
import { CATEGORY_ASSETS } from "@/lib/game-assets";
import type { DeficitArea } from "@/types";
import {
  Star,
  Trophy,
  Flame,
  ShoppingBag,
  ArrowRight,
  Lock,
  Check,
  Gamepad2,
  Map,
  Sparkles,
  Target,
  Zap,
  TrendingUp,
} from "lucide-react";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [gamification, setGamification] = useState<GamificationSummary | null>(null);
  const [games, setGames] = useState<GameDefinition[]>([]);
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [adventure, setAdventure] = useState<AdventureMap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.studentId) return;
    async function load() {
      try {
        await api.upsertStudent(user!.studentId, {
          name: user!.displayName,
          age: user!.age,
          grade: Math.max(1, Math.round(user!.age - 5)),
          language: "en",
          interests: user!.interests || [],
        });
      } catch {
        /* backend may be down */
      }

      const [s, g, allGames, adv, sess] = await Promise.all([
        api.getStudent(user!.studentId).catch(() => null),
        api.getGamificationSummary(user!.studentId).catch(() => null),
        api.getGames().catch(() => []),
        api.getStudentAdventure(user!.studentId).catch(() => null),
        api.getStudentSessions(user!.studentId).catch(() => []),
      ]);
      setStudent(s);
      setGamification(g);
      setGames(allGames);
      setSessions(sess);
      if (adv) setAdventure(adv);
      setLoading(false);
    }
    load();
  }, [user]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="student-ui flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
      </div>
    );
  }

  const ageGames = games.filter(
    (g) => g.age_range_min <= user.age && g.age_range_max >= user.age
  );
  const interests = user.interests;
  const points = student?.total_points ?? 0;
  const level = student?.level ?? 1;

  return (
    <div className="student-ui">
      {/* ─── Hero Section ──────────────────────────────────── */}
      <div className="bg-cream rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Avatar
                config={user.avatarConfig}
                seed={user.username}
                size={52}
                className="rounded-full flex-shrink-0"
              />
              <div>
                <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">
                  Hey, {user.displayName}!
                </h1>
                <p className="text-[13px] text-neutral-400">
                  {interests.length > 0
                    ? `Ready to play some ${interests.slice(0, 2).join(" & ")} games?`
                    : "Let's learn something new today."}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Star size={15} className="text-amber-400" fill="currentColor" />
                <span className="text-[14px] font-semibold text-neutral-800">{points.toLocaleString()}</span>
                <span className="text-[12px] text-neutral-400">pts</span>
              </div>
              <div className="w-px h-4 bg-neutral-300" />
              <div className="flex items-center gap-1.5">
                <Trophy size={15} className="text-neutral-400" />
                <span className="text-[14px] font-semibold text-neutral-800">Level {level}</span>
              </div>
              {student && student.current_streak > 0 && (
                <>
                  <div className="w-px h-4 bg-neutral-300" />
                  <div className="flex items-center gap-1.5">
                    <Flame size={15} className="text-orange-400" fill="currentColor" />
                    <span className="text-[14px] font-semibold text-neutral-800">{student.current_streak}</span>
                    <span className="text-[12px] text-neutral-400">day streak</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/student/games" className="btn-primary text-[13px]">
              <Gamepad2 size={15} />
              Play Now
            </Link>
            <Link href="/student/shop" className="btn-outline text-[13px]">
              <ShoppingBag size={15} />
              Shop
            </Link>
          </div>
        </div>
      </div>

      {/* ─── XP Progress ────────────────────────────────────── */}
      {gamification && (
        <div className="bg-cream rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[13px] font-semibold text-neutral-700">
              Level {gamification.level_info.level} &mdash; {gamification.level_info.title}
            </span>
            <span className="text-xs text-neutral-400 font-medium">
              {gamification.level_info.xp} / {gamification.level_info.xp_for_next_level} XP
            </span>
          </div>
          <div className="w-full h-3 bg-white rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(2, gamification.level_info.progress_percent)}%`,
                background: "linear-gradient(90deg, #FF5A39, #FF9E75)",
              }}
            />
          </div>
        </div>
      )}

      {/* ─── Adventure Map Card ────────────────────────────── */}
      <Link
        href="/student/map"
        className="block mb-6 group"
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#475093] to-[#303FAE] p-6 transition-all hover:shadow-lg">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
          <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/5 rounded-full translate-y-12" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                <Map size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-white">
                  {adventure ? "Continue Your Adventure" : "Adventure Map"}
                </h2>
                <p className="text-[13px] text-white/60 mt-0.5">
                  {adventure
                    ? `${adventure.worlds.length} worlds with ${adventure.worlds.reduce((s, w) => s + w.game_ids.length, 0)} exercises to explore`
                    : "Explore worlds and complete levels to earn stars!"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {adventure && (
                <div className="hidden sm:flex items-center gap-3 mr-4">
                  {adventure.worlds.slice(0, 3).map((w) => (
                    <div
                      key={w.deficit_area}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold border border-white/20"
                      style={{ backgroundColor: w.color + "80" }}
                    >
                      {w.world_number}
                    </div>
                  ))}
                  {adventure.worlds.length > 3 && (
                    <span className="text-white/50 text-xs font-medium">+{adventure.worlds.length - 3}</span>
                  )}
                </div>
              )}
              <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
                <ArrowRight size={18} className="text-white" />
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* ─── Quick Play Categories ────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-neutral-900 tracking-tight">Quick Play</h2>
          <Link href="/student/games" className="text-[12px] text-neutral-400 hover:text-neutral-900 font-medium flex items-center gap-1 transition-colors">
            See all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {(["phonological_awareness", "rapid_naming", "working_memory", "visual_processing", "reading_fluency", "comprehension"] as DeficitArea[]).map((area) => {
            const catAsset = CATEGORY_ASSETS[area];
            const count = ageGames.filter((g) => g.deficit_area === area).length;
            if (count === 0) return null;
            return (
              <Link
                key={area}
                href={`/student/games`}
                className="group relative overflow-hidden rounded-xl aspect-[4/3] transition-all hover:shadow-md"
              >
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${catAsset.gradient[0]}, ${catAsset.gradient[1]})` }} />
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105" style={{ backgroundImage: `url(${catAsset.image})` }} />
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2 z-[1]">
                  <p className="text-[11px] font-semibold text-white leading-tight drop-shadow-sm">{DEFICIT_AREA_LABELS[area]}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ─── Bottom cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* My Stats Card */}
        <StatsCard
          sessions={sessions}
          totalStars={gamification?.badges.filter((b) => b.earned).length ?? 0}
          points={points}
          gamesPlayed={sessions.length}
          streak={student?.current_streak ?? 0}
        />

        {/* Password Card */}
        <PasswordCard username={user.username} />
      </div>
    </div>
  );
}

// ─── Stats Card Component ────────────────────────────────────
function StatsCard({
  sessions,
  totalStars,
  points,
  gamesPlayed,
  streak,
}: {
  sessions: ExerciseSession[];
  totalStars: number;
  points: number;
  gamesPlayed: number;
  streak: number;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter((s) => s.started_at?.slice(0, 10) === today);
  const todayCount = todaySessions.length;
  const dailyGoal = 5;
  const goalPercent = Math.min(100, Math.round((todayCount / dailyGoal) * 100));

  const stats = [
    { icon: Target, label: "Today", value: `${todayCount}/${dailyGoal}`, color: "#475093" },
    { icon: Zap, label: "Total Games", value: gamesPlayed.toString(), color: "#f59e0b" },
    { icon: Star, label: "Points", value: points.toLocaleString(), color: "#eab308" },
    { icon: TrendingUp, label: "Streak", value: streak > 0 ? `${streak}d` : "0d", color: "#ef4444" },
  ];

  return (
    <div className="bg-cream rounded-2xl p-5">
      <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-3">
        My Progress
      </p>

      {/* Daily goal mini bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] font-medium text-neutral-600">Daily Goal</span>
          <span className="text-[11px] font-semibold text-[#475093]">{goalPercent}%</span>
        </div>
        <div className="w-full h-2 bg-white rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.max(2, goalPercent)}%`,
              background: goalPercent >= 100
                ? "linear-gradient(90deg, #10b981, #34d399)"
                : "linear-gradient(90deg, #475093, #6366f1)",
            }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl px-3 py-2.5 text-center">
            <stat.icon size={16} className="mx-auto mb-1" style={{ color: stat.color }} fill={stat.label === "Points" ? "currentColor" : "none"} />
            <p className="text-[15px] font-semibold text-neutral-900">{stat.value}</p>
            <p className="text-[10px] text-neutral-400 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      <Link href="/student/shop" className="flex items-center justify-center gap-1.5 text-xs text-neutral-500 font-medium mt-3 hover:text-[#475093] transition-colors">
        <ShoppingBag size={12} />
        Spend points in shop
        <ArrowRight size={11} />
      </Link>
    </div>
  );
}

// ─── Password Setting Component ────────────────────────────
function PasswordCard({ username }: { username: string }) {
  const { setPassword } = useAuth();
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const accounts = getDynamicAccounts();
  const account = accounts.find((a) => a.username === username);
  const hasPassword = account?.password !== null && account?.password !== undefined;

  if (!account) return null;

  const handleSave = () => {
    setError("");
    if (newPw.length < 3) {
      setError("Password must be at least 3 characters");
      return;
    }
    if (newPw !== confirmPw) {
      setError("Passwords don't match");
      return;
    }
    setPassword(newPw);
    setSaved(true);
    setNewPw("");
    setConfirmPw("");
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="bg-cream rounded-2xl p-5">
      <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Lock size={11} />
        {hasPassword ? "Change Password" : "Set a Password"}
      </p>
      {!hasPassword && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3 font-medium">
          Your account has no password. Anyone can log in as you!
        </p>
      )}
      <div className="space-y-2">
        <input
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          placeholder="New password"
          className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-[13px] bg-white placeholder:text-neutral-300"
        />
        <input
          type="password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          placeholder="Confirm password"
          className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-[13px] bg-white placeholder:text-neutral-300"
        />
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        {saved && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <Check size={13} />
            Password saved!
          </div>
        )}
        <button onClick={handleSave} className="btn-primary w-full justify-center text-[13px]">
          {hasPassword ? "Update Password" : "Set Password"}
        </button>
      </div>
    </div>
  );
}

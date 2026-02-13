"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, getDynamicAccounts } from "@/lib/auth";
import { api } from "@/lib/api";
import type {
  Student,
  GameDefinition,
  ExerciseRecommendation,
  GamificationSummary,
} from "@/types";
import { DEFICIT_AREA_LABELS, DEFICIT_AREA_COLORS } from "@/types";
import Avatar from "@/components/Avatar";
import ProgressBar from "@/components/ProgressBar";
import GameIcon from "@/components/GameIcon";
import { getGameAsset, CATEGORY_ASSETS } from "@/lib/game-assets";
import type { DeficitArea } from "@/types";
import {
  Star,
  Trophy,
  Flame,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Play,
  ArrowRight,
  Award,
  Lock,
  Check,
  Gamepad2,
  Zap,
} from "lucide-react";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [recommendations, setRecommendations] = useState<ExerciseRecommendation[]>([]);
  const [gamification, setGamification] = useState<GamificationSummary | null>(null);
  const [games, setGames] = useState<GameDefinition[]>([]);
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

      const [s, r, g, allGames] = await Promise.all([
        api.getStudent(user!.studentId).catch(() => null),
        api.getRecommendations(user!.studentId).catch(() => []),
        api.getGamificationSummary(user!.studentId).catch(() => null),
        api.getGames().catch(() => []),
      ]);
      setStudent(s);
      setRecommendations(r);
      setGamification(g);
      setGames(allGames);
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
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-neutral-700">
              Level {gamification.level_info.level} &mdash; {gamification.level_info.title}
            </span>
            <span className="text-xs text-neutral-400 font-medium">
              {gamification.level_info.xp} / {gamification.level_info.xp_for_next_level} XP
            </span>
          </div>
          <ProgressBar
            value={gamification.level_info.progress_percent}
            showPercentage={false}
            size="lg"
          />
        </div>
      )}

      {/* ─── Quick Play Categories ────────────────────────── */}
      <div className="mb-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Recommended Games ────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-neutral-900 tracking-tight">
                Recommended For You
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {interests.length > 0
                  ? `Based on your love of ${interests.slice(0, 3).join(", ")}`
                  : "Games picked for your skill level"}
              </p>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-cream text-neutral-500">
              <Sparkles size={11} />
              AI Picks
            </span>
          </div>

          {recommendations.length > 0 ? (
            <div className="bg-cream rounded-2xl divide-y divide-neutral-200/60">
              {recommendations.slice(0, 6).map((rec, idx) => {
                const color = DEFICIT_AREA_COLORS[rec.deficit_area] || "#6366f1";
                const areaLabel = DEFICIT_AREA_LABELS[rec.deficit_area] || rec.deficit_area;
                const game = games.find((g) => g.id === rec.game_id);
                const asset = game ? getGameAsset(game.id) : null;

                return (
                  <Link
                    key={`${rec.game_id}-${idx}`}
                    href={`/exercises/play?studentId=${user.studentId}&gameId=${rec.game_id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-200/30 transition-all group first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: asset ? `${asset.accent}12` : `${color}12`,
                        color: asset?.accent || color,
                      }}
                    >
                      {asset ? (
                        <GameIcon name={asset.icon} size={20} strokeWidth={1.5} />
                      ) : (
                        <Play size={18} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-neutral-900 group-hover:text-neutral-600 transition-colors">
                        {rec.game_name}
                      </p>
                      <p className="text-xs text-neutral-400 truncate">
                        {rec.reason}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${color}10`, color }}
                      >
                        {areaLabel}
                      </span>
                      <ChevronRight size={14} className="text-neutral-300" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-cream rounded-2xl p-10 text-center">
              <Sparkles size={28} className="text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500 mb-4 text-[13px] font-medium">
                No specific recommendations yet. Try some games!
              </p>
              <Link href="/student/games" className="btn-primary">
                <Play size={16} />
                Browse All Games
              </Link>
            </div>
          )}
        </div>

        {/* ─── Sidebar ──────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Points Card */}
          <div className="bg-cream rounded-2xl p-5">
            <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-3">
              Your Points
            </p>
            <div className="flex items-center gap-2 mb-3">
              <Star size={22} className="text-amber-400" fill="currentColor" />
              <p className="text-3xl font-semibold text-neutral-900">
                {points.toLocaleString()}
              </p>
            </div>
            <Link href="/student/shop" className="btn-primary w-full justify-center text-[13px]">
              <ShoppingBag size={15} />
              Visit Shop
            </Link>
          </div>

          {/* Badges */}
          {gamification && gamification.badges.length > 0 && (
            <div className="bg-cream rounded-2xl p-5">
              <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-3">
                Recent Badges
              </p>
              <div className="flex flex-wrap gap-2">
                {gamification.badges
                  .filter((b) => b.earned)
                  .slice(0, 6)
                  .map((badge) => (
                    <div
                      key={badge.id}
                      className="w-10 h-10 rounded-xl bg-white flex items-center justify-center"
                      title={badge.name}
                    >
                      <Award size={18} className="text-amber-500" />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Quick Play List */}
          <div className="bg-cream rounded-2xl p-5">
            <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-3">
              Quick Play
            </p>
            <div className="space-y-0.5">
              {ageGames.slice(0, 4).map((game) => {
                const asset = getGameAsset(game.id);
                return (
                  <Link
                    key={game.id}
                    href={`/exercises/play?studentId=${user.studentId}&gameId=${game.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/60 transition-colors group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${asset.accent}10`, color: asset.accent }}
                    >
                      <GameIcon name={asset.icon} size={15} strokeWidth={1.5} />
                    </div>
                    <span className="text-[13px] font-medium text-neutral-700 truncate group-hover:text-neutral-900 transition-colors">
                      {game.name}
                    </span>
                  </Link>
                );
              })}
            </div>
            <Link
              href="/student/games"
              className="flex items-center justify-center gap-1 text-xs text-neutral-500 font-medium mt-3 hover:text-neutral-900 transition-colors"
            >
              See all games
              <ArrowRight size={12} />
            </Link>
          </div>

          {/* Password Card */}
          <PasswordCard username={user.username} />
        </div>
      </div>
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

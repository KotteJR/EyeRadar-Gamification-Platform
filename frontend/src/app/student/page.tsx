"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
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
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading your dashboard...</p>
        </div>
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
    <div>
      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl p-8 mb-8 text-white relative overflow-hidden shadow-lg shadow-indigo-200/30">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Welcome back, {user.displayName}!
            </h1>
            <p className="text-indigo-200 text-sm">
              {interests.length > 0
                ? `Ready to play some ${interests.slice(0, 2).join(" & ")} games?`
                : "Ready for today's learning adventure?"}
            </p>
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3.5 py-1.5 text-sm font-medium">
                <span>&#11088;</span>
                <span>{points.toLocaleString()} pts</span>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-full px-3.5 py-1.5 text-sm font-medium">
                Level {level}
              </div>
              {student && student.current_streak > 0 && (
                <div className="bg-white/15 backdrop-blur-sm rounded-full px-3.5 py-1.5 text-sm font-medium">
                  {student.current_streak} day streak
                </div>
              )}
            </div>
          </div>
          <div className="hidden md:flex flex-col items-center gap-2">
            <Avatar
              config={user.avatarConfig}
              seed={user.username}
              size={88}
              className="border-4 border-white/20 shadow-lg"
            />
            <Link
              href="/student/shop"
              className="text-xs text-white/70 hover:text-white font-medium transition-colors"
            >
              Customize
            </Link>
          </div>
        </div>
      </div>

      {/* XP Progress */}
      {gamification && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Level {gamification.level_info.level} &mdash;{" "}
              {gamification.level_info.title}
            </span>
            <span className="text-xs text-slate-400">
              {gamification.level_info.xp} / {gamification.level_info.xp_for_next_level}{" "}
              XP
            </span>
          </div>
          <ProgressBar
            value={gamification.level_info.progress_percent}
            showPercentage={false}
            size="lg"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommended Games */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Recommended For You
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {interests.length > 0
                    ? `Based on your love of ${interests.slice(0, 3).join(", ")}`
                    : "Games picked for your skill level"}
                </p>
              </div>
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-600">
                AI Picks
              </span>
            </div>

            {recommendations.length > 0 ? (
              <div className="space-y-2">
                {recommendations.slice(0, 6).map((rec, idx) => {
                  const color =
                    DEFICIT_AREA_COLORS[rec.deficit_area] || "#6366f1";
                  const areaLabel =
                    DEFICIT_AREA_LABELS[rec.deficit_area] || rec.deficit_area;
                  const game = games.find((g) => g.id === rec.game_id);
                  return (
                    <Link
                      key={`${rec.game_id}-${idx}`}
                      href={`/exercises/play?studentId=${user.studentId}&gameId=${rec.game_id}`}
                      className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                    >
                      <span className="text-2xl">{game?.icon || "?"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                          {rec.game_name}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {rec.reason}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${color}12`, color }}
                        >
                          {areaLabel}
                        </span>
                        <svg
                          className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-7 h-7 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-slate-500 mb-4 text-sm">
                  No specific recommendations yet. Try some games!
                </p>
                <Link
                  href="/student/games"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Browse All Games
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Points Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Your Points
            </h3>
            <div className="text-center py-3">
              <p className="text-4xl font-bold text-indigo-600">
                {points.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">Total earned points</p>
            </div>
            <Link
              href="/student/shop"
              className="block w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-xl text-center hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm shadow-amber-200/50 mt-3"
            >
              Visit Shop
            </Link>
          </div>

          {/* Badges Preview */}
          {gamification && gamification.badges.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Recent Badges
              </h3>
              <div className="flex flex-wrap gap-2">
                {gamification.badges
                  .filter((b) => b.earned)
                  .slice(0, 6)
                  .map((badge) => (
                    <div
                      key={badge.id}
                      className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-xl"
                      title={badge.name}
                    >
                      {badge.icon}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Quick Play */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Quick Play
            </h3>
            <div className="space-y-1">
              {ageGames.slice(0, 4).map((game) => (
                <Link
                  key={game.id}
                  href={`/exercises/play?studentId=${user.studentId}&gameId=${game.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xl">{game.icon}</span>
                  <span className="text-sm font-medium text-slate-700 truncate">
                    {game.name}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/student/games"
              className="block text-center text-xs text-indigo-600 font-medium mt-3 hover:text-indigo-700 transition-colors"
            >
              See all games &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

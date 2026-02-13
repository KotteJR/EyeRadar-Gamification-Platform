"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AnalyticsOverview } from "@/types";
import { DEFICIT_AREA_LABELS, DEFICIT_AREA_COLORS } from "@/types";
import StatsCard from "@/components/StatsCard";
import ProgressBar from "@/components/ProgressBar";

export default function AnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;

  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics(studentId)
      .then(setAnalytics)
      .catch(() => router.push("/students"))
      .finally(() => setLoading(false));
  }, [studentId, router]);

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-[#FF5A39] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const trendIcon =
    analytics.improvement_trend === "improving" ? "📈" :
    analytics.improvement_trend === "declining" ? "📉" :
    analytics.improvement_trend === "stable" ? "➡️" : "🆕";

  const trendLabel =
    analytics.improvement_trend === "improving" ? "Improving" :
    analytics.improvement_trend === "declining" ? "Needs Attention" :
    analytics.improvement_trend === "stable" ? "Stable" :
    analytics.improvement_trend === "new" ? "Just Started" : "No Data";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-400 mb-6">
        <Link href="/students" className="hover:text-neutral-600">Students</Link>
        <span>/</span>
        <Link href={`/students/${studentId}`} className="hover:text-neutral-600">{analytics.student_name}</Link>
        <span>/</span>
        <span className="text-neutral-700">Analytics</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Analytics - {analytics.student_name}</h1>
        <p className="text-neutral-500 mt-1">Detailed progress and performance overview</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatsCard
          title="Total Sessions"
          value={analytics.total_sessions}
          subtitle={`~${analytics.total_time_minutes} min total`}
          color="indigo"
          icon={<span className="text-lg">&#x1F4CA;</span>}
        />
        <StatsCard
          title="Overall Accuracy"
          value={`${Math.round(analytics.overall_accuracy * 100)}%`}
          color="emerald"
          icon={<span className="text-lg">🎯</span>}
        />
        <StatsCard
          title="Trend"
          value={trendLabel}
          subtitle={`${trendIcon} Based on recent sessions`}
          color="amber"
          icon={<span className="text-lg">{trendIcon}</span>}
        />
        <StatsCard
          title="Areas Active"
          value={analytics.deficit_progress.filter((d) => d.sessions_completed > 0).length}
          subtitle="of 6 deficit areas"
          color="purple"
          icon={<span className="text-lg">🧩</span>}
        />
      </div>

      {/* Deficit Area Progress */}
      <div className="bg-cream rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-5">Deficit Area Progress</h2>
        <div className="space-y-6">
          {analytics.deficit_progress.map((dp) => {
            const label = DEFICIT_AREA_LABELS[dp.area] || dp.area;
            const color = DEFICIT_AREA_COLORS[dp.area] || "#6366f1";
            const accuracyPercent = Math.round(dp.avg_accuracy * 100);

            return (
              <div key={dp.area} className="border border-neutral-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900">{label}</h3>
                    <p className="text-xs text-neutral-400">
                      {dp.sessions_completed} sessions &middot; Initial severity: {dp.initial_severity}/5
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color }}>
                      {dp.sessions_completed > 0 ? `${accuracyPercent}%` : "—"}
                    </p>
                    <p className="text-xs text-neutral-400">Accuracy</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <ProgressBar
                    value={dp.current_level}
                    max={10}
                    label="Current Level"
                    color={color}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-medium text-neutral-700 mb-1.5">Accuracy Trend</p>
                    {dp.accuracy_trend.length > 0 ? (
                      <div className="flex items-end gap-1 h-6">
                        {dp.accuracy_trend.map((acc, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-t"
                            style={{
                              height: `${Math.max(4, acc * 100)}%`,
                              backgroundColor: color,
                              opacity: 0.4 + (i / dp.accuracy_trend.length) * 0.6,
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-300">No data yet</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-cream rounded-xl p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Recent Sessions</h2>
        {analytics.recent_sessions.length === 0 ? (
          <p className="text-sm text-neutral-400 py-4 text-center">No sessions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left text-xs font-medium text-neutral-400 uppercase tracking-wider py-3 px-2">Game</th>
                  <th className="text-left text-xs font-medium text-neutral-400 uppercase tracking-wider py-3 px-2">Area</th>
                  <th className="text-left text-xs font-medium text-neutral-400 uppercase tracking-wider py-3 px-2">Accuracy</th>
                  <th className="text-left text-xs font-medium text-neutral-400 uppercase tracking-wider py-3 px-2">Points</th>
                  <th className="text-left text-xs font-medium text-neutral-400 uppercase tracking-wider py-3 px-2">Status</th>
                  <th className="text-left text-xs font-medium text-neutral-400 uppercase tracking-wider py-3 px-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recent_sessions.map((s) => {
                  const areaLabel = DEFICIT_AREA_LABELS[s.deficit_area] || s.deficit_area;
                  const areaColor = DEFICIT_AREA_COLORS[s.deficit_area] || "#6366f1";
                  return (
                    <tr key={s.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                      <td className="py-3 px-2 text-sm font-medium text-neutral-900">{s.game_name}</td>
                      <td className="py-3 px-2">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${areaColor}15`, color: areaColor }}
                        >
                          {areaLabel}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm text-neutral-700">
                        {Math.round(s.accuracy * 100)}%
                      </td>
                      <td className="py-3 px-2 text-sm font-medium text-[#475093]">
                        +{s.points_earned}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          s.status === "completed"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm text-neutral-400">
                        {s.completed_at
                          ? new Date(s.completed_at).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

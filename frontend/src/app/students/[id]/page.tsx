"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type {
  Student,
  GameDefinition,
  ExerciseSession,
  ExerciseRecommendation,
  GamificationSummary,
  EyeRadarAssessment,
  DiagnosticInfo,
} from "@/types";
import {
  DEFICIT_AREA_LABELS,
  DEFICIT_AREA_COLORS,
  DYSLEXIA_TYPE_LABELS,
  SEVERITY_LABELS,
} from "@/types";
import StatsCard from "@/components/StatsCard";
import ProgressBar from "@/components/ProgressBar";
import BadgeCard from "@/components/BadgeCard";

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [games, setGames] = useState<GameDefinition[]>([]);
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [recommendations, setRecommendations] = useState<ExerciseRecommendation[]>([]);
  const [gamification, setGamification] = useState<GamificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentJson, setAssessmentJson] = useState("");
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "sessions" | "badges">("overview");
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;

    async function load() {
      try {
        const s = await api.getStudent(studentId);
        if (cancelled) return;
        setStudent(s);

        const [g, sess, r, gm] = await Promise.all([
          api.getGames().catch(() => []),
          api.getStudentSessions(studentId).catch(() => []),
          api.getRecommendations(studentId).catch(() => []),
          api.getGamificationSummary(studentId).catch(() => null),
        ]);
        if (cancelled) return;
        setGames(g);
        setSessions(sess);
        setRecommendations(r);
        setGamification(gm);
      } catch {
        if (!cancelled) router.push("/students");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [studentId, router]);

  const handleImportAssessment = async () => {
    try {
      const data: EyeRadarAssessment = JSON.parse(assessmentJson);
      setImporting(true);
      const updated = await api.importAssessment(
        studentId,
        data as unknown as Record<string, unknown>
      );
      setStudent(updated);
      setShowAssessment(false);
      setAssessmentJson("");
      const recs = await api.getRecommendations(studentId).catch(() => []);
      setRecommendations(recs);
    } catch {
      alert("Invalid JSON. Please check the format.");
    } finally {
      setImporting(false);
    }
  };

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-[#FF5A39] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const diagData = (student.diagnostic && Object.keys(student.diagnostic).length > 0
    ? student.diagnostic
    : null) as DiagnosticInfo | null;
  const hasDiag = diagData && diagData.dyslexia_type && diagData.dyslexia_type !== "unspecified";

  const deficitAreas = Object.keys(student.current_levels || {});
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const totalCorrect = completedSessions.reduce((sum, s) => sum + s.correct_count, 0);
  const totalItems = completedSessions.reduce((sum, s) => sum + s.total_items, 0);
  const overallAccuracy =
    totalItems > 0 ? Math.round((totalCorrect / totalItems) * 100) : 0;
  const avgResponseTime =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((sum, s) => sum + s.avg_response_time_ms, 0) /
            completedSessions.length
        )
      : 0;

  const areaStats: Record<string, { sessions: number; correct: number; total: number }> = {};
  for (const s of completedSessions) {
    const area = s.deficit_area;
    if (!areaStats[area]) areaStats[area] = { sessions: 0, correct: 0, total: 0 };
    areaStats[area].sessions++;
    areaStats[area].correct += s.correct_count;
    areaStats[area].total += s.total_items;
  }

  const getGameName = (gameId: string) =>
    games.find((g) => g.id === gameId)?.name || gameId;
  const getGameIcon = (gameId: string) =>
    games.find((g) => g.id === gameId)?.icon || "?";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-400 mb-6">
        <Link href="/students" className="hover:text-[#FF5A39] transition-colors">
          Students
        </Link>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-neutral-700 font-medium">{student.name}</span>
      </div>

      {/* Student Header */}
      <div className="bg-cream rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
              style={{ background: "linear-gradient(135deg, #475093, #303FAE)" }}
            >
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#303030]">{student.name}</h1>
              <p className="text-sm text-[#ABABAB]">
                Age {student.age} &middot; Grade {student.grade} &middot;{" "}
                {student.language.toUpperCase()}
              </p>
              {hasDiag && diagData && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#475093]/10 text-[#475093] font-semibold">
                    {DYSLEXIA_TYPE_LABELS[diagData.dyslexia_type]}
                  </span>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                    diagData.severity_level === "severe"
                      ? "bg-red-50 text-red-600"
                      : diagData.severity_level === "moderate"
                      ? "bg-orange-50 text-orange-600"
                      : "bg-emerald-50 text-emerald-600"
                  }`}>
                    {SEVERITY_LABELS[diagData.severity_level]}
                  </span>
                  {diagData.has_adhd && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">ADHD</span>}
                  {diagData.has_dyscalculia && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">Dyscalculia</span>}
                  {diagData.has_dysgraphia && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">Dysgraphia</span>}
                </div>
              )}
              {student.interests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {student.interests.map((i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-[11px] rounded-full font-medium text-white"
                      style={{ background: "linear-gradient(90deg, #FF5A39, #FF9E75)" }}
                    >
                      {i}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowAssessment(!showAssessment)}
            className="btn-primary px-4 py-2 text-sm font-medium"
          >
            {student.assessment ? "Update Assessment" : "Import Assessment"}
          </button>
        </div>
      </div>

      {/* Diagnostic Summary Card */}
      {hasDiag && diagData && (
        <div className="bg-cream rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-[#303030] mb-3">Deficit Area Severity Ratings</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {([
              ["phonological_severity", "Phonological"],
              ["rapid_naming_severity", "Rapid Naming"],
              ["working_memory_severity", "Working Memory"],
              ["visual_processing_severity", "Visual Processing"],
              ["reading_fluency_severity", "Reading Fluency"],
              ["comprehension_severity", "Comprehension"],
            ] as [keyof DiagnosticInfo, string][]).map(([key, label]) => {
              const val = (diagData[key] as number) || 3;
              const color = val <= 2 ? "#10b981" : val <= 3 ? "#f59e0b" : "#ef4444";
              return (
                <div key={key} className="text-center p-3 bg-[#F8F8F8] rounded-xl">
                  <div className="text-2xl font-bold" style={{ color }}>{val}</div>
                  <div className="text-[10px] text-[#999] font-medium mt-0.5">/5</div>
                  <div className="text-[11px] text-[#555] font-medium mt-1">{label}</div>
                </div>
              );
            })}
          </div>
          {diagData.notes && (
            <div className="mt-3 px-3 py-2 bg-[#F8F8F8] rounded-lg">
              <span className="text-[11px] text-[#999] font-medium">Notes: </span>
              <span className="text-xs text-[#555]">{diagData.notes}</span>
            </div>
          )}
        </div>
      )}

      {/* Assessment Import */}
      {showAssessment && (
        <div className="bg-cream rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-neutral-900 mb-3">
            Import EyeRadar Assessment
          </h2>
          <p className="text-xs text-neutral-400 mb-3">
            Paste the JSON assessment data from EyeRadar:
          </p>
          <textarea
            value={assessmentJson}
            onChange={(e) => setAssessmentJson(e.target.value)}
            placeholder={`{\n  "assessment_date": "2026-02-12T10:00:00Z",\n  "overall_severity": 3,\n  "deficits": { ... },\n  "reading_metrics": { ... }\n}`}
            rows={8}
            className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm font-mono bg-neutral-50/50 resize-none placeholder:text-neutral-300"
          />
          <div className="flex gap-3 mt-3">
            <button
              onClick={handleImportAssessment}
              disabled={importing || !assessmentJson.trim()}
              className="btn-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import"}
            </button>
            <button
              onClick={() => setShowAssessment(false)}
              className="px-4 py-2 bg-neutral-100 text-neutral-600 text-sm font-medium rounded-xl hover:bg-neutral-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatsCard
          title="Level"
          value={student.level}
          subtitle={gamification?.level_info.title || "Beginner"}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatsCard
          title="Sessions"
          value={completedSessions.length}
          subtitle="Completed"
          color="emerald"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatsCard
          title="Accuracy"
          value={`${overallAccuracy}%`}
          subtitle={`${totalCorrect}/${totalItems} correct`}
          color={overallAccuracy >= 70 ? "emerald" : overallAccuracy >= 40 ? "amber" : "rose"}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Avg Time"
          value={avgResponseTime > 0 ? `${(avgResponseTime / 1000).toFixed(1)}s` : "---"}
          subtitle="Per answer"
          color="purple"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Points"
          value={student.total_points.toLocaleString()}
          subtitle={`Streak: ${student.current_streak}d`}
          color="amber"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
        />
      </div>

      {/* XP Progress */}
      {gamification && (
        <div className="bg-cream rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700">
              Level {gamification.level_info.level} &mdash;{" "}
              {gamification.level_info.title}
            </span>
            <span className="text-xs text-neutral-400">
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

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-6 w-fit">
        {(["overview", "sessions", "badges"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tab === "sessions"
              ? `Sessions (${completedSessions.length})`
              : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ─── Overview Tab ──────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance by Area */}
          <div className="bg-cream rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-neutral-900 mb-4">
              Performance by Area
            </h2>
            {Object.keys(areaStats).length === 0 ? (
              <p className="text-sm text-neutral-400 py-4">
                No sessions yet. The student needs to play some games first.
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(areaStats)
                  .sort(([, a], [, b]) => b.sessions - a.sessions)
                  .map(([area, stats]) => {
                    const label =
                      DEFICIT_AREA_LABELS[area as keyof typeof DEFICIT_AREA_LABELS] ||
                      area;
                    const color =
                      DEFICIT_AREA_COLORS[area as keyof typeof DEFICIT_AREA_COLORS] ||
                      "#6366f1";
                    const acc =
                      stats.total > 0
                        ? Math.round((stats.correct / stats.total) * 100)
                        : 0;
                    return (
                      <div key={area}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm font-medium text-neutral-700">
                              {label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-neutral-400">
                            <span>{stats.sessions} sessions</span>
                            <span
                              className="font-semibold"
                              style={{
                                color:
                                  acc >= 70
                                    ? "#10b981"
                                    : acc >= 40
                                    ? "#f59e0b"
                                    : "#ef4444",
                              }}
                            >
                              {acc}%
                            </span>
                          </div>
                        </div>
                        <ProgressBar
                          value={acc}
                          max={100}
                          color={color}
                          showPercentage={false}
                          size="sm"
                        />
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Deficit Area Levels */}
          <div className="bg-cream rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-neutral-900 mb-4">
              Difficulty Levels
            </h2>
            {deficitAreas.length === 0 ? (
              <p className="text-sm text-neutral-400 py-4">
                No data yet. Levels update after playing games.
              </p>
            ) : (
              <div className="space-y-4">
                {deficitAreas.map((area) => {
                  const label =
                    DEFICIT_AREA_LABELS[area as keyof typeof DEFICIT_AREA_LABELS] ||
                    area;
                  const color =
                    DEFICIT_AREA_COLORS[area as keyof typeof DEFICIT_AREA_COLORS] ||
                    "#6366f1";
                  const level = student.current_levels[area] || 0;
                  return (
                    <ProgressBar
                      key={area}
                      value={level}
                      max={10}
                      label={`${label} — Lvl ${level}`}
                      color={color}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="bg-cream rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-neutral-900 mb-4">
              Recommended Next
            </h2>
            {recommendations.length === 0 ? (
              <p className="text-sm text-neutral-400">No recommendations yet.</p>
            ) : (
              <div className="space-y-2">
                {recommendations.slice(0, 5).map((rec, idx) => {
                  const color =
                    DEFICIT_AREA_COLORS[rec.deficit_area] || "#6366f1";
                  return (
                    <div
                      key={`${rec.game_id}-${idx}`}
                      className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 hover:border-neutral-200 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-neutral-800">
                          {rec.game_name}
                        </p>
                        <p className="text-xs text-neutral-400">{rec.reason}</p>
                      </div>
                      <span
                        className="text-[11px] font-medium px-2 py-1 rounded-full"
                        style={{ backgroundColor: `${color}12`, color }}
                      >
                        Lvl {rec.suggested_difficulty}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-cream rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-neutral-900 mb-4">
              Recent Activity
            </h2>
            {completedSessions.length === 0 ? (
              <p className="text-sm text-neutral-400">No sessions yet.</p>
            ) : (
              <div className="space-y-2">
                {completedSessions.slice(0, 5).map((s) => {
                  const accColor =
                    s.accuracy >= 80
                      ? "text-emerald-600"
                      : s.accuracy >= 50
                      ? "text-amber-600"
                      : "text-red-500";
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/80"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getGameIcon(s.game_id)}</span>
                        <div>
                          <p className="text-sm font-medium text-neutral-800">
                            {s.game_name}
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            {new Date(s.started_at).toLocaleDateString()} &middot; Lvl{" "}
                            {s.difficulty_level}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${accColor}`}>
                          {Math.round(s.accuracy)}%
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          {s.correct_count}/{s.total_items} &middot; +{s.points_earned}pts
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assessment Summary */}
          {student.assessment && (
            <div className="bg-cream rounded-2xl p-6 lg:col-span-2">
              <h2 className="text-sm font-semibold text-neutral-900 mb-4">
                Assessment Summary
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="p-3 bg-neutral-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-neutral-900">
                    {student.assessment.overall_severity}/5
                  </p>
                  <p className="text-[11px] text-neutral-400">Overall Severity</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-neutral-900">
                    {student.assessment.reading_metrics.words_per_minute}
                  </p>
                  <p className="text-[11px] text-neutral-400">Words/Min</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-neutral-900">
                    {student.assessment.reading_metrics.fixation_duration_ms}ms
                  </p>
                  <p className="text-[11px] text-neutral-400">Fixation Duration</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-neutral-900">
                    {(
                      student.assessment.reading_metrics.regression_rate * 100
                    ).toFixed(0)}
                    %
                  </p>
                  <p className="text-[11px] text-neutral-400">Regression Rate</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(student.assessment.deficits).map(
                  ([area, info]) => {
                    const label =
                      DEFICIT_AREA_LABELS[
                        area as keyof typeof DEFICIT_AREA_LABELS
                      ] || area;
                    return (
                      <div
                        key={area}
                        className="p-3 border border-neutral-100 rounded-xl"
                      >
                        <p className="text-sm font-medium text-neutral-700">
                          {label}
                        </p>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-lg font-bold text-neutral-900">
                            {info.severity}/5
                          </span>
                          <span className="text-xs text-neutral-400">
                            {info.percentile}th percentile
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Sessions Tab ──────────────────────────────────────── */}
      {activeTab === "sessions" && (
        <div>
          {sessions.length === 0 ? (
            <div className="bg-cream rounded-2xl p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                No sessions yet
              </h3>
              <p className="text-neutral-400 text-sm">
                This student hasn&apos;t played any games yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const isExpanded = expandedSession === session.id;
                const accColor =
                  session.accuracy >= 80
                    ? "text-emerald-700 bg-emerald-50"
                    : session.accuracy >= 50
                    ? "text-amber-700 bg-amber-50"
                    : "text-red-700 bg-red-50";
                const areaColor =
                  DEFICIT_AREA_COLORS[session.deficit_area] || "#6366f1";

                return (
                  <div
                    key={session.id}
                    className="bg-cream rounded-2xl overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedSession(isExpanded ? null : session.id)
                      }
                      className="w-full p-4 flex items-center justify-between hover:bg-neutral-50/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{getGameIcon(session.game_id)}</span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-neutral-900">
                              {session.game_name}
                            </p>
                            <span
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${areaColor}12`,
                                color: areaColor,
                              }}
                            >
                              {DEFICIT_AREA_LABELS[session.deficit_area] ||
                                session.deficit_area}
                            </span>
                            {session.status !== "completed" && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                                {session.status}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            {new Date(session.started_at).toLocaleString()} &middot;
                            Difficulty {session.difficulty_level}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${accColor}`}
                          >
                            {Math.round(session.accuracy)}%
                          </span>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-medium text-neutral-700">
                            {session.correct_count}/{session.total_items}
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            +{session.points_earned} pts
                          </p>
                        </div>
                        <svg
                          className={`w-4 h-4 text-neutral-400 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </button>

                    {isExpanded && session.results.length > 0 && (
                      <div className="border-t border-neutral-100 p-4 bg-neutral-50/40">
                        <div className="flex items-center gap-4 mb-4 text-xs text-neutral-400">
                          <span>
                            Avg response:{" "}
                            {(session.avg_response_time_ms / 1000).toFixed(1)}s
                          </span>
                          {session.badges_earned.length > 0 && (
                            <span>
                              Badges: {session.badges_earned.join(", ")}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wide px-3 mb-1">
                            <div className="col-span-1">#</div>
                            <div className="col-span-4">Question</div>
                            <div className="col-span-3">Their Answer</div>
                            <div className="col-span-3">Correct Answer</div>
                            <div className="col-span-1">Result</div>
                          </div>
                          {session.results.map((result, idx) => {
                            const item = session.items[idx];
                            return (
                              <div
                                key={idx}
                                className={`grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg text-sm ${
                                  result.is_correct
                                    ? "bg-emerald-50/50"
                                    : "bg-red-50/50"
                                }`}
                              >
                                <div className="col-span-1 text-xs text-neutral-400">
                                  {idx + 1}
                                </div>
                                <div
                                  className="col-span-4 text-neutral-700 truncate"
                                  title={item?.question}
                                >
                                  {item?.question || "—"}
                                </div>
                                <div
                                  className={`col-span-3 font-medium truncate ${
                                    result.is_correct
                                      ? "text-emerald-700"
                                      : "text-red-600"
                                  }`}
                                >
                                  {result.student_answer || "—"}
                                </div>
                                <div className="col-span-3 text-neutral-500 truncate">
                                  {result.correct_answer}
                                </div>
                                <div className="col-span-1 text-center">
                                  {result.is_correct ? (
                                    <span className="inline-block w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-xs leading-5 text-center font-bold">
                                      &#10003;
                                    </span>
                                  ) : (
                                    <span className="inline-block w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs leading-5 text-center font-bold">
                                      &#10007;
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Badges Tab ────────────────────────────────────────── */}
      {activeTab === "badges" && gamification && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {gamification.badges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      )}
    </div>
  );
}

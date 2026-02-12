"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Student, GameDefinition, ExerciseSession } from "@/types";
import { DEFICIT_AREA_LABELS, DEFICIT_AREA_COLORS } from "@/types";
import StatsCard from "@/components/StatsCard";

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [games, setGames] = useState<GameDefinition[]>([]);
  const [allSessions, setAllSessions] = useState<ExerciseSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getStudents().catch(() => []),
      api.getGames().catch(() => []),
    ]).then(async ([s, g]) => {
      setStudents(s);
      setGames(g);
      const sessionPromises = s.map((st: Student) =>
        api.getStudentSessions(st.id).catch(() => [])
      );
      const sessionArrays = await Promise.all(sessionPromises);
      const merged = sessionArrays
        .flat()
        .sort(
          (a: ExerciseSession, b: ExerciseSession) =>
            new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
      setAllSessions(merged);
      setLoading(false);
    });
  }, []);

  const totalPoints = students.reduce((sum, s) => sum + s.total_points, 0);
  const avgLevel = students.length
    ? Math.round(students.reduce((sum, s) => sum + s.level, 0) / students.length)
    : 0;
  const completedSessions = allSessions.filter((s) => s.status === "completed");
  const totalCorrect = completedSessions.reduce((sum, s) => sum + s.correct_count, 0);
  const totalItems = completedSessions.reduce((sum, s) => sum + s.total_items, 0);
  const overallAccuracy = totalItems > 0 ? Math.round((totalCorrect / totalItems) * 100) : 0;

  const getStudentName = (studentId: string) =>
    students.find((s) => s.id === studentId)?.name || "Unknown";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Overview of all students and their progress.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatsCard
          title="Students"
          value={students.length}
          subtitle="Active profiles"
          color="indigo"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Games"
          value={games.length}
          subtitle="Available"
          color="emerald"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Sessions"
          value={completedSessions.length}
          subtitle="Completed"
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatsCard
          title="Accuracy"
          value={overallAccuracy > 0 ? `${overallAccuracy}%` : "---"}
          subtitle={totalItems > 0 ? `${totalCorrect}/${totalItems}` : "No data"}
          color={overallAccuracy >= 70 ? "emerald" : "amber"}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Total Points"
          value={totalPoints.toLocaleString()}
          subtitle="All students"
          color="amber"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
        />
        <StatsCard
          title="Avg Level"
          value={avgLevel || "---"}
          subtitle="Student avg"
          color="purple"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Students Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Students</h2>
            <Link
              href="/students"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View All
            </Link>
          </div>
          {students.length === 0 ? (
            <div className="text-center py-10 px-6">
              <p className="text-slate-400 text-sm mb-3">No students yet</p>
              <Link
                href="/students"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add Student
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {students.slice(0, 6).map((student) => {
                const stuSessions = completedSessions.filter(
                  (s) => s.student_id === student.id
                );
                const stuCorrect = stuSessions.reduce((s, x) => s + x.correct_count, 0);
                const stuTotal = stuSessions.reduce((s, x) => s + x.total_items, 0);
                const stuAcc = stuTotal > 0 ? Math.round((stuCorrect / stuTotal) * 100) : 0;
                const accColor =
                  stuAcc >= 70
                    ? "text-emerald-600"
                    : stuAcc >= 40
                    ? "text-amber-600"
                    : stuAcc > 0
                    ? "text-red-500"
                    : "text-slate-300";

                return (
                  <Link
                    key={student.id}
                    href={`/students/${student.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{student.name}</p>
                        <p className="text-[11px] text-slate-400">
                          Lvl {student.level} &middot; {stuSessions.length} sessions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${accColor}`}>
                        {stuTotal > 0 ? `${stuAcc}%` : "---"}
                      </p>
                      <p className="text-[11px] text-slate-400">{student.total_points} pts</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Sessions Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Recent Sessions</h2>
          </div>
          {completedSessions.length === 0 ? (
            <div className="text-center py-10 px-6">
              <p className="text-slate-400 text-sm">No sessions yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="text-left px-6 py-3 font-medium">Student</th>
                    <th className="text-left px-3 py-3 font-medium">Game</th>
                    <th className="text-left px-3 py-3 font-medium">Area</th>
                    <th className="text-center px-3 py-3 font-medium">Score</th>
                    <th className="text-center px-3 py-3 font-medium">Accuracy</th>
                    <th className="text-right px-6 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {completedSessions.slice(0, 10).map((session) => {
                    const accColor =
                      session.accuracy >= 80
                        ? "bg-emerald-50 text-emerald-700"
                        : session.accuracy >= 50
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700";
                    const areaColor =
                      DEFICIT_AREA_COLORS[session.deficit_area] || "#6366f1";
                    return (
                      <tr
                        key={session.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-3">
                          <Link
                            href={`/students/${session.student_id}`}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            {getStudentName(session.student_id)}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-sm text-slate-700">{session.game_name}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${areaColor}15`,
                              color: areaColor,
                            }}
                          >
                            {DEFICIT_AREA_LABELS[session.deficit_area] ||
                              session.deficit_area}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-sm text-slate-600">
                            {session.correct_count}/{session.total_items}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${accColor}`}
                          >
                            {Math.round(session.accuracy)}%
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span className="text-xs text-slate-400">
                            {new Date(session.started_at).toLocaleDateString()}
                          </span>
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

      {/* Deficit Areas Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-5">
          Performance by Deficit Area
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {(
            [
              ["phonological_awareness", "Phonological"],
              ["rapid_naming", "Rapid Naming"],
              ["working_memory", "Working Memory"],
              ["visual_processing", "Visual Processing"],
              ["reading_fluency", "Reading Fluency"],
              ["comprehension", "Comprehension"],
            ] as const
          ).map(([area, shortLabel]) => {
            const color = DEFICIT_AREA_COLORS[area];
            const areaSessions = completedSessions.filter(
              (s) => s.deficit_area === area
            );
            const areaCorrect = areaSessions.reduce(
              (s, x) => s + x.correct_count,
              0
            );
            const areaTotal = areaSessions.reduce((s, x) => s + x.total_items, 0);
            const areaAcc =
              areaTotal > 0 ? Math.round((areaCorrect / areaTotal) * 100) : 0;

            return (
              <div
                key={area}
                className="p-4 rounded-xl border border-slate-100 text-center hover:border-slate-200 transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-lg mx-auto mb-2.5 flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: color }}
                >
                  {areaSessions.length}
                </div>
                <p className="text-xs font-semibold text-slate-700 mb-1">
                  {shortLabel}
                </p>
                <p
                  className="text-xl font-bold"
                  style={{
                    color:
                      areaAcc > 0
                        ? areaAcc >= 70
                          ? "#10b981"
                          : areaAcc >= 40
                          ? "#f59e0b"
                          : "#ef4444"
                        : "#cbd5e1",
                  }}
                >
                  {areaAcc > 0 ? `${areaAcc}%` : "---"}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {areaSessions.length} sessions
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

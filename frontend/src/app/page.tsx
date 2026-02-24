"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Student, ExerciseSession } from "@/types";
import { DEFICIT_AREA_LABELS, DEFICIT_AREA_COLORS } from "@/types";

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [allSessions, setAllSessions] = useState<ExerciseSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStudents().catch(() => []).then(async (s: Student[]) => {
      setStudents(s);
      const sessionArrays = await Promise.all(
        s.map((st: Student) => api.getStudentSessions(st.id).catch(() => []))
      );
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

  const completedSessions = allSessions.filter((s) => s.status === "completed");
  const totalCorrect = completedSessions.reduce((sum, s) => sum + s.correct_count, 0);
  const totalItems = completedSessions.reduce((sum, s) => sum + s.total_items, 0);
  const overallAccuracy = totalItems > 0 ? Math.round((totalCorrect / totalItems) * 100) : 0;

  const getStudentName = (studentId: string) =>
    students.find((s) => s.id === studentId)?.name || "Unknown";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Dashboard</h1>
        <p className="text-neutral-400 mt-0.5 text-[13px]">Overview of your students and their progress.</p>
      </div>

      {/* 3 Key Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-cream rounded-2xl p-5">
          <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Students</p>
          <p className="text-3xl font-bold text-neutral-900">{students.length}</p>
          <p className="text-xs text-neutral-400 mt-1">Active profiles</p>
        </div>
        <div className="bg-cream rounded-2xl p-5">
          <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Sessions</p>
          <p className="text-3xl font-bold text-neutral-900">{completedSessions.length}</p>
          <p className="text-xs text-neutral-400 mt-1">Completed total</p>
        </div>
        <div className="bg-cream rounded-2xl p-5">
          <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Accuracy</p>
          <p
            className="text-3xl font-bold"
            style={{
              color:
                overallAccuracy >= 70 ? "#10b981"
                  : overallAccuracy >= 40 ? "#f59e0b"
                  : overallAccuracy > 0 ? "#ef4444"
                  : "#cbd5e1",
            }}
          >
            {overallAccuracy > 0 ? `${overallAccuracy}%` : "---"}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            {totalItems > 0 ? `${totalCorrect} / ${totalItems} correct` : "No sessions yet"}
          </p>
        </div>
      </div>

      {/* Students + Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Student List */}
        <div className="bg-cream rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-semibold text-neutral-900">Students</h2>
            <Link href="/students" className="text-xs text-[#FF5A39] hover:text-[#FF5A39]/80 font-medium">
              Manage
            </Link>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-12 px-6">
              <p className="text-neutral-400 text-sm mb-4">No students yet</p>
              <Link href="/students" className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-medium">
                Add First Student
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {students.map((student) => {
                const stuSessions = completedSessions.filter((s) => s.student_id === student.id);
                const stuCorrect = stuSessions.reduce((s, x) => s + x.correct_count, 0);
                const stuTotal   = stuSessions.reduce((s, x) => s + x.total_items, 0);
                const stuAcc     = stuTotal > 0 ? Math.round((stuCorrect / stuTotal) * 100) : null;
                const lastSession = stuSessions[0];
                const lastActive  = lastSession
                  ? new Date(lastSession.started_at).toLocaleDateString("en", { month: "short", day: "numeric" })
                  : null;

                return (
                  <Link
                    key={student.id}
                    href={`/students/${student.id}`}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-neutral-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#475093]/10 flex items-center justify-center text-sm font-bold text-[#475093]">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-800">{student.name}</p>
                        <p className="text-[11px] text-neutral-400">
                          Age {student.age} &middot; {stuSessions.length} sessions
                          {lastActive && ` · ${lastActive}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {stuAcc !== null ? (
                        <p className="text-sm font-bold" style={{ color: stuAcc >= 70 ? "#10b981" : stuAcc >= 40 ? "#f59e0b" : "#ef4444" }}>
                          {stuAcc}%
                        </p>
                      ) : (
                        <p className="text-sm font-bold text-neutral-300">---</p>
                      )}
                      <p className="text-[11px] text-neutral-400">Lvl {student.level}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="lg:col-span-2 bg-cream rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-semibold text-neutral-900">Recent Sessions</h2>
          </div>

          {completedSessions.length === 0 ? (
            <div className="text-center py-16 px-6">
              <p className="text-neutral-400 text-sm">No sessions recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {completedSessions.slice(0, 12).map((session) => {
                const acc = Math.round(session.accuracy);
                const accColor =
                  acc >= 80 ? "bg-emerald-50 text-emerald-700"
                    : acc >= 50 ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-700";
                const areaColor = DEFICIT_AREA_COLORS[session.deficit_area] || "#6366f1";

                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between px-6 py-3 hover:bg-neutral-50/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Link
                        href={`/students/${session.student_id}`}
                        className="text-sm font-semibold text-[#FF5A39] hover:text-[#FF5A39]/80 shrink-0"
                      >
                        {getStudentName(session.student_id)}
                      </Link>
                      <span className="text-neutral-300 hidden sm:inline">·</span>
                      <p className="text-sm text-neutral-600 truncate hidden sm:block">{session.game_name}</p>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 hidden md:inline"
                        style={{ backgroundColor: `${areaColor}15`, color: areaColor }}
                      >
                        {DEFICIT_AREA_LABELS[session.deficit_area] || session.deficit_area}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-neutral-400 hidden sm:block">
                        {session.correct_count}/{session.total_items}
                      </span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${accColor}`}>
                        {acc}%
                      </span>
                      <span className="text-[11px] text-neutral-400 w-14 text-right hidden sm:block">
                        {new Date(session.started_at).toLocaleDateString("en", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

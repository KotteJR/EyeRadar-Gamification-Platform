"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type {
  Student,
  GameDefinition,
  ExerciseSession,
  EyeRadarAssessment,
  DiagnosticInfo,
  AdventureMap,
  AdventureWorld,
  AdventureSuggestResponse,
  AvailableGameForArea,
} from "@/types";
import {
  DEFICIT_AREA_LABELS,
  DEFICIT_AREA_COLORS,
  DYSLEXIA_TYPE_LABELS,
  SEVERITY_LABELS,
} from "@/types";
import ProgressBar from "@/components/ProgressBar";
import {
  Map,
  Sparkles,
  Plus,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Wand2,
  GripVertical,
  Gamepad2,
} from "lucide-react";

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = params.id as string;
  const initialTab = searchParams.get("tab") as "overview" | "sessions" | "adventure" | null;

  const [student, setStudent] = useState<Student | null>(null);
  const [games, setGames] = useState<GameDefinition[]>([]);
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentText, setAssessmentText] = useState("");
  const [assessmentFile, setAssessmentFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [assessmentFileName, setAssessmentFileName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "sessions" | "adventure">(initialTab || "overview");
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Adventure builder state
  const [adventure, setAdventure] = useState<AdventureMap | null>(null);
  const [adventureWorlds, setAdventureWorlds] = useState<AdventureWorld[]>([]);
  const [suggestion, setSuggestion] = useState<AdventureSuggestResponse | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [savingAdventure, setSavingAdventure] = useState(false);
  const [expandedWorld, setExpandedWorld] = useState<number | null>(null);
  const [availableGamesCache, setAvailableGamesCache] = useState<Record<string, AvailableGameForArea[]>>({});
  const [adventureReasoning, setAdventureReasoning] = useState<string[]>([]);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;

    async function load() {
      try {
        const s = await api.getStudent(studentId);
        if (cancelled) return;
        setStudent(s);

        const [g, sess, adv] = await Promise.all([
          api.getGames().catch(() => []),
          api.getStudentSessions(studentId).catch(() => []),
          api.getStudentAdventure(studentId).catch(() => null),
        ]);
        if (cancelled) return;
        setGames(g);
        setSessions(sess);
        if (adv) {
          setAdventure(adv);
          setAdventureWorlds(adv.worlds);
        }
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
    setImporting(true);
    try {
      let updated: import("@/types").Student;

      if (assessmentFile) {
        // File selected → send to AI extraction endpoint
        updated = await api.uploadAssessmentFile(studentId, assessmentFile);
      } else if (assessmentText.trim()) {
        // Plain text typed/pasted → wrap as a .txt file and send to AI
        const blob = new Blob([assessmentText], { type: "text/plain" });
        const textFile = new File([blob], "assessment_notes.txt", { type: "text/plain" });
        updated = await api.uploadAssessmentFile(studentId, textFile);
      } else {
        alert("Please upload a file or type/paste assessment notes.");
        setImporting(false);
        return;
      }

      setStudent(updated);
      setShowAssessment(false);
      setAssessmentText("");
      setAssessmentFile(null);
      setAssessmentFileName(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      alert(`Import failed: ${msg}`);
    } finally {
      setImporting(false);
    }
  };

  const handleAssessmentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAssessmentFileName(file.name);
    setAssessmentFile(file);
    setAssessmentText("");
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  // ─── Adventure Builder Handlers ─────────────────────────────────────

  const handleSuggestAdventure = async () => {
    if (!student) return;
    setSuggesting(true);
    try {
      const result = await api.suggestAdventure({ student_id: studentId });
      setSuggestion(result);
      setAdventureWorlds(result.suggested_worlds);
      setAdventureReasoning(result.reasoning);
    } catch (err) {
      console.error("Failed to get suggestion:", err);
    } finally {
      setSuggesting(false);
    }
  };

  const handleSaveAdventure = async () => {
    if (!student || adventureWorlds.length === 0) return;
    setSavingAdventure(true);
    try {
      const themeConfig = suggestion?.theme_config || {
        primary_interest: student.interests[0] || "",
        color_palette: "default",
        decoration_style: "nature",
      };

      if (adventure) {
        const updated = await api.updateAdventure(adventure.id, {
          worlds: adventureWorlds,
          theme_config: themeConfig,
        });
        setAdventure(updated);
      } else {
        const created = await api.createAdventure({
          student_id: studentId,
          created_by: "teacher",
          title: `${student.name}'s Adventure`,
          worlds: adventureWorlds,
          theme_config: themeConfig,
        });
        setAdventure(created);
      }
    } catch (err) {
      console.error("Failed to save adventure:", err);
    } finally {
      setSavingAdventure(false);
    }
  };

  const handleDeleteAdventure = async () => {
    if (!adventure) return;
    if (!confirm("Are you sure you want to delete this adventure map?")) return;
    try {
      await api.deleteAdventure(adventure.id);
      setAdventure(null);
      setAdventureWorlds([]);
      setSuggestion(null);
      setAdventureReasoning([]);
    } catch (err) {
      console.error("Failed to delete adventure:", err);
    }
  };

  const loadGamesForArea = async (area: string) => {
    if (availableGamesCache[area] || !student) return;
    try {
      const diag = student.diagnostic as DiagnosticInfo | null;
      const severity = diag?.severity_level;
      const result = await api.getGamesForArea(area, student.age, severity);
      setAvailableGamesCache((prev) => ({ ...prev, [area]: result }));
    } catch {
      // fallback
    }
  };

  const toggleGameInWorld = (worldIdx: number, gameId: string) => {
    setAdventureWorlds((prev) => {
      const updated = [...prev];
      const world = { ...updated[worldIdx] };
      if (world.game_ids.includes(gameId)) {
        world.game_ids = world.game_ids.filter((id) => id !== gameId);
      } else {
        world.game_ids = [...world.game_ids, gameId];
      }
      updated[worldIdx] = world;
      return updated;
    });
  };

  const removeWorld = (idx: number) => {
    setAdventureWorlds((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      return updated.map((w, i) => ({ ...w, world_number: i + 1 }));
    });
  };

  const addWorld = (area: string) => {
    const WORLD_NAMES: Record<string, string> = {
      phonological_awareness: "Sound Kingdom",
      rapid_naming: "Speed Valley",
      working_memory: "Memory Mountains",
      visual_processing: "Vision Forest",
      reading_fluency: "Fluency River",
      comprehension: "Story Castle",
    };
    const WORLD_COLORS: Record<string, string> = {
      phonological_awareness: "#6366f1",
      rapid_naming: "#f59e0b",
      working_memory: "#8b5cf6",
      visual_processing: "#10b981",
      reading_fluency: "#3b82f6",
      comprehension: "#ef4444",
    };

    if (adventureWorlds.some((w) => w.deficit_area === area)) return;

    setAdventureWorlds((prev) => [
      ...prev,
      {
        deficit_area: area,
        world_number: prev.length + 1,
        world_name: WORLD_NAMES[area] || area,
        color: WORLD_COLORS[area] || "#6366f1",
        game_ids: [],
      },
    ]);
  };

  const ALL_DEFICIT_AREAS = [
    "phonological_awareness",
    "rapid_naming",
    "working_memory",
    "visual_processing",
    "reading_fluency",
    "comprehension",
  ];

  const unusedAreas = ALL_DEFICIT_AREAS.filter(
    (a) => !adventureWorlds.some((w) => w.deficit_area === a)
  );

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

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const totalCorrect = completedSessions.reduce((sum, s) => sum + s.correct_count, 0);
  const totalItems = completedSessions.reduce((sum, s) => sum + s.total_items, 0);
  const overallAccuracy =
    totalItems > 0 ? Math.round((totalCorrect / totalItems) * 100) : 0;

  // All-time area stats
  const areaStats: Record<string, { sessions: number; correct: number; total: number }> = {};
  for (const s of completedSessions) {
    const area = s.deficit_area;
    if (!areaStats[area]) areaStats[area] = { sessions: 0, correct: 0, total: 0 };
    areaStats[area].sessions++;
    areaStats[area].correct += s.correct_count;
    areaStats[area].total += s.total_items;
  }

  // Monthly performance (current calendar month)
  const now = new Date();
  const monthSessions = completedSessions.filter((s) => {
    const d = new Date(s.started_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const monthAreaStats: Record<string, { sessions: number; correct: number; total: number }> = {};
  for (const s of monthSessions) {
    const area = s.deficit_area;
    if (!monthAreaStats[area]) monthAreaStats[area] = { sessions: 0, correct: 0, total: 0 };
    monthAreaStats[area].sessions++;
    monthAreaStats[area].correct += s.correct_count;
    monthAreaStats[area].total += s.total_items;
  }

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("adventure")}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                adventure
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  : "bg-gradient-to-r from-[#475093] to-[#303FAE] text-white hover:opacity-90"
              }`}
            >
              <Map size={15} />
              {adventure
                ? `Adventure (${adventure.worlds.length} worlds)`
                : "Set Up Adventure"}
            </button>
            <button
              onClick={() => setShowAssessment(!showAssessment)}
              className="btn-primary px-4 py-2 text-sm font-medium"
            >
              {student.assessment ? "Update Assessment" : "Import Assessment"}
            </button>
          </div>
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                {student.assessment ? "Replace EyeRadar Assessment" : "Import EyeRadar Assessment"}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Upload any report file — PDF, image, Word doc, JSON, or plain text. AI extracts the data automatically.
                {student.assessment && (
                  <span className="ml-1 text-amber-600 font-medium">This will replace the existing assessment.</span>
                )}
              </p>
            </div>
          </div>

          {/* File upload button */}
          <label className="flex items-center gap-3 w-full cursor-pointer border-2 border-dashed border-neutral-200 rounded-xl px-4 py-3 mb-3 hover:border-[#FF5A39]/50 hover:bg-neutral-50 transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-[#FF5A39]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#FF5A39]/15">
              <svg className="w-4 h-4 text-[#FF5A39]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              {assessmentFileName ? (
                <div>
                  <p className="text-sm font-medium text-neutral-700 truncate">{assessmentFileName}</p>
                  <p className="text-[11px] text-[#475093] mt-0.5">AI will extract assessment data from this file</p>
                </div>
              ) : (
                <p className="text-sm text-neutral-400">
                  <span className="font-medium text-[#FF5A39]">Upload any report</span>
                  <span className="text-neutral-400"> — PDF, image, DOCX, or any file</span>
                </p>
              )}
            </div>
            {assessmentFileName && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setAssessmentFileName(null); setAssessmentFile(null); setAssessmentText(""); }}
                className="text-neutral-400 hover:text-neutral-600 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <input
              type="file"
              accept="*"
              onChange={handleAssessmentFileUpload}
              className="sr-only"
            />
          </label>

          {/* Plain text notes — hidden once a file is selected */}
          {!assessmentFile && (
            <textarea
              value={assessmentText}
              onChange={(e) => setAssessmentText(e.target.value)}
              placeholder="Or type / paste any notes about the assessment here. Any format works — AI will extract the data. E.g., 'Student scored 25th percentile in phonological awareness, reads 65 WPM, fixation avg 300ms, moderate severity dyslexia, age 9...'"
              rows={5}
              className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-neutral-50/50 resize-none placeholder:text-neutral-300"
            />
          )}

          <div className="flex gap-3 mt-3">
            <button
              onClick={handleImportAssessment}
              disabled={importing || (!assessmentFile && !assessmentText.trim())}
              className="btn-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {importing ? "Extracting with AI..." : student.assessment ? "Replace Assessment" : "Import Assessment"}
            </button>
            <button
              onClick={() => { setShowAssessment(false); setAssessmentText(""); setAssessmentFile(null); setAssessmentFileName(null); }}
              className="px-4 py-2 bg-neutral-100 text-neutral-600 text-sm font-medium rounded-xl hover:bg-neutral-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 3 Key Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
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
        <div className="bg-cream rounded-2xl p-5">
          <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Streak</p>
          <p className="text-3xl font-bold text-neutral-900">{student.current_streak}</p>
          <p className="text-xs text-neutral-400 mt-1">
            {student.current_streak === 1 ? "day" : "days"} &middot; {student.total_points.toLocaleString()} pts
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-6 w-fit">
        {(["overview", "adventure", "sessions"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === tab
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tab === "adventure" && <Map size={14} />}
            {tab === "sessions"
              ? `Sessions (${completedSessions.length})`
              : tab === "adventure"
              ? `Adventure ${adventure ? "" : "(New)"}`
              : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ─── Overview Tab ──────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Performance by Area (all time) */}
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
                    const label = DEFICIT_AREA_LABELS[area as keyof typeof DEFICIT_AREA_LABELS] || area;
                    const color = DEFICIT_AREA_COLORS[area as keyof typeof DEFICIT_AREA_COLORS] || "#6366f1";
                    const acc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                    return (
                      <div key={area}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-sm font-medium text-neutral-700">{label}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-neutral-400">
                            <span>{stats.sessions} sessions</span>
                            <span
                              className="font-semibold"
                              style={{ color: acc >= 70 ? "#10b981" : acc >= 40 ? "#f59e0b" : "#ef4444" }}
                            >
                              {acc}%
                            </span>
                          </div>
                        </div>
                        <ProgressBar value={acc} max={100} color={color} showPercentage={false} size="sm" />
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Right column: Recent Sessions + Monthly Performance */}
          <div className="space-y-6">

            {/* Recent Sessions (last 3) */}
            <div className="bg-cream rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-neutral-900 mb-4">Recent Sessions</h2>
              {completedSessions.length === 0 ? (
                <p className="text-sm text-neutral-400">No sessions yet.</p>
              ) : (
                <div className="space-y-2">
                  {completedSessions.slice(0, 3).map((s) => {
                    const acc = Math.round(s.accuracy);
                    const accColor =
                      acc >= 80 ? "bg-emerald-50 text-emerald-700"
                        : acc >= 50 ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700";
                    const areaColor = DEFICIT_AREA_COLORS[s.deficit_area] || "#6366f1";
                    return (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/80">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-800 truncate">{s.game_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: `${areaColor}15`, color: areaColor }}
                            >
                              {DEFICIT_AREA_LABELS[s.deficit_area] || s.deficit_area}
                            </span>
                            <span className="text-[11px] text-neutral-400">
                              {new Date(s.started_at).toLocaleDateString("en", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-neutral-400">{s.correct_count}/{s.total_items}</span>
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${accColor}`}>{acc}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Monthly Performance */}
            <div className="bg-cream rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-neutral-900">This Month</h2>
                <span className="text-xs text-neutral-400">
                  {now.toLocaleString("en", { month: "long", year: "numeric" })}
                </span>
              </div>
              {Object.keys(monthAreaStats).length === 0 ? (
                <p className="text-sm text-neutral-400">No sessions this month yet.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(monthAreaStats)
                    .sort(([, a], [, b]) => b.sessions - a.sessions)
                    .map(([area, stats]) => {
                      const label = DEFICIT_AREA_LABELS[area as keyof typeof DEFICIT_AREA_LABELS] || area;
                      const color = DEFICIT_AREA_COLORS[area as keyof typeof DEFICIT_AREA_COLORS] || "#6366f1";
                      const acc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                      return (
                        <div key={area}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                              <span className="text-xs font-medium text-neutral-700">{label}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-neutral-400">{stats.sessions} sessions</span>
                              <span
                                className="font-semibold"
                                style={{ color: acc >= 70 ? "#10b981" : acc >= 40 ? "#f59e0b" : "#ef4444" }}
                              >
                                {acc}%
                              </span>
                            </div>
                          </div>
                          <ProgressBar value={acc} max={100} color={color} showPercentage={false} size="sm" />
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Assessment Summary - full width */}
          {student.assessment && (
            <div className="bg-cream rounded-2xl p-6 lg:col-span-2">
              <h2 className="text-sm font-semibold text-neutral-900 mb-4">Assessment Summary</h2>
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
                    {(student.assessment.reading_metrics.regression_rate * 100).toFixed(0)}%
                  </p>
                  <p className="text-[11px] text-neutral-400">Regression Rate</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(student.assessment.deficits).map(([area, info]) => {
                  const label = DEFICIT_AREA_LABELS[area as keyof typeof DEFICIT_AREA_LABELS] || area;
                  return (
                    <div key={area} className="p-3 border border-neutral-100 rounded-xl">
                      <p className="text-sm font-medium text-neutral-700">{label}</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-lg font-bold text-neutral-900">{info.severity}/5</span>
                        <span className="text-xs text-neutral-400">{info.percentile}th percentile</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Adventure Tab ─────────────────────────────────────── */}
      {activeTab === "adventure" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-cream rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-[#303030] flex items-center gap-2">
                  <Map size={18} className="text-[#475093]" />
                  Adventure Map Builder
                </h2>
                <p className="text-xs text-[#ABABAB] mt-1">
                  {adventure
                    ? `Active adventure with ${adventure.worlds.length} worlds — last updated ${new Date(adventure.updated_at).toLocaleDateString()}`
                    : "Create a personalized adventure map for this student with AI-assisted exercise selection."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {adventure && (
                  <button
                    onClick={handleDeleteAdventure}
                    className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete adventure"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* AI Suggestion */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSuggestAdventure}
                disabled={suggesting}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#475093] to-[#303FAE] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Wand2 size={15} />
                {suggesting ? "Analyzing profile..." : adventure ? "Re-generate with AI" : "Generate with AI"}
              </button>
              <span className="text-[11px] text-[#ABABAB]">
                AI analyzes dyslexia type, severity, age, and interests to recommend worlds &amp; exercises
              </span>
            </div>
          </div>

          {/* AI Reasoning */}
          {adventureReasoning.length > 0 && (
            <div className="bg-[#475093]/5 border border-[#475093]/10 rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-[#475093] mb-2 flex items-center gap-1.5">
                <Sparkles size={13} />
                AI Reasoning
              </h3>
              <ul className="space-y-1">
                {adventureReasoning.map((r, i) => (
                  <li key={i} className="text-xs text-[#555] flex items-start gap-2">
                    <span className="text-[#475093] mt-0.5">-</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Worlds Editor */}
          {adventureWorlds.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#303030]">
                  Worlds ({adventureWorlds.length})
                </h3>
                <span className="text-[11px] text-[#ABABAB]">
                  {adventureWorlds.reduce((s, w) => s + w.game_ids.length, 0)} total exercises
                </span>
              </div>

              {adventureWorlds.map((world, wIdx) => {
                const isExpanded = expandedWorld === wIdx;
                const areaGames = availableGamesCache[world.deficit_area] || [];
                const areaLabel = DEFICIT_AREA_LABELS[world.deficit_area as keyof typeof DEFICIT_AREA_LABELS] || world.deficit_area;

                return (
                  <div key={`${world.deficit_area}-${wIdx}`} className="bg-cream rounded-2xl overflow-hidden border border-[#E3E3E3]">
                    {/* World Header */}
                    <div className="flex items-center gap-3 p-4">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <GripVertical size={14} className="text-[#CDCDCD] flex-shrink-0" />
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: world.color }}
                        >
                          {world.world_number}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-[#303030] truncate">
                            {world.world_name}
                          </h4>
                          <p className="text-[11px] text-[#ABABAB]">
                            {areaLabel} - {world.game_ids.length} exercises
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            if (!isExpanded) loadGamesForArea(world.deficit_area);
                            setExpandedWorld(isExpanded ? null : wIdx);
                          }}
                          className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={16} className="text-[#777]" /> : <ChevronDown size={16} className="text-[#777]" />}
                        </button>
                        <button
                          onClick={() => removeWorld(wIdx)}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded: Game Selection */}
                    {isExpanded && (
                      <div className="border-t border-[#E3E3E3] p-4 bg-white/50">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-medium text-[#555]">
                            Select exercises for this world (3-6 recommended):
                          </p>
                          <span className="text-[10px] text-[#ABABAB] px-2 py-0.5 bg-neutral-100 rounded-full">
                            {world.game_ids.length} selected
                          </span>
                        </div>

                        {areaGames.length === 0 ? (
                          <div className="flex items-center justify-center py-6">
                            <div className="w-5 h-5 border-2 border-[#CDCDCD] border-t-[#475093] rounded-full animate-spin" />
                            <span className="text-xs text-[#ABABAB] ml-2">Loading games...</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {areaGames.map((game) => {
                              const isSelected = world.game_ids.includes(game.id);
                              return (
                                <button
                                  key={game.id}
                                  onClick={() => toggleGameInWorld(wIdx, game.id)}
                                  className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                                    isSelected
                                      ? "border-[#475093] bg-[#475093]/5"
                                      : "border-[#E3E3E3] hover:border-[#CDCDCD]"
                                  }`}
                                >
                                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-all ${
                                    isSelected ? "border-[#475093] bg-[#475093]" : "border-[#CDCDCD]"
                                  }`}>
                                    {isSelected && <Check size={12} className="text-white" />}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <Gamepad2 size={13} className={isSelected ? "text-[#475093]" : "text-[#ABABAB]"} />
                                      <span className={`text-sm font-medium ${isSelected ? "text-[#303030]" : "text-[#555]"}`}>
                                        {game.name}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[#999] mt-0.5 line-clamp-2">{game.description}</p>
                                    <div className="flex gap-2 mt-1.5">
                                      <span className="text-[10px] text-[#ABABAB] px-1.5 py-0.5 bg-neutral-100 rounded">
                                        Ages {game.age_range_min}-{game.age_range_max}
                                      </span>
                                      <span className="text-[10px] text-[#ABABAB] px-1.5 py-0.5 bg-neutral-100 rounded">
                                        {game.game_type.replace(/_/g, " ")}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add World */}
              {unusedAreas.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[#ABABAB]">Add world:</span>
                  {unusedAreas.map((area) => (
                    <button
                      key={area}
                      onClick={() => addWorld(area)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-dashed border-[#CDCDCD] text-[#777] hover:border-[#475093] hover:text-[#475093] transition-colors"
                    >
                      <Plus size={12} />
                      {DEFICIT_AREA_LABELS[area as keyof typeof DEFICIT_AREA_LABELS] || area}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {adventureWorlds.length === 0 && !suggesting && (
            <div className="bg-cream rounded-2xl p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#475093]/10 flex items-center justify-center mx-auto mb-4">
                <Map size={24} className="text-[#475093]" />
              </div>
              <h3 className="text-base font-semibold text-[#303030] mb-1">No Adventure Map Yet</h3>
              <p className="text-sm text-[#ABABAB] mb-4 max-w-sm mx-auto">
                Click &quot;Generate with AI&quot; to create a personalized adventure based on this student&apos;s profile, or manually add worlds below.
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {ALL_DEFICIT_AREAS.map((area) => (
                  <button
                    key={area}
                    onClick={() => addWorld(area)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-dashed border-[#CDCDCD] text-[#777] hover:border-[#475093] hover:text-[#475093] transition-colors"
                  >
                    <Plus size={12} />
                    {DEFICIT_AREA_LABELS[area as keyof typeof DEFICIT_AREA_LABELS]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          {adventureWorlds.length > 0 && (
            <div className="flex items-center justify-between bg-cream rounded-2xl p-5">
              <div>
                <p className="text-sm font-medium text-[#303030]">
                  {adventure ? "Update Adventure Map" : "Save Adventure Map"}
                </p>
                <p className="text-[11px] text-[#ABABAB] mt-0.5">
                  {adventureWorlds.length} worlds with{" "}
                  {adventureWorlds.reduce((s, w) => s + w.game_ids.length, 0)} exercises total.
                  {adventureWorlds.some((w) => w.game_ids.length === 0) && (
                    <span className="text-amber-500 ml-1">Some worlds have no exercises selected.</span>
                  )}
                </p>
              </div>
              <button
                onClick={handleSaveAdventure}
                disabled={savingAdventure || adventureWorlds.every((w) => w.game_ids.length === 0)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF5A39] to-[#FF9E75] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Check size={15} />
                {savingAdventure ? "Saving..." : adventure ? "Update" : "Save & Activate"}
              </button>
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
              <h3 className="text-lg font-semibold text-neutral-900 mb-1">No sessions yet</h3>
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
                  <div key={session.id} className="bg-cream rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedSession(isExpanded ? null : session.id)}
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
                              style={{ backgroundColor: `${areaColor}12`, color: areaColor }}
                            >
                              {DEFICIT_AREA_LABELS[session.deficit_area] || session.deficit_area}
                            </span>
                            {session.status !== "completed" && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                                {session.status}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            {new Date(session.started_at).toLocaleString()} &middot; Difficulty {session.difficulty_level}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${accColor}`}>
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
                          className={`w-4 h-4 text-neutral-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isExpanded && session.results.length > 0 && (
                      <div className="border-t border-neutral-100 p-4 bg-neutral-50/40">
                        <div className="flex items-center gap-4 mb-4 text-xs text-neutral-400">
                          <span>
                            Avg response: {(session.avg_response_time_ms / 1000).toFixed(1)}s
                          </span>
                          {session.badges_earned.length > 0 && (
                            <span>Badges: {session.badges_earned.join(", ")}</span>
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
                                  result.is_correct ? "bg-emerald-50/50" : "bg-red-50/50"
                                }`}
                              >
                                <div className="col-span-1 text-xs text-neutral-400">{idx + 1}</div>
                                <div className="col-span-4 text-neutral-700 truncate" title={item?.question}>
                                  {item?.question || "—"}
                                </div>
                                <div className={`col-span-3 font-medium truncate ${result.is_correct ? "text-emerald-700" : "text-red-600"}`}>
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
    </div>
  );
}

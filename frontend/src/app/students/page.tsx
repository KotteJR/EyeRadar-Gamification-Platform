"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { registerStudentAccount } from "@/lib/auth";
import type { Student, StudentCreate, DiagnosticInfo, DyslexiaType, SeverityLevel } from "@/types";
import {
  DYSLEXIA_TYPE_LABELS,
  DYSLEXIA_TYPE_DESCRIPTIONS,
  SEVERITY_LABELS,
  SEVERITY_DESCRIPTIONS,
  DEFICIT_AREA_LABELS,
} from "@/types";

const DEFAULT_DIAGNOSTIC: DiagnosticInfo = {
  dyslexia_type: "unspecified",
  severity_level: "moderate",
  phonological_severity: 3,
  rapid_naming_severity: 3,
  working_memory_severity: 3,
  visual_processing_severity: 3,
  reading_fluency_severity: 3,
  comprehension_severity: 3,
  has_adhd: false,
  has_dyscalculia: false,
  has_dysgraphia: false,
  notes: "",
};

const SEV_COLORS = ["", "bg-emerald-400", "bg-yellow-400", "bg-orange-400", "bg-red-400", "bg-red-600"];
const SEV_LABELS_SHORT = ["", "Mild", "Low-Mod", "Moderate", "High-Mod", "Severe"];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<StudentCreate>({
    name: "",
    age: 8,
    grade: 3,
    language: "en",
    interests: [],
    diagnostic: { ...DEFAULT_DIAGNOSTIC },
  });
  const [studentUsername, setStudentUsername] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [diagExpanded, setDiagExpanded] = useState(false);

  const diag = formData.diagnostic || DEFAULT_DIAGNOSTIC;

  const setDiag = (partial: Partial<DiagnosticInfo>) => {
    setFormData({
      ...formData,
      diagnostic: { ...diag, ...partial },
    });
  };

  const fetchStudents = () => {
    api
      .getStudents()
      .then(setStudents)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const autoUsername = formData.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const result = await api.createStudent(formData);

      // Register a login account for this student (no password by default)
      const uname = studentUsername.trim() || autoUsername;
      if (uname && result?.id) {
        registerStudentAccount({
          username: uname,
          password: null,  // no password required initially
          displayName: formData.name,
          age: formData.age,
          studentId: result.id,
        });
      }

      setShowForm(false);
      setFormData({
        name: "",
        age: 8,
        grade: 3,
        language: "en",
        interests: [],
        diagnostic: { ...DEFAULT_DIAGNOSTIC },
      });
      setStudentUsername("");
      setInterestInput("");
      setDiagExpanded(false);
      fetchStudents();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const addInterest = () => {
    if (
      interestInput.trim() &&
      !formData.interests?.includes(interestInput.trim())
    ) {
      setFormData({
        ...formData,
        interests: [...(formData.interests || []), interestInput.trim()],
      });
      setInterestInput("");
    }
  };

  const removeInterest = (interest: string) => {
    setFormData({
      ...formData,
      interests: (formData.interests || []).filter((i) => i !== interest),
    });
  };

  const getDiagLabel = (s: Student) => {
    const d = s.diagnostic as DiagnosticInfo | undefined;
    if (!d || !d.dyslexia_type || d.dyslexia_type === "unspecified") return null;
    return `${DYSLEXIA_TYPE_LABELS[d.dyslexia_type]} · ${SEVERITY_LABELS[d.severity_level]}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-[#FF5A39] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#303030]">Students</h1>
          <p className="text-[#ABABAB] mt-1 text-sm">
            Manage student profiles, diagnostic info, and track progress.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Student
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E3E3E3] shadow-sm p-6 mb-8">
          <h2 className="text-sm font-semibold text-[#303030] mb-4">New Student</h2>
          <form onSubmit={handleCreate} className="space-y-5">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#777] mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#E3E3E3] rounded-xl text-sm bg-[#F8F8F8] placeholder:text-[#ABABAB] focus:border-[#FF5A39] focus:ring-2 focus:ring-[#FF5A39]/20 transition-all"
                  placeholder="Student name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#777] mb-1.5">Login Username</label>
                <input
                  type="text"
                  value={studentUsername}
                  onChange={(e) => setStudentUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                  placeholder={autoUsername || "auto-generated from name"}
                  className="w-full px-3 py-2.5 border border-[#E3E3E3] rounded-xl text-sm bg-[#F8F8F8] placeholder:text-[#ABABAB] focus:border-[#FF5A39] focus:ring-2 focus:ring-[#FF5A39]/20 transition-all"
                />
                <p className="text-[10px] text-[#ABABAB] mt-1">
                  Student logs in with this. No password needed initially.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#777] mb-1.5">Age</label>
                <input
                  type="number"
                  min={4} max={18}
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-[#E3E3E3] rounded-xl text-sm bg-[#F8F8F8] focus:border-[#FF5A39] focus:ring-2 focus:ring-[#FF5A39]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#777] mb-1.5">Grade</label>
                <input
                  type="number"
                  min={0} max={12}
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: parseInt(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-[#E3E3E3] rounded-xl text-sm bg-[#F8F8F8] focus:border-[#FF5A39] focus:ring-2 focus:ring-[#FF5A39]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#777] mb-1.5">Language</label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#E3E3E3] rounded-xl text-sm bg-[#F8F8F8] focus:border-[#FF5A39] focus:ring-2 focus:ring-[#FF5A39]/20 transition-all"
                >
                  <option value="en">English</option>
                  <option value="el">Greek</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>

            {/* Interests */}
            <div>
              <label className="block text-xs font-medium text-[#777] mb-1.5">Interests</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInterest())}
                  placeholder="Add an interest..."
                  className="flex-1 px-3 py-2.5 border border-[#E3E3E3] rounded-xl text-sm bg-[#F8F8F8] placeholder:text-[#ABABAB] focus:border-[#FF5A39] focus:ring-2 focus:ring-[#FF5A39]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={addInterest}
                  className="px-3 py-2 bg-[#F0F0F0] text-[#555] text-sm rounded-xl hover:bg-[#E5E5E5] transition-colors font-medium"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.interests || []).map((interest) => (
                  <span
                    key={interest}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full text-white"
                    style={{ background: "linear-gradient(90deg, #FF5A39, #FF9E75)" }}
                  >
                    {interest}
                    <button type="button" onClick={() => removeInterest(interest)} className="hover:text-white/70">&times;</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Diagnostic Section */}
            <div className="border border-[#E3E3E3] rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setDiagExpanded(!diagExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#F8F8F8] hover:bg-[#F0F0F0] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#475093]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-[#303030]">Dyslexia Diagnostic Profile</span>
                  {diag.dyslexia_type !== "unspecified" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#475093]/10 text-[#475093] font-medium">
                      {DYSLEXIA_TYPE_LABELS[diag.dyslexia_type]} · {SEVERITY_LABELS[diag.severity_level]}
                    </span>
                  )}
                </div>
                <svg className={`w-4 h-4 text-[#999] transition-transform ${diagExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {diagExpanded && (
                <div className="p-4 space-y-5">
                  {/* Dyslexia Type */}
                  <div>
                    <label className="block text-xs font-semibold text-[#303030] mb-2">Dyslexia Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {(Object.keys(DYSLEXIA_TYPE_LABELS) as DyslexiaType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setDiag({ dyslexia_type: type })}
                          className={`text-left p-3 rounded-xl border-2 transition-all ${
                            diag.dyslexia_type === type
                              ? "border-[#475093] bg-[#475093]/5"
                              : "border-[#E3E3E3] hover:border-[#ABABAB]"
                          }`}
                        >
                          <span className={`text-sm font-semibold ${diag.dyslexia_type === type ? "text-[#475093]" : "text-[#303030]"}`}>
                            {DYSLEXIA_TYPE_LABELS[type]}
                          </span>
                          <p className="text-[11px] text-[#999] mt-0.5 leading-snug">
                            {DYSLEXIA_TYPE_DESCRIPTIONS[type]}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Severity Level */}
                  <div>
                    <label className="block text-xs font-semibold text-[#303030] mb-2">Overall Severity (DSM-5)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.keys(SEVERITY_LABELS) as SeverityLevel[]).map((sev) => (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setDiag({ severity_level: sev })}
                          className={`text-left p-3 rounded-xl border-2 transition-all ${
                            diag.severity_level === sev
                              ? "border-[#FF5A39] bg-[#FF5A39]/5"
                              : "border-[#E3E3E3] hover:border-[#ABABAB]"
                          }`}
                        >
                          <span className={`text-sm font-semibold ${diag.severity_level === sev ? "text-[#FF5A39]" : "text-[#303030]"}`}>
                            {SEVERITY_LABELS[sev]}
                          </span>
                          <p className="text-[11px] text-[#999] mt-0.5 leading-snug">{SEVERITY_DESCRIPTIONS[sev]}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Per-area Severity */}
                  <div>
                    <label className="block text-xs font-semibold text-[#303030] mb-3">
                      Per-Area Severity Ratings (1 = mild, 5 = severe)
                    </label>
                    <div className="space-y-3">
                      {([
                        ["phonological_severity", "Phonological Awareness"],
                        ["rapid_naming_severity", "Rapid Naming"],
                        ["working_memory_severity", "Working Memory"],
                        ["visual_processing_severity", "Visual Processing"],
                        ["reading_fluency_severity", "Reading Fluency"],
                        ["comprehension_severity", "Comprehension"],
                      ] as [keyof DiagnosticInfo, string][]).map(([key, label]) => {
                        const val = (diag[key] as number) || 3;
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <span className="text-xs text-[#555] w-40 flex-shrink-0">{label}</span>
                            <div className="flex-1 flex items-center gap-1.5">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => setDiag({ [key]: n } as Partial<DiagnosticInfo>)}
                                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                    n <= val
                                      ? `${SEV_COLORS[n]} text-white`
                                      : "bg-[#F0F0F0] text-[#ABABAB] hover:bg-[#E5E5E5]"
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                              <span className="text-[10px] text-[#999] ml-1.5">{SEV_LABELS_SHORT[val]}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Co-occurring conditions */}
                  <div>
                    <label className="block text-xs font-semibold text-[#303030] mb-2">Co-occurring Conditions</label>
                    <div className="flex flex-wrap gap-3">
                      {([
                        ["has_adhd", "ADHD"],
                        ["has_dyscalculia", "Dyscalculia"],
                        ["has_dysgraphia", "Dysgraphia"],
                      ] as [keyof DiagnosticInfo, string][]).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!diag[key]}
                            onChange={(e) => setDiag({ [key]: e.target.checked } as Partial<DiagnosticInfo>)}
                            className="w-4 h-4 rounded border-[#E3E3E3] text-[#475093] focus:ring-[#475093]"
                          />
                          <span className="text-sm text-[#555]">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-[#303030] mb-1.5">Specialist Notes</label>
                    <textarea
                      value={diag.notes || ""}
                      onChange={(e) => setDiag({ notes: e.target.value })}
                      rows={2}
                      placeholder="Any special instructions or observations..."
                      className="w-full px-3 py-2.5 border border-[#E3E3E3] rounded-xl text-sm bg-[#F8F8F8] placeholder:text-[#ABABAB] focus:border-[#FF5A39] focus:ring-2 focus:ring-[#FF5A39]/20 transition-all resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={creating}
                className="btn-primary px-5 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Student"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 bg-[#F0F0F0] text-[#555] text-sm font-medium rounded-xl hover:bg-[#E5E5E5] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Student List */}
      {students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E3E3E3] p-16 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#F0F0F0] flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#ABABAB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#303030] mb-1">No students yet</h3>
          <p className="text-[#ABABAB] text-sm mb-5">
            Add your first student to get started with personalized exercises.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 text-sm font-medium">
            Add Student
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {students.map((student) => {
            const diagLabel = getDiagLabel(student);
            return (
              <Link
                key={student.id}
                href={`/students/${student.id}`}
                className="bg-white rounded-2xl border border-[#E3E3E3] p-5 card-hover block shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #475093, #303FAE)" }}
                  >
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#303030]">{student.name}</h3>
                    <p className="text-xs text-[#ABABAB]">
                      Age {student.age} &middot; Grade {student.grade}
                    </p>
                  </div>
                </div>

                {/* Diagnostic badge */}
                {diagLabel && (
                  <div className="mb-3">
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#475093]/10 text-[#475093] font-medium">
                      {diagLabel}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2.5 bg-[#F8F8F8] rounded-xl">
                    <p className="text-lg font-bold text-[#303030]">{student.level}</p>
                    <p className="text-[10px] text-[#ABABAB] font-medium">Level</p>
                  </div>
                  <div className="text-center p-2.5 bg-[#F8F8F8] rounded-xl">
                    <p className="text-lg font-bold text-[#303030]">{student.total_points}</p>
                    <p className="text-[10px] text-[#ABABAB] font-medium">Points</p>
                  </div>
                  <div className="text-center p-2.5 bg-[#F8F8F8] rounded-xl">
                    <p className="text-lg font-bold text-[#303030]">{student.current_streak}</p>
                    <p className="text-[10px] text-[#ABABAB] font-medium">Streak</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${diagLabel ? "bg-emerald-400" : student.assessment ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span className="text-[11px] text-[#ABABAB]">
                    {diagLabel ? "Diagnostic set" : student.assessment ? "Assessment imported" : "No diagnostic yet"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

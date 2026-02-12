"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Student, StudentCreate } from "@/types";

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
  });
  const [interestInput, setInterestInput] = useState("");
  const [creating, setCreating] = useState(false);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createStudent(formData);
      setShowForm(false);
      setFormData({ name: "", age: 8, grade: 3, language: "en", interests: [] });
      setInterestInput("");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Manage student profiles and track progress.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Student
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            New Student
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 placeholder:text-slate-300"
                  placeholder="Student name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Age
                </label>
                <input
                  type="number"
                  min={4}
                  max={18}
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Grade
                </label>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={formData.grade}
                  onChange={(e) =>
                    setFormData({ ...formData, grade: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Language
                </label>
                <select
                  value={formData.language}
                  onChange={(e) =>
                    setFormData({ ...formData, language: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
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
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Interests
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addInterest())
                  }
                  placeholder="Add an interest..."
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 placeholder:text-slate-300"
                />
                <button
                  type="button"
                  onClick={addInterest}
                  className="px-3 py-2 bg-slate-100 text-slate-600 text-sm rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.interests || []).map((interest) => (
                  <span
                    key={interest}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full"
                  >
                    {interest}
                    <button
                      type="button"
                      onClick={() => removeInterest(interest)}
                      className="hover:text-indigo-900"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm shadow-indigo-200"
              >
                {creating ? "Creating..." : "Create Student"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Student List */}
      {students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No students yet</h3>
          <p className="text-slate-400 text-sm mb-5">
            Add your first student to get started with personalized exercises.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Add Student
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {students.map((student) => (
            <Link
              key={student.id}
              href={`/students/${student.id}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 card-hover block shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center text-base font-bold text-indigo-600">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {student.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Age {student.age} &middot; Grade {student.grade}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2.5 bg-slate-50 rounded-xl">
                  <p className="text-lg font-bold text-slate-900">{student.level}</p>
                  <p className="text-[10px] text-slate-400 font-medium">Level</p>
                </div>
                <div className="text-center p-2.5 bg-slate-50 rounded-xl">
                  <p className="text-lg font-bold text-slate-900">
                    {student.total_points}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">Points</p>
                </div>
                <div className="text-center p-2.5 bg-slate-50 rounded-xl">
                  <p className="text-lg font-bold text-slate-900">
                    {student.current_streak}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">Streak</p>
                </div>
              </div>

              {student.badges.length > 0 && (
                <div className="flex gap-1 mt-3">
                  {student.badges.slice(0, 5).map((b) => (
                    <span key={b} className="text-sm" title={b}>
                      {b === "first_steps"
                        ? "👶"
                        : b === "getting_started"
                        ? "🚶"
                        : b === "perfect_score"
                        ? "💯"
                        : b === "week_warrior"
                        ? "⚔️"
                        : "🏅"}
                    </span>
                  ))}
                  {student.badges.length > 5 && (
                    <span className="text-xs text-slate-400 self-center">
                      +{student.badges.length - 5}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    student.assessment ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span className="text-[11px] text-slate-400">
                  {student.assessment
                    ? "Assessment imported"
                    : "No assessment yet"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

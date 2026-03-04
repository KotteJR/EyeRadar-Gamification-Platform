"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { BillingSummary, ParentChildCreate, Student } from "@/types";
import { CreditCard, Plus, Users, Crown, ExternalLink } from "lucide-react";

const PENDING_CHILD_KEY = "eyeradar_pending_child_create";

const defaultStudent: ParentChildCreate = {
  name: "",
  username: "",
  password: "",
  confirm_password: "",
  age: 8,
  grade: 3,
  language: "en",
  interests: [],
};

export default function ParentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [children, setChildren] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsExtraSlot, setNeedsExtraSlot] = useState(false);
  const [form, setForm] = useState<ParentChildCreate>(defaultStudent);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [s, kids] = await Promise.all([
        api.getBillingSummary(),
        api.getParentStudents(),
      ]);
      setSummary(s);
      setChildren(kids);
      setError("");
      setNeedsExtraSlot(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load parent dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout !== "child_slot_success") return;
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(PENDING_CHILD_KEY);
    if (!raw) return;

    const createPendingChild = async () => {
      try {
        const pending = JSON.parse(raw) as ParentChildCreate;
        await api.createParentStudent(pending);
        sessionStorage.removeItem(PENDING_CHILD_KEY);
        setForm(defaultStudent);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create child");
      }
    };

    void createPendingChild();
  }, [searchParams]);

  const slotsText = useMemo(() => {
    if (!summary) return "—";
    return `${summary.children_count}/${summary.subscription.child_slots}`;
  }, [summary]);
  const hasActiveGuardianPlan =
    (summary?.subscription.plan ?? "").toLowerCase() === "guardian" &&
    (summary?.subscription.status ?? "").toLowerCase() === "active";

  const beginParentPlanCheckout = async () => {
    try {
      const res = await api.createParentPlanCheckout();
      window.location.href = res.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout");
    }
  };

  const beginAddChildCheckout = async () => {
    try {
      const res = await api.createAddChildSlotCheckout();
      window.location.href = res.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start child slot checkout");
    }
  };

  const openBillingPortal = async () => {
    try {
      const res = await api.createBillingPortal();
      window.location.href = res.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open billing portal");
    }
  };

  const createChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    setNeedsExtraSlot(false);
    try {
      await api.createParentStudent(form);
      setForm(defaultStudent);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create child";
      setError(message);
      if (message.toLowerCase().includes("child limit reached")) {
        setNeedsExtraSlot(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(PENDING_CHILD_KEY, JSON.stringify(form));
        }
        await beginAddChildCheckout();
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="w-8 h-8 border-2 border-[#FF5A39] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const panelCardClass =
    "rounded-2xl border border-white/25 bg-white/90 backdrop-blur-xl shadow-2xl";
  const inputClass =
    "w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/[0.06] transition-all";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] text-white/85 mb-1">Guardian Portal</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Hello, {user?.displayName?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="text-[14px] text-white/90 mt-1">
          Manage subscription, child slots, and children accounts.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl border border-red-200/80 bg-red-50/95 text-sm text-red-700">
          <p>{error}</p>
          {needsExtraSlot && (
            <p className="mt-2 text-xs text-red-700">
              Redirecting to checkout for extra child slot...
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${panelCardClass} p-5`}>
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF5A39] flex items-center justify-center mb-3">
            <Crown size={17} />
          </div>
          <p className="text-lg font-bold text-neutral-900 capitalize">
            {summary?.subscription.plan ?? "free"}
          </p>
          <p className="text-[12px] text-neutral-500 mt-0.5">Current plan</p>
        </div>

        <div className={`${panelCardClass} p-5`}>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Users size={17} />
          </div>
          <p className="text-lg font-bold text-neutral-900">{slotsText}</p>
          <p className="text-[12px] text-neutral-500 mt-0.5">Children / Slots</p>
        </div>

        <div className={`${panelCardClass} p-5`}>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <CreditCard size={17} />
          </div>
          <p className="text-lg font-bold text-neutral-900 capitalize">
            {summary?.subscription.status ?? "active"}
          </p>
          <p className="text-[12px] text-neutral-500 mt-0.5">Subscription status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${panelCardClass} p-6`}>
          <h3 className="text-[15px] font-semibold text-neutral-900 mb-4">Add Child</h3>
          <form onSubmit={createChild} className="space-y-3">
            <input
              type="text"
              required
              placeholder="Child name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              required
              minLength={3}
              placeholder="Child username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className={inputClass}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="password"
                required
                minLength={8}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputClass}
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Confirm password"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={4}
                max={18}
                required
                value={form.age}
                onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
                className={inputClass}
              />
              <input
                type="number"
                min={0}
                max={12}
                required
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full h-12 rounded-xl text-white text-[14px] font-semibold hover:brightness-110 active:scale-[0.99] active:brightness-95 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2.5"
              style={{ background: "linear-gradient(90deg, #FF9E75 0%, #FF5A39 100%)" }}
            >
              <Plus size={15} />
              {creating ? "Creating..." : "Create Child Account"}
            </button>
          </form>
        </div>

        <div className={`${panelCardClass} p-6`}>
          <h3 className="text-[15px] font-semibold text-neutral-900 mb-3">Your Children</h3>
          {children.length === 0 ? (
            <p className="text-sm text-neutral-600">No children added yet.</p>
          ) : (
            <div className="space-y-3">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => router.push(`/students/${child.id}`)}
                  className="w-full text-left rounded-xl border border-neutral-200 bg-white px-4 py-3 hover:bg-neutral-50 transition-colors"
                >
                  <p className="text-sm font-semibold text-neutral-900">{child.name}</p>
                  <p className="text-xs text-neutral-600">
                    Age {child.age} · Grade {child.grade} · Level {child.level}
                  </p>
                  {child.login_username && (
                    <p className="text-xs text-neutral-600 mt-0.5">
                      Username:{" "}
                      <span className="font-medium text-neutral-700">{child.login_username}</span>
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`${panelCardClass} p-6 space-y-3`}>
        <h3 className="text-[15px] font-semibold text-neutral-900">Billing Actions</h3>
        {!hasActiveGuardianPlan && (
          <button
            onClick={beginParentPlanCheckout}
            className="w-full md:w-auto h-12 px-5 rounded-xl text-white text-[14px] font-semibold hover:brightness-110 active:scale-[0.99] active:brightness-95 transition-all"
            style={{ background: "linear-gradient(90deg, #FF9E75 0%, #FF5A39 100%)" }}
          >
            Start Guardian Plan (EUR 10 / month)
          </button>
        )}
        <button
          onClick={openBillingPortal}
          className="w-full md:w-auto h-11 px-5 rounded-xl border border-neutral-200 text-neutral-700 text-sm font-semibold bg-white hover:bg-neutral-50 transition-colors inline-flex items-center justify-center gap-2"
        >
          Open Billing Portal
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
}

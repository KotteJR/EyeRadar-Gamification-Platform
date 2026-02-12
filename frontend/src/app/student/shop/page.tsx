"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  AVATAR_ITEMS,
  RARITY_COLORS,
  CATEGORY_LABELS,
  type AvatarCategory,
  type AvatarItem,
} from "@/lib/avatar-items";
import Avatar from "@/components/Avatar";
import type { AvatarConfig } from "@/components/Avatar";
import type { Student } from "@/types";

const ALL_CATEGORIES: AvatarCategory[] = [
  "top",
  "clothing",
  "clothesColor",
  "accessories",
  "eyes",
  "mouth",
  "skinColor",
  "hairColor",
  "hatColor",
];

export default function ShopPage() {
  const { user, purchaseItem, updateAvatar } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [activeCategory, setActiveCategory] = useState<AvatarCategory | "all">("all");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.studentId) return;
    api.getStudent(user.studentId).then(setStudent).catch(() => {});
  }, [user]);

  const points = student?.total_points ?? 0;
  const owned = user?.ownedItems ?? [];
  const currentConfig = user?.avatarConfig ?? {};

  const filtered = useMemo(
    () =>
      activeCategory === "all"
        ? AVATAR_ITEMS
        : AVATAR_ITEMS.filter((i) => i.category === activeCategory),
    [activeCategory]
  );

  const selectedItemData = useMemo(
    () => (selectedItem ? AVATAR_ITEMS.find((i) => i.id === selectedItem) : null),
    [selectedItem]
  );

  // Stable preview config: only compute when selected item changes
  const previewConfig = useMemo<AvatarConfig | null>(() => {
    if (!selectedItemData) return null;
    return {
      ...currentConfig,
      [selectedItemData.optionKey]: [selectedItemData.optionValue],
    };
  }, [selectedItemData, currentConfig]);

  const isEquipped = useCallback(
    (item: AvatarItem): boolean => {
      const val = currentConfig[item.optionKey as keyof AvatarConfig];
      return Array.isArray(val) && val.includes(item.optionValue);
    },
    [currentConfig]
  );

  const handleBuy = useCallback(
    (item: AvatarItem) => {
      if (owned.includes(item.id) || points < item.cost) return;
      purchaseItem(item.id);
      updateAvatar({ [item.optionKey]: [item.optionValue] });
      setSelectedItem(null);
    },
    [owned, points, purchaseItem, updateAvatar]
  );

  const handleEquip = useCallback(
    (item: AvatarItem) => {
      updateAvatar({ [item.optionKey]: [item.optionValue] });
      setSelectedItem(null);
    },
    [updateAvatar]
  );

  const handleUnequip = useCallback(
    (item: AvatarItem) => {
      const defaults: Record<string, string[]> = {
        clothing: ["hoodie"],
        clothesColor: ["65c9ff"],
        top: ["shortFlat"],
        hatColor: ["65c9ff"],
        accessories: [],
        eyes: ["default"],
        mouth: ["smile"],
        skinColor: ["ffdbb4"],
        hairColor: ["2c1b18"],
      };
      updateAvatar({ [item.optionKey]: defaults[item.optionKey] || [] });
      setSelectedItem(null);
    },
    [updateAvatar]
  );

  if (!user) return null;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link href="/student" className="hover:text-indigo-600 transition-colors">
          Dashboard
        </Link>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-700 font-medium">Avatar Shop</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ─── Sticky Avatar Preview ───────────────────────────────── */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden lg:sticky lg:top-6 shadow-sm">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 flex flex-col items-center">
              <Avatar
                config={previewConfig || currentConfig}
                seed={user.username}
                size={180}
              />
              <div
                className={`mt-3 text-xs font-medium px-3 py-1 rounded-full transition-opacity duration-200 ${
                  previewConfig ? "opacity-100 bg-amber-100 text-amber-700" : "opacity-0"
                }`}
              >
                Preview Mode
              </div>
            </div>
            <div className="p-5 text-center border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Points Available</p>
              <p className="text-3xl font-bold text-indigo-600">
                {points.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* ─── Shop Content ──────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Avatar Shop</h1>
            <p className="text-slate-500 mt-1">
              Click an item to preview, then buy or equip it.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => { setActiveCategory("all"); setSelectedItem(null); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeCategory === "all"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              All ({AVATAR_ITEMS.length})
            </button>
            {ALL_CATEGORIES.map((cat) => {
              const count = AVATAR_ITEMS.filter((i) => i.category === cat).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setSelectedItem(null); }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeCategory === cat
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {CATEGORY_LABELS[cat]} ({count})
                </button>
              );
            })}
          </div>

          {/* Item List */}
          <div className="space-y-2">
            {filtered.map((item) => {
              const isOwned = owned.includes(item.id) || item.cost === 0;
              const isEq = isEquipped(item);
              const canAfford = points >= item.cost;
              const rarityColor = RARITY_COLORS[item.rarity];
              const isSelected = selectedItem === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(isSelected ? null : item.id)}
                  className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? "bg-indigo-50 border-indigo-300 shadow-sm ring-1 ring-indigo-200"
                      : isEq
                      ? "bg-white border-indigo-200"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  {/* Preview emoji */}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-colors ${
                      isSelected ? "bg-indigo-100" : "bg-slate-50"
                    }`}
                  >
                    {item.preview}
                  </div>

                  {/* Name + Description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <span
                        className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${rarityColor}15`,
                          color: rarityColor,
                        }}
                      >
                        {item.rarity}
                      </span>
                      {isEq && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600">
                          Equipped
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{item.description}</p>
                  </div>

                  {/* Price + Action */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {item.cost > 0 && !isOwned && (
                      <span className="text-sm font-bold text-slate-600">
                        {item.cost}{" "}
                        <span className="text-xs font-normal text-slate-400">pts</span>
                      </span>
                    )}
                    {(item.cost === 0 || isOwned) && !isEq && (
                      <span className="text-xs font-medium text-emerald-500">
                        {isOwned ? "Owned" : "Free"}
                      </span>
                    )}

                    {isEq ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnequip(item);
                        }}
                        className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        Unequip
                      </button>
                    ) : isOwned ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEquip(item);
                        }}
                        className="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                      >
                        Equip
                      </button>
                    ) : canAfford ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuy(item);
                        }}
                        className="px-4 py-2 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                      >
                        Buy
                      </button>
                    ) : (
                      <span className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 text-slate-400">
                        Locked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

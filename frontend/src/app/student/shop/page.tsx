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
import {
  ChevronRight,
  Star,
  Check,
  Lock,
  ShoppingCart,
  Shirt,
  Palette,
  Glasses,
  Eye as EyeIcon,
  Smile,
  User,
  Paintbrush,
  Crown,
} from "lucide-react";

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

const CATEGORY_ICONS: Record<AvatarCategory, React.ReactNode> = {
  top: <Crown size={14} />,
  clothing: <Shirt size={14} />,
  clothesColor: <Palette size={14} />,
  accessories: <Glasses size={14} />,
  eyes: <EyeIcon size={14} />,
  mouth: <Smile size={14} />,
  skinColor: <User size={14} />,
  hairColor: <Paintbrush size={14} />,
  hatColor: <Palette size={14} />,
};

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
    <div className="student-ui">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-neutral-400 mb-6 font-medium">
        <Link href="/student" className="hover:text-neutral-900 transition-colors">
          Dashboard
        </Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900 font-semibold">Avatar Shop</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ─── Sticky Avatar Preview ───────────────────────── */}
        <div className="lg:w-72 flex-shrink-0">
          <div className="bg-cream rounded-2xl overflow-hidden lg:sticky lg:top-6">
            <div className="p-8 flex flex-col items-center">
              <Avatar
                config={previewConfig || currentConfig}
                seed={user.username}
                size={160}
              />
              <div
                className={`mt-3 text-[11px] font-medium px-3 py-1 rounded-full transition-opacity duration-200 ${
                  previewConfig ? "opacity-100 bg-amber-50 text-amber-600" : "opacity-0"
                }`}
              >
                Preview Mode
              </div>
            </div>
            <div className="p-4 text-center">
              <p className="text-[11px] text-neutral-400 font-medium mb-1">Points Available</p>
              <div className="flex items-center justify-center gap-1.5">
                <Star size={18} className="text-amber-400" fill="currentColor" />
                <p className="text-2xl font-semibold text-neutral-900">
                  {points.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Shop Content ────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="mb-5">
            <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Avatar Shop</h1>
            <p className="text-neutral-400 mt-0.5 text-[13px]">
              Click an item to preview, then buy or equip it.
            </p>
          </div>

          {/* Category Pill Tabs */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            <button
              onClick={() => { setActiveCategory("all"); setSelectedItem(null); }}
              className={`pill-tab ${activeCategory === "all" ? "active" : ""}`}
            >
              <ShoppingCart size={13} />
              All ({AVATAR_ITEMS.length})
            </button>
            {ALL_CATEGORIES.map((cat) => {
              const count = AVATAR_ITEMS.filter((i) => i.category === cat).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setSelectedItem(null); }}
                  className={`pill-tab ${activeCategory === cat ? "active" : ""}`}
                >
                  {CATEGORY_ICONS[cat]}
                  {CATEGORY_LABELS[cat]} ({count})
                </button>
              );
            })}
          </div>

          {/* Item List */}
          <div className="space-y-1.5">
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
                  className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? "bg-neutral-100"
                      : isEq
                      ? "bg-emerald-50/50"
                      : "hover:bg-cream"
                  }`}
                >
                  {/* Preview circle */}
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 bg-neutral-50">
                    {item.preview}
                  </div>

                  {/* Name + Description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <p className="text-[13px] font-semibold text-neutral-900">{item.name}</p>
                      <span
                        className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${rarityColor}10`, color: rarityColor }}
                      >
                        {item.rarity}
                      </span>
                      {isEq && (
                        <span className="flex items-center gap-0.5 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">
                          <Check size={9} />
                          Equipped
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400">{item.description}</p>
                  </div>

                  {/* Price + Action */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.cost > 0 && !isOwned && (
                      <span className="flex items-center gap-1 text-[13px] font-medium text-neutral-600">
                        <Star size={12} className="text-amber-400" fill="currentColor" />
                        {item.cost}
                      </span>
                    )}
                    {(item.cost === 0 || isOwned) && !isEq && (
                      <span className="text-[11px] font-medium text-emerald-500">
                        {isOwned ? "Owned" : "Free"}
                      </span>
                    )}

                    {isEq ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUnequip(item); }}
                        className="btn-outline text-[12px] px-3 py-1.5 min-h-0"
                      >
                        Unequip
                      </button>
                    ) : isOwned ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEquip(item); }}
                        className="btn-primary text-[12px] px-3 py-1.5 min-h-0"
                      >
                        Equip
                      </button>
                    ) : canAfford ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBuy(item); }}
                        className="btn-primary text-[12px] px-3 py-1.5 min-h-0"
                      >
                        Buy
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium rounded-full bg-neutral-50 text-neutral-400">
                        <Lock size={11} />
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

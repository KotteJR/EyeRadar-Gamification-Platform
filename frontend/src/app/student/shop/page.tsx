"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { UISounds } from "@/lib/ui-sounds";
import {
  ALL_SHOP_ITEMS,
  SHOP_CHARACTERS,
  SHOP_BACKGROUNDS,
  SHOP_EFFECTS,
  RARITY_COLORS,
  CATEGORY_LABELS,
  type ShopCategory,
  type ShopItem,
} from "@/lib/shop-items";
import type { Student } from "@/types";
import {
  ChevronRight,
  Star,
  Check,
  Lock,
  Swords,
  Image as ImageIcon,
  Sparkles,
  X,
} from "lucide-react";

export default function ShopPage() {
  const { user, purchaseItem } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [activeCategory, setActiveCategory] = useState<ShopCategory | "all">("characters");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.studentId) return;
    api.getStudent(user.studentId).then(setStudent).catch(() => {});
  }, [user]);

  const points = student?.total_points ?? 0;
  const owned = user?.ownedItems ?? [];

  const filtered = useMemo(() => {
    if (activeCategory === "all") return ALL_SHOP_ITEMS;
    if (activeCategory === "characters") return SHOP_CHARACTERS;
    if (activeCategory === "backgrounds") return SHOP_BACKGROUNDS;
    return SHOP_EFFECTS;
  }, [activeCategory]);

  const selectedItemData = useMemo(
    () => (selectedItem ? ALL_SHOP_ITEMS.find((i) => i.id === selectedItem) : null),
    [selectedItem]
  );

  const handleBuy = useCallback(
    (item: ShopItem) => {
      if (owned.includes(item.id) || item.isDefault || points < item.cost) return;
      purchaseItem(item.id);
      setSelectedItem(null);
    },
    [owned, points, purchaseItem]
  );

  const handleEquip = useCallback(
    (item: ShopItem) => {
      setSelectedItem(null);
    },
    []
  );

  const handleImgError = useCallback((id: string) => {
    setImgErrors((prev) => new Set(prev).add(id));
  }, []);

  if (!user) return null;

  const cats: ShopCategory[] = ["characters", "backgrounds", "effects"];
  const catCounts: Record<string, number> = {
    characters: SHOP_CHARACTERS.length,
    backgrounds: SHOP_BACKGROUNDS.length,
    effects: SHOP_EFFECTS.length,
  };

  return (
    <div className="student-ui">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-neutral-400 mb-6 font-medium">
        <Link href="/student" className="hover:text-neutral-900 transition-colors">Dashboard</Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900 font-semibold">Shop</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Item Shop</h1>
          <p className="text-neutral-400 mt-0.5 text-[13px]">
            Unlock characters, backgrounds, and effects with your points.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 px-4 py-2.5 rounded-2xl">
          <Star size={16} className="text-amber-500" fill="currentColor" />
          <span className="text-lg font-bold text-amber-700">{points.toLocaleString()}</span>
          <span className="text-xs text-amber-400 font-medium">pts</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl mb-6 w-fit">
        {cats.map((cat) => (
          <button
            key={cat}
            onClick={() => { UISounds.click(); setActiveCategory(cat); setSelectedItem(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              activeCategory === cat
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            {cat === "characters" ? <Swords size={13} /> : cat === "backgrounds" ? <ImageIcon size={13} /> : <Sparkles size={13} />}
            {CATEGORY_LABELS[cat]}
            <span className={`text-[11px] ${activeCategory === cat ? "text-neutral-400" : "text-neutral-300"}`}>
              {catCounts[cat]}
            </span>
          </button>
        ))}
      </div>

      {/* Selected Item Detail Panel */}
      {selectedItemData && (() => {
        const isOwned = owned.includes(selectedItemData.id) || selectedItemData.isDefault;
        const canAfford = points >= selectedItemData.cost;
        const rarityColor = RARITY_COLORS[selectedItemData.rarity];
        return (
          <div className="mb-6 bg-white rounded-2xl shadow-sm overflow-hidden border border-neutral-100">
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-56 bg-neutral-50 flex items-center justify-center p-6 relative">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-neutral-200/60 hover:bg-neutral-200 text-neutral-400 flex items-center justify-center transition-colors"
                >
                  <X size={12} />
                </button>
                {selectedItemData.category === "backgrounds" ? (
                  <div className="w-full aspect-video rounded-xl overflow-hidden">
                    {!imgErrors.has(selectedItemData.id) ? (
                      <img src={selectedItemData.preview} alt={selectedItemData.name} className="w-full h-full object-cover" style={{ imageRendering: "pixelated" }} onError={() => handleImgError(selectedItemData.id)} />
                    ) : (
                      <div className="w-full h-full bg-neutral-100 flex items-center justify-center text-neutral-300"><ImageIcon size={28} /></div>
                    )}
                  </div>
                ) : (
                  <div className="w-28 h-28 flex items-center justify-center">
                    {!imgErrors.has(selectedItemData.id) ? (
                      <img src={selectedItemData.preview} alt={selectedItemData.name} className="w-full h-full object-contain" style={{ imageRendering: "pixelated" }} onError={() => handleImgError(selectedItemData.id)} />
                    ) : (
                      <div className="w-20 h-20 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-300">
                        {selectedItemData.category === "characters" ? <Swords size={28} /> : <Sparkles size={28} />}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-bold text-neutral-900">{selectedItemData.name}</h2>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: `${rarityColor}12`, color: rarityColor }}>
                    {selectedItemData.rarity}
                  </span>
                </div>
                <p className="text-neutral-400 text-[13px] mb-4 leading-relaxed">{selectedItemData.description}</p>
                {isOwned ? (
                  <button onClick={() => { UISounds.click(); handleEquip(selectedItemData); }} className="flex items-center gap-1.5 px-5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-semibold rounded-xl text-[13px] transition-colors">
                    <Check size={14} /> Equip
                  </button>
                ) : canAfford ? (
                  <button onClick={() => { UISounds.purchase(); handleBuy(selectedItemData); }} className="flex items-center gap-1.5 px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-[13px] transition-colors">
                    <Star size={13} fill="currentColor" /> Buy for {selectedItemData.cost} pts
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-5 py-2 bg-neutral-50 text-neutral-400 font-medium rounded-xl text-[13px]">
                    <Lock size={13} /> Need {selectedItemData.cost - points} more pts
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Item Grid */}
      <div className={`grid gap-4 ${
        activeCategory === "backgrounds"
          ? "grid-cols-2 sm:grid-cols-3"
          : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5"
      }`}>
        {filtered.map((item) => {
          const isOwned = owned.includes(item.id) || item.isDefault;
          const canAfford = points >= item.cost;
          const isSelected = selectedItem === item.id;
          const rarityColor = RARITY_COLORS[item.rarity];

          return (
            <button
              key={item.id}
              onClick={() => { UISounds.select(); setSelectedItem(isSelected ? null : item.id); }}
              className={`group relative bg-white rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 border ${
                isSelected
                  ? "border-neutral-300 shadow-md"
                  : "border-neutral-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-neutral-200"
              } ${!canAfford && !isOwned ? "opacity-55" : ""}`}
            >
              {/* Image area */}
              <div className={`relative flex items-center justify-center bg-[#fafaf9] ${
                activeCategory === "backgrounds" ? "aspect-video" : "aspect-square"
              }`}>
                {!imgErrors.has(item.id) ? (
                  <img
                    src={item.preview}
                    alt={item.name}
                    className={`${
                      activeCategory === "backgrounds"
                        ? "w-full h-full object-cover"
                        : "w-[75%] h-[75%] object-contain drop-shadow-sm"
                    }`}
                    style={{ imageRendering: "pixelated" }}
                    onError={() => handleImgError(item.id)}
                  />
                ) : (
                  <div className="text-neutral-200">
                    {item.category === "characters" ? <Swords size={28} /> : item.category === "backgrounds" ? <ImageIcon size={28} /> : <Sparkles size={28} />}
                  </div>
                )}

                {/* Owned badge */}
                {isOwned && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                    <Check size={10} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-3 py-2.5">
                <p className="text-[12px] font-semibold text-neutral-800 truncate leading-tight">{item.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: rarityColor }}>
                    {item.rarity}
                  </span>
                  {isOwned ? (
                    <span className="text-[10px] font-medium text-emerald-500">Owned</span>
                  ) : (
                    <span className="text-[11px] font-semibold text-neutral-500 flex items-center gap-0.5">
                      <Star size={9} className="text-amber-400" fill="currentColor" />
                      {item.cost}
                    </span>
                  )}
                </div>
              </div>

              {/* Rarity accent line */}
              {(item.rarity === "epic" || item.rarity === "legendary") && (
                <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${rarityColor}40, transparent)` }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

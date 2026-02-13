import type { Badge } from "@/types";
import { Award, Star, Flame, Trophy, Target, Zap, Medal } from "lucide-react";

const BADGE_ICONS: Record<string, typeof Award> = {
  first_steps: Star,
  streak_starter: Flame,
  streak_master: Flame,
  perfectionist: Trophy,
  speed_demon: Zap,
  explorer: Target,
  dedicated: Medal,
};

interface BadgeCardProps {
  badge: Badge;
  size?: "sm" | "md";
}

export default function BadgeCard({ badge, size = "md" }: BadgeCardProps) {
  const isSm = size === "sm";
  const Icon = BADGE_ICONS[badge.id] || Award;

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border-2 transition-all ${
        badge.earned
          ? "bg-white border-amber-200/60 shadow-sm badge-earned"
          : "bg-gray-50/60 border-gray-100 opacity-40 grayscale"
      } ${isSm ? "p-2.5" : "p-3.5"}`}
    >
      <div
        className={`flex-shrink-0 rounded-xl flex items-center justify-center ${
          badge.earned ? "bg-amber-50 text-amber-500" : "bg-gray-100 text-gray-400"
        } ${isSm ? "w-8 h-8" : "w-10 h-10"}`}
      >
        <Icon size={isSm ? 16 : 20} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className={`font-bold text-gray-900 truncate ${isSm ? "text-xs" : "text-sm"}`}>
          {badge.name}
        </p>
        {!isSm && (
          <p className="text-xs text-gray-400 line-clamp-1 font-medium">
            {badge.description}
          </p>
        )}
      </div>
    </div>
  );
}

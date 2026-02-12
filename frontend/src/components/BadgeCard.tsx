import type { Badge } from "@/types";

interface BadgeCardProps {
  badge: Badge;
  size?: "sm" | "md";
}

export default function BadgeCard({ badge, size = "md" }: BadgeCardProps) {
  const isSm = size === "sm";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border transition-all ${
        badge.earned
          ? "bg-white border-indigo-100 shadow-sm badge-earned"
          : "bg-slate-50/60 border-slate-200 opacity-40 grayscale"
      } ${isSm ? "p-2.5" : "p-3.5"}`}
    >
      <span className={isSm ? "text-xl" : "text-2xl"}>{badge.icon}</span>
      <div className="min-w-0">
        <p
          className={`font-semibold text-slate-900 truncate ${
            isSm ? "text-xs" : "text-sm"
          }`}
        >
          {badge.name}
        </p>
        {!isSm && (
          <p className="text-xs text-slate-400 line-clamp-1">
            {badge.description}
          </p>
        )}
      </div>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  color = "indigo",
}: StatsCardProps) {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-500",
    amber: "bg-amber-50 text-amber-500",
    emerald: "bg-emerald-50 text-emerald-500",
    rose: "bg-rose-50 text-rose-500",
    blue: "bg-blue-50 text-blue-500",
    purple: "bg-purple-50 text-purple-500",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            {title}
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1 truncate">{value}</p>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            colorMap[color] || colorMap.indigo
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

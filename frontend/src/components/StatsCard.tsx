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
  color = "orange",
}: StatsCardProps) {
  const colorMap: Record<string, string> = {
    orange: "bg-neutral-100 text-neutral-600",
    blue: "bg-neutral-100 text-neutral-600",
    amber: "bg-neutral-100 text-neutral-600",
    emerald: "bg-neutral-100 text-neutral-600",
    rose: "bg-neutral-100 text-neutral-600",
    purple: "bg-neutral-100 text-neutral-600",
    indigo: "bg-neutral-100 text-neutral-600",
  };

  return (
    <div className="bg-cream rounded-xl p-4 transition-colors">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-xl font-semibold text-neutral-900 mt-1 truncate">{value}</p>
          {subtitle && (
            <p className="text-[11px] text-neutral-400 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            colorMap[color] || colorMap.orange
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
  size?: "sm" | "md" | "lg";
}

export default function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  color = "#4f46e5",
  size = "md",
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-4" };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm font-medium text-neutral-700">{label}</span>}
          {showPercentage && (
            <span className="text-xs font-medium text-neutral-500">
              {Math.round(percent)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-neutral-100 rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className={`progress-fill ${heights[size]} rounded-full`}
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

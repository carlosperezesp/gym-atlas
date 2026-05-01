import type { TrendDirection } from "@/types";

interface TrendBadgeProps {
  trend: TrendDirection;
}

export default function TrendBadge({ trend }: TrendBadgeProps) {
  if (trend === "none") return <span className="text-zinc-600 text-xs">—</span>;

  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 text-green-400 text-xs font-600">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="18 15 12 9 6 15" />
        </svg>
        Up
      </span>
    );
  }

  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 text-red-400 text-xs font-600">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
        Down
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-zinc-500 text-xs font-600">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Flat
    </span>
  );
}

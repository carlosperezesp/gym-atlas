import Link from "next/link";
import type { MuscleFreshness, MuscleGroup } from "@/types";
import { MUSCLE_LABELS } from "@/types";
import { formatDaysAgo } from "@/lib/calculations";

interface MuscleCardProps {
  freshness: MuscleFreshness;
  compact?: boolean;
  href?: string;
}

const MUSCLE_SHORT: Record<MuscleGroup, string> = {
  chest:           "CHT",
  upper_back:      "UBCK",
  lats:            "LATS",
  shoulders_front: "FDLT",
  shoulders_side:  "SDLT",
  shoulders_rear:  "RDLT",
  biceps:          "BIC",
  triceps:         "TRI",
  abs:             "ABS",
  lower_back:      "LBCK",
  glutes:          "GLT",
  quads:           "QDS",
  hamstrings:      "HAM",
  calves:          "CAL",
};

const cardBg: Record<string, string> = {
  green:  "#ecfdf5",
  yellow: "#fffbeb",
  orange: "#fff7ed",
  red:    "#fef2f2",
  gray:   "#f8fafc",
};

const dotHex: Record<string, string> = {
  green:  "#16a34a",
  yellow: "#ca8a04",
  orange: "#ea580c",
  red:    "#dc2626",
  gray:   "#94a3b8",
};

const daysHex: Record<string, string> = {
  green:  "#15803d",
  yellow: "#b45309",
  orange: "#c2410c",
  red:    "#b91c1c",
  gray:   "#94a3b8",
};

const borderHex: Record<string, string> = {
  green:  "#bbf7d0",
  yellow: "#fde68a",
  orange: "#fed7aa",
  red:    "#fecaca",
  gray:   "#e2e8f0",
};

export default function MuscleCard({ freshness, compact = false, href }: MuscleCardProps) {
  const { muscle, daysSince, color } = freshness;

  const body = compact ? (
    <div className="card-sm flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-zinc-800/50">
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: dotHex[color] }}
      />
      <span className="text-sm font-medium text-zinc-200 flex-1">{MUSCLE_LABELS[muscle]}</span>
      <span className="text-xs font-mono" style={{ color: daysHex[color] }}>
        {formatDaysAgo(daysSince)}
      </span>
    </div>
  ) : (
    <div
      className="card overflow-hidden flex flex-col transition-colors hover:bg-zinc-800/50"
      style={{ background: cardBg[color], borderColor: borderHex[color] }}
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span
          className="text-[10px] font-bold tracking-widest uppercase"
          style={{ fontFamily: "Barlow Condensed, sans-serif", color: daysHex[color] }}
        >
          {MUSCLE_SHORT[muscle]}
        </span>
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: dotHex[color], boxShadow: "0 0 0 3px rgba(255,255,255,0.7)" }}
        />
      </div>

      <div className="px-3 pb-3 flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-zinc-200 leading-snug truncate">
          {MUSCLE_LABELS[muscle]}
        </p>
        <p className="text-xs font-mono" style={{ color: daysHex[color] }}>
          {formatDaysAgo(daysSince)}
        </p>
        {freshness.lastTrainedDate && (
          <p className="text-[10px] text-zinc-600">
            {new Date(freshness.lastTrainedDate).toLocaleDateString("en", { month: "short", day: "numeric" })}
          </p>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{body}</Link>;
  }

  return body;
}

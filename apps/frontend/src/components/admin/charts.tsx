import { useId } from "react";

export interface AdminChartSeries {
  name: string;
  color: string;
  data: number[];
}

interface AdminChartProps {
  series: AdminChartSeries[];
  height?: number;
  formatter?: (value: number) => string;
}

function buildPath(
  data: number[],
  width: number,
  height: number,
  max: number,
  pad: number,
  closeToBottom = false,
): string {
  const n = data.length;
  const step = n <= 1 ? 0 : width / (n - 1);
  const parts = data.map((value, i) => {
    const x = i * step;
    const y = height - pad - (value / max) * (height - pad * 2);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  });
  if (closeToBottom && parts.length > 0) {
    const lastX = (n - 1) * step;
    parts.push(`L${lastX.toFixed(1)},${height - pad}`);
    parts.push(`L0,${height - pad}`);
    parts.push("Z");
  }
  return parts.join(" ");
}

export function AdminChart({ series, height = 180, formatter }: AdminChartProps) {
  const gradientId = useId();
  const width = 600;
  const pad = 6;

  const rawMax = Math.max(...series.flatMap((s) => s.data));
  const max = rawMax > 0 ? rawMax : 1;

  const labels = series.map((s) => ({
    name: s.name,
    color: s.color,
    last: s.data[s.data.length - 1] ?? 0,
  }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {labels.map((label) => (
          <span
            key={label.name}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: label.color }}
              aria-hidden="true"
            />
            {label.name}
            <span className="font-mono font-medium text-foreground">
              {formatter ? formatter(label.last) : label.last}
            </span>
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={series.map((s) => s.name).join(", ")}
        className="h-auto w-full overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1="0"
            y1={height * fraction}
            x2={width}
            y2={height * fraction}
            className="stroke-border"
            strokeDasharray="3 5"
            strokeWidth="1"
          />
        ))}

        {series[0] && (
          <path
            d={buildPath(series[0].data, width, height, max, pad, true)}
            fill={`url(#${gradientId})`}
            className="text-indigo-500"
          />
        )}

        {series.map((s) => (
          <g key={s.name}>
            <path
              d={buildPath(s.data, width, height, max, pad)}
              fill="none"
              stroke={s.color}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {s.data.length > 0 && (
              <circle
                cx={((s.data.length - 1) * width) / Math.max(1, s.data.length - 1)}
                cy={height - pad - (s.data[s.data.length - 1] / max) * (height - pad * 2)}
                r="2.6"
                fill={s.color}
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

interface QuotaBarProps {
  used: number;
  quota: number | null;
  formatUsed?: (value: number) => string;
  formatQuota?: (value: number) => string;
}

export function QuotaBar({
  used,
  quota,
  formatUsed,
  formatQuota,
}: QuotaBarProps) {
  const pct = quota === null ? Math.min(1, used / 4_000_000) : Math.min(1, used / quota);
  const color =
    pct >= 0.9
      ? "bg-red-500"
      : pct >= 0.75
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.max(3, pct * 100)}%` }}
        />
      </div>
      <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
        {formatUsed ? formatUsed(used) : used.toLocaleString("en-IN")}
        {quota === null
          ? " used"
          : ` / ${formatQuota ? formatQuota(quota) : quota.toLocaleString("en-IN")}`}
        <span className="ml-1.5 inline-flex items-center gap-0.5">
          <span className="font-semibold text-foreground">
            {Math.round(pct * 100)}%
          </span>
          {quota === null && <span>of estimated capacity</span>}
        </span>
      </p>
    </div>
  );
}
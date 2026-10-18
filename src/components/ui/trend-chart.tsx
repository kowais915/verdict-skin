import type { MetricState, SeriesPoint } from "@/lib/verdict";

/**
 * One metric across a trial. The shaded band is the noise floor (baseline ± 2σ):
 * anything inside it could be lighting or chance. A change only counts once the
 * line leaves the band, after the expected onset day.
 */
export function TrendChart({
  points,
  baseline,
  noise,
  durationDays,
  today,
  onsetDay,
  purgeWindow,
  markers = [],
  state,
  height = 150,
  label,
}: {
  points: SeriesPoint[];
  baseline: number;
  noise: number;
  durationDays: number;
  today?: number;
  onsetDay?: number;
  purgeWindow?: { startDay: number; endDay: number };
  markers?: { day: number; label: string }[];
  state: MetricState;
  height?: number;
  label: string;
}) {
  const W = 400;
  const H = height;
  const pad = { l: 30, r: 8, t: 14, b: 24 };
  const band = noise * 2;
  const values = points.map((p) => p.value).concat(Number.isFinite(baseline) ? [baseline - band - 2, baseline + band + 2] : []);
  const lo = Math.floor(Math.min(...values, 100) - 2);
  const hi = Math.ceil(Math.max(...values, 0) + 2);
  const x = (d: number) => pad.l + (d / durationDays) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (H - pad.t - pad.b);

  const used = points.filter((p) => !p.excluded).sort((a, b) => a.day - b.day);
  // Average same-day baseline pairs so the line starts from one point.
  const merged: { day: number; value: number }[] = [];
  for (const p of used) {
    const last = merged[merged.length - 1];
    if (last && last.day === p.day) last.value = (last.value + p.value) / 2;
    else merged.push({ day: p.day, value: p.value });
  }
  const path = merged.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const tone = state === "improving" ? "var(--color-keep)" : state === "worse" ? "var(--color-ditch)" : state === "purging" ? "var(--color-unsure)" : "var(--color-ink)";
  const ticks = niceTicks(durationDays);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${label} over the trial`}>
      {/* purge window */}
      {purgeWindow && (
        <g>
          <rect x={x(purgeWindow.startDay)} y={pad.t} width={x(Math.min(purgeWindow.endDay, durationDays)) - x(purgeWindow.startDay)} height={H - pad.t - pad.b} fill="var(--color-unsure-wash)" opacity=".55" />
          <text x={x(purgeWindow.startDay) + 6} y={pad.t + 12} fontSize="12" fill="var(--color-unsure)" fontWeight="600">
            purge window
          </text>
        </g>
      )}
      {/* noise band */}
      {Number.isFinite(baseline) && (
        <g>
          <rect x={pad.l} y={y(baseline + band)} width={W - pad.l - pad.r} height={y(baseline - band) - y(baseline + band)} fill="var(--color-mist)" />
          <line x1={pad.l} x2={W - pad.r} y1={y(baseline)} y2={y(baseline)} stroke="var(--color-ink)" strokeOpacity=".35" strokeDasharray="3 4" />
          <text x={W - pad.r - 4} y={y(baseline + band) - 5} textAnchor="end" fontSize="12" fill="var(--color-smoke)">
            ±{band.toFixed(1)} noise
          </text>
        </g>
      )}
      {/* onset */}
      {onsetDay !== undefined && onsetDay <= durationDays && (
        <g>
          <line x1={x(onsetDay)} x2={x(onsetDay)} y1={pad.t} y2={H - pad.b} stroke="var(--color-serum-deep)" strokeOpacity=".5" strokeDasharray="2 3" />
          <text x={x(onsetDay) + 5} y={H - pad.b - 6} fontSize="12" fill="var(--color-serum-deep)">
            onset, day {onsetDay}
          </text>
        </g>
      )}
      {/* today */}
      {today !== undefined && today < durationDays && (
        <rect x={x(today)} y={pad.t} width={W - pad.r - x(today)} height={H - pad.t - pad.b} fill="var(--color-porcelain)" opacity=".6" />
      )}
      {/* confounders */}
      {markers.map((m) => (
        <g key={`${m.day}-${m.label}`}>
          <circle cx={x(m.day)} cy={H - pad.b + 1} r="3" fill="var(--color-smoke)" />
          <title>{`Day ${m.day}: ${m.label}`}</title>
        </g>
      ))}
      {/* axes */}
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--color-hairline)" />
      {ticks.map((t) => (
        <text key={t} x={x(t)} y={H - 6} textAnchor="middle" fontSize="12" fill="var(--color-smoke)" className="numeral">
          {t === 0 ? "day 0" : t}
        </text>
      ))}
      {[lo + 2, Math.round((lo + hi) / 2), hi - 2].map((v) => (
        <text key={v} x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="12" fill="var(--color-smoke)" className="numeral">
          {v}
        </text>
      ))}
      {/* series */}
      <path d={path} fill="none" stroke={tone} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p) => (
        <circle
          key={p.scanId}
          cx={x(p.day)}
          cy={y(p.value)}
          r={p.excluded ? 4 : 3.5}
          fill={p.excluded ? "var(--color-vial)" : tone}
          stroke={p.excluded ? "var(--color-smoke)" : "var(--color-vial)"}
          strokeWidth="1.5"
          strokeDasharray={p.excluded ? "2 2" : undefined}
        >
          <title>{`Day ${p.day}: ${p.value.toFixed(1)}${p.excluded ? " (set aside: poor light)" : ""}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function niceTicks(duration: number) {
  const step = duration > 60 ? 14 : 7;
  const out = [];
  for (let d = 0; d <= duration; d += step) out.push(d);
  if (out[out.length - 1] !== duration) out.push(duration);
  return out;
}

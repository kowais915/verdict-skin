import { METRICS } from "@/lib/metrics";
import type { MetricAnalysis } from "@/lib/verdict";

/**
 * How far a metric moved, drawn against its own noise band. The band is what a
 * product that does nothing would produce; the dot is what this one did.
 */
export function EvidenceMeter({ m }: { m: MetricAnalysis }) {
  const band = m.noise * 2;
  const delta = m.delta ?? 0;
  const range = Math.max(band * 2.2, Math.abs(delta) * 1.25, 6);
  const pos = (v: number) => `${50 + (v / range) * 50}%`;
  const tone = m.state === "improving" ? "bg-keep" : m.state === "worse" ? "bg-ditch" : m.state === "purging" ? "bg-unsure" : "bg-ink";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">{METRICS[m.metric].label}</p>
        <p className="text-sm text-smoke numeral">
          {Number.isFinite(m.baseline) ? m.baseline.toFixed(1) : "–"} to {m.current?.toFixed(1) ?? "–"}
        </p>
      </div>
      <div className="relative mt-2.5 h-7">
        <div className="absolute inset-x-0 top-1/2 h-px bg-hairline" />
        <div className="absolute inset-y-1 rounded-md bg-mist" style={{ left: pos(-band), right: `calc(100% - ${pos(band)})` }} />
        <div className="absolute inset-y-0 w-px bg-ink/30" style={{ left: "50%" }} />
        <div className={`absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-vial ${tone}`} style={{ left: pos(delta) }} />
      </div>
      <div className="mt-1 flex justify-between text-2xs text-smoke">
        <span>worse</span>
        <span>noise band</span>
        <span>better</span>
      </div>
    </div>
  );
}

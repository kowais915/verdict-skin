import { METRICS } from "@/lib/metrics";
import type { Hypothesis, Trial } from "@/lib/types";
import type { MetricAnalysis, MetricState } from "@/lib/verdict";
import { TrendChart } from "./ui/trend-chart";

const STATE: Record<MetricState, { label: string; cls: string }> = {
  improving: { label: "Improving", cls: "bg-keep-wash text-keep" },
  worse: { label: "Getting worse", cls: "bg-ditch-wash text-ditch" },
  purging: { label: "Purging, expected", cls: "bg-unsure-wash text-[#8a5d05]" },
  flat: { label: "No real change", cls: "bg-mist text-ink" },
  too_early: { label: "Too early", cls: "bg-mist text-smoke" },
  steady: { label: "Holding steady", cls: "bg-mist text-ink" },
};

export function MetricPanel({
  m,
  trial,
  today,
  hypothesis,
  markers,
}: {
  m: MetricAnalysis;
  trial: Trial;
  today: number;
  hypothesis?: Hypothesis;
  markers: { day: number; label: string }[];
}) {
  const info = METRICS[m.metric];
  const s = STATE[m.state];
  return (
    <article className="rounded-vial border border-hairline bg-vial p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold leading-tight">{info.label}</h3>
          <p className="text-sm text-smoke">Higher means {info.better}.</p>
        </div>
        <div className="flex items-center gap-3">
          {m.delta !== undefined && (
            <span className={`display text-3xl numeral ${m.state === "improving" ? "text-keep" : m.state === "worse" ? "text-ditch" : "text-ink"}`}>
              {m.delta >= 0 ? "+" : "−"}
              {Math.abs(m.delta).toFixed(1)}
            </span>
          )}
          <span className={`rounded-full px-2.5 py-1 text-2xs font-semibold ${s.cls}`}>{s.label}</span>
        </div>
      </header>
      <div className="mt-3">
        <TrendChart
          label={info.label}
          points={m.points}
          baseline={m.baseline}
          noise={m.noise}
          durationDays={trial.durationDays}
          today={today}
          onsetDay={hypothesis?.onsetDay}
          purgeWindow={m.metric === "acne" ? trial.purgeWindow : undefined}
          markers={markers}
          state={m.state}
        />
      </div>
      {hypothesis && <p className="mt-2 text-sm text-ink/75 measure">{hypothesis.because}</p>}
      {m.z !== undefined && (
        <p className="mt-1 text-2xs text-smoke numeral">
          Baseline {m.baseline.toFixed(1)}, now {m.current?.toFixed(1)}. Change is {Math.abs(m.z).toFixed(1)}× the measurement noise; 2× is needed to count.
        </p>
      )}
    </article>
  );
}

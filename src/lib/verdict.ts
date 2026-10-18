import { METRICS } from "./metrics";
import { daysBetween } from "./dates";
import type { MetricKey, Scan, Trial, Verdict } from "./types";

/**
 * The verdict engine.
 *
 * A single scan can't tell you whether a product works: lighting, angle, time of
 * day and the model itself all add wobble. So every trial starts with two
 * baseline scans a minute apart. Their disagreement (floored by a per-metric
 * minimum) is the noise. A change only counts when it clears that noise by a
 * clear margin (z ≥ 2), and only after the active's expected onset.
 *
 * We compute on YouCam's `raw_score` rather than `ui_score`: the UI score is
 * deliberately adjusted to be encouraging, which would bias a before/after test.
 */

export const Z_CLEAR = 2;
export const Z_HARM = 2.5;
/** Scans captured in light worse than this are kept but not used for the verdict. */
export const MIN_LIGHT = 55;

export type MetricState = "too_early" | "improving" | "flat" | "worse" | "purging" | "steady";

export interface SeriesPoint {
  day: number;
  value: number;
  scanId: string;
  excluded: boolean;
}

export interface MetricAnalysis {
  metric: MetricKey;
  role: "target" | "guard";
  baseline: number;
  noise: number;
  points: SeriesPoint[];
  current?: number;
  delta?: number;
  z?: number;
  state: MetricState;
  onsetDay?: number;
}

export interface StripCell {
  day: number;
  state: "baseline" | "pending" | "missed" | Verdict;
}

export interface TrialAnalysis {
  day: number;
  progress: number;
  readiness: "early" | "forming" | "ready";
  verdict: Verdict;
  confidence: number;
  headline: string;
  reasons: string[];
  metrics: MetricAnalysis[];
  strip: StripCell[];
  scansUsed: number;
  scansExcluded: number;
}

export function analyzeTrial(trial: Trial, allScans: Scan[], asOf: string): TrialAnalysis {
  const day = clamp(daysBetween(trial.startedAt, asOf), 0, trial.durationDays);
  const scans = scansForTrial(trial, allScans).filter((s) => dayOf(trial, s) <= day);
  const result = evaluate(trial, scans, day);

  // The litmus strip: one cell per scheduled scan, coloured by the provisional
  // verdict as it stood on that day.
  const scheduled = uniq(trial.scanDays).filter((d) => trial.status !== "closed" || d <= day);
  const strip: StripCell[] = scheduled.map((d) => {
    if (d === 0) return { day: 0, state: "baseline" };
    if (d > day) return { day: d, state: "pending" };
    const hit = scans.find((s) => {
      const sd = dayOf(trial, s);
      return sd >= d && sd <= d + 2 && !s.isBaseline;
    });
    if (!hit) return { day: d, state: d >= day - 1 ? "pending" : "missed" };
    const at = dayOf(trial, hit);
    return { day: d, state: evaluate(trial, scans.filter((s) => dayOf(trial, s) <= at), at).verdict };
  });

  return { ...result, strip };
}

function evaluate(trial: Trial, scans: Scan[], day: number): Omit<TrialAnalysis, "strip"> {
  const progress = day / trial.durationDays;
  const usable = scans.filter((s) => s.lightScore >= MIN_LIGHT);
  const baselines = usable.filter((s) => s.isBaseline).slice(0, 2);
  const followUps = usable.filter((s) => !s.isBaseline && dayOf(trial, s) >= 5);

  const metrics: MetricAnalysis[] = [
    ...trial.targetMetrics.map((m) => analyzeMetric(trial, m, "target", baselines, followUps, scans, day)),
    ...trial.guardMetrics.map((m) => analyzeMetric(trial, m, "guard", baselines, followUps, scans, day)),
  ];

  const targets = metrics.filter((m) => m.role === "target");
  const improving = targets.filter((m) => m.state === "improving");
  const harmed = metrics.filter((m) => m.state === "worse" && (m.z ?? 0) <= -Z_HARM);
  const allOnsetPassed = targets.every((m) => day >= (m.onsetDay ?? 0) + 7);
  const readiness: TrialAnalysis["readiness"] =
    progress >= 0.85 || (allOnsetPassed && followUps.length >= 3) ? "ready" : progress >= 0.45 ? "forming" : "early";

  let verdict: Verdict = "inconclusive";
  const reasons: string[] = [];
  let headline: string;

  if (harmed.length && !improving.length) {
    verdict = "ditch";
    headline = "It's irritating your skin";
    harmed.forEach((m) => reasons.push(`${METRICS[m.metric].label}: down ${fmt(-(m.delta ?? 0))} points, ${fmt(Math.abs(m.z ?? 0))}× the noise.`));
  } else if (improving.length && harmed.length) {
    verdict = "inconclusive";
    headline = "It's working, but at a cost";
    improving.forEach((m) => reasons.push(`${METRICS[m.metric].label}: up ${fmt(m.delta ?? 0)} points.`));
    harmed.forEach((m) => reasons.push(`${METRICS[m.metric].label}: down ${fmt(-(m.delta ?? 0))} points.`));
    reasons.push("Try it every other night for two weeks, then re-scan.");
  } else if (improving.length) {
    verdict = "keep";
    headline = improving.length === targets.length ? "It's working on everything it promised" : `It's working on ${improving.map((m) => METRICS[m.metric].label.toLowerCase()).join(" and ")}`;
    improving.forEach((m) => reasons.push(`${METRICS[m.metric].label}: up ${fmt(m.delta ?? 0)} points, ${fmt(m.z ?? 0)}× the noise.`));
    targets.filter((m) => m.state !== "improving").forEach((m) => reasons.push(`${METRICS[m.metric].label}: no change beyond noise yet${m.state === "too_early" ? ". It's still early for this one" : ""}.`));
  } else if (readiness === "ready") {
    verdict = "ditch";
    headline = "No change you could see in the mirror";
    targets.forEach((m) => reasons.push(`${METRICS[m.metric].label}: ${signed(m.delta ?? 0)} points, inside the ±${fmt(m.noise * Z_CLEAR)} noise band.`));
  } else {
    verdict = "inconclusive";
    headline = readiness === "early" ? "Too early to tell" : "Still forming";
    const purging = metrics.find((m) => m.state === "purging");
    if (purging) reasons.push(`Breakouts: up, but inside the expected purge window, so it doesn't count against it.`);
    targets
      .filter((m) => m.state !== "purging")
      .forEach((m) =>
        reasons.push(
          m.state === "too_early"
            ? `${METRICS[m.metric].label}: not expected to move until about day ${m.onsetDay}.`
            : `${METRICS[m.metric].label}: ${signed(m.delta ?? 0)} points so far. It needs ${fmt(m.noise * Z_CLEAR)} to count.`,
        ),
      );
  }

  const bestZ = verdict === "keep" ? Math.max(...improving.map((m) => m.z ?? 0)) : verdict === "ditch" && harmed.length ? Math.max(...harmed.map((m) => -(m.z ?? 0))) : 0;
  const confidence =
    verdict === "inconclusive"
      ? 0
      : verdict === "ditch" && !harmed.length
        ? clamp(0.55 + (progress - 0.85) * 2 + followUps.length * 0.03, 0.5, 0.92)
        : clamp(1 - Math.exp(-Math.max(0, bestZ - 1) / 1.2), 0.5, 0.98);

  return {
    day,
    progress,
    readiness,
    verdict,
    confidence,
    headline,
    reasons,
    metrics,
    scansUsed: baselines.length + followUps.length,
    scansExcluded: scans.length - usable.length,
  };
}

function analyzeMetric(
  trial: Trial,
  metric: MetricKey,
  role: "target" | "guard",
  baselines: Scan[],
  followUps: Scan[],
  allScans: Scan[],
  day: number,
): MetricAnalysis {
  const read = (s: Scan) => s.readings.find((r) => r.metric === metric)?.rawScore;
  const points: SeriesPoint[] = allScans
    .map((s) => ({ day: dayOf(trial, s), value: read(s), scanId: s.id, excluded: s.lightScore < MIN_LIGHT }))
    .filter((p): p is SeriesPoint => p.value !== undefined);

  const b = baselines.map(read).filter((v): v is number => v !== undefined);
  const baseline = b.length ? mean(b) : NaN;
  const sd = b.length === 2 ? Math.abs(b[0] - b[1]) / Math.SQRT2 : 0;
  const noise = Math.max(METRICS[metric].minNoise, sd);
  const onsetDay = trial.hypotheses.find((h) => h.metric === metric)?.onsetDay;

  const recent = followUps.slice(-2).map(read).filter((v): v is number => v !== undefined);
  if (!b.length || !recent.length) {
    return { metric, role, baseline, noise, points, state: role === "target" && onsetDay && day < onsetDay ? "too_early" : "steady", onsetDay };
  }

  const current = mean(recent);
  const delta = current - baseline;
  const se = noise * Math.sqrt(1 / b.length + 1 / recent.length);
  const z = delta / se;

  let state: MetricState;
  if (z >= Z_CLEAR) state = role === "target" ? "improving" : "steady";
  else if (z <= -Z_CLEAR) {
    const inPurge = metric === "acne" && trial.purgeWindow && day >= trial.purgeWindow.startDay && day <= trial.purgeWindow.endDay;
    state = inPurge ? "purging" : "worse";
  } else if (role === "target" && onsetDay && day < onsetDay) state = "too_early";
  else state = role === "target" ? "flat" : "steady";

  return { metric, role, baseline, noise, points, current, delta, z, state, onsetDay };
}

export function scansForTrial(trial: Trial, scans: Scan[]) {
  return scans
    .filter((s) => {
      const d = dayOf(trial, s);
      return d >= 0 && d <= trial.durationDays + 3;
    })
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

export function dayOf(trial: Trial, scan: Scan) {
  return daysBetween(trial.startedAt, scan.capturedAt);
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const uniq = (xs: number[]) => [...new Set(xs)];
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n))}`;

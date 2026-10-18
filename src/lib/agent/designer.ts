import { ACTIVES, getActive, type ActiveInfo } from "./actives";
import { METRICS } from "../metrics";
import { addDays, daysBetween, formatDay } from "../dates";
import type { Active, Hypothesis, MetricKey, Product } from "../types";

/**
 * The trial designer agent.
 *
 * Given a product (and the rest of the user's routine) it reasons, step by step,
 * about what the product should change, when that change becomes measurable,
 * what could go wrong, and whether a fair verdict fits inside the return window.
 * Each step is surfaced to the user as it runs, so the plan is explainable.
 *
 * It is deterministic and runs on the knowledge base in `actives.ts`. The step
 * interface is the seam for swapping in an LLM planner later: same inputs, same
 * `DesignStep[]` output.
 */

export type StepTone = "neutral" | "good" | "warn";

export interface DesignStep {
  id: string;
  title: string;
  lines: { text: string; tone?: StepTone }[];
}

export interface TrialPlan {
  targetMetrics: MetricKey[];
  guardMetrics: MetricKey[];
  hypotheses: Hypothesis[];
  purgeWindow?: { startDay: number; endDay: number };
  durationDays: number;
  scanDays: number[];
  returnDeadline: string;
  /** Day index of the checkpoint scheduled before the return window closes, if the full trial runs past it. */
  returnCheckpointDay?: number;
  fitsReturnWindow: boolean;
}

export interface DesignInput {
  product: Pick<Product, "name" | "brand" | "actives" | "purchasedAt" | "returnWindowDays" | "slot" | "retailer">;
  routine: Pick<Product, "name" | "actives" | "slot">[];
  goals: MetricKey[];
  startDate: string;
}

const MIN_DAYS = 21;
const MAX_DAYS = 84;

export function designTrial(input: DesignInput): { steps: DesignStep[]; plan: TrialPlan } {
  const steps: DesignStep[] = [];
  const known = input.product.actives
    .map((a) => ({ a, info: getActive(a.key) }))
    .filter((x): x is { a: Active; info: ActiveInfo } => Boolean(x.info));

  // 1. Read the label
  steps.push({
    id: "label",
    title: "Reading the label",
    lines: known.length
      ? known.map(({ a, info }) => ({
          text: `${info.name}${a.pct ? ` at ${a.pct}%` : ""}: ${familyLabel(info.family)}.`,
        }))
      : [{ text: "No recognised actives. I'll track your goals and watch for irritation.", tone: "warn" }],
  });

  // 2. Hypotheses: what should move, and when
  // The first active on the label is the hero; supporting actives only add
  // targets that the hero doesn't already cover, and rank lower.
  const byMetric = new Map<MetricKey, Hypothesis>();
  const fromHero = new Set<MetricKey>();
  for (const [i, { info }] of known.entries()) {
    for (const t of info.targets) {
      if (i === 0) fromHero.add(t.metric);
      const prev = byMetric.get(t.metric);
      if (!prev || t.onsetDay < prev.onsetDay) {
        byMetric.set(t.metric, {
          metric: t.metric,
          onsetDay: t.onsetDay,
          peakDay: t.peakDay,
          because: `${info.name} usually shows a measurable change in ${METRICS[t.metric].label.toLowerCase()} from week ${Math.ceil(t.onsetDay / 7)}.`,
        });
      }
    }
  }
  if (byMetric.size === 0) {
    for (const g of input.goals.slice(0, 2)) {
      byMetric.set(g, { metric: g, onsetDay: 28, peakDay: 56, because: "Tracking your goal because the label lists no known active for it." });
    }
  }
  const score = (h: Hypothesis) => (fromHero.has(h.metric) ? 2 : 0) + (input.goals.includes(h.metric) ? 1.5 : 0);
  const ranked = [...byMetric.values()].sort((x, y) => score(y) - score(x) || x.onsetDay - y.onsetDay);
  const hypotheses = ranked.slice(0, 3);
  const targetMetrics = hypotheses.map((h) => h.metric);

  steps.push({
    id: "hypotheses",
    title: "Deciding what to measure",
    lines: [
      ...hypotheses.map((h) => ({
        text: `${METRICS[h.metric].label}: should improve from about day ${h.onsetDay}, peaking near day ${h.peakDay}.${input.goals.includes(h.metric) ? " Matches one of your goals." : ""}`,
        tone: "good" as StepTone,
      })),
      ...(ranked.length > 3
        ? [{ text: `It may also help ${ranked.slice(3).map((h) => METRICS[h.metric].label.toLowerCase()).join(" and ")}. I'll log those, but judge it on the three above.` }]
        : []),
    ],
  });

  // 3. Guards and purge
  const guardSet = new Set<MetricKey>();
  for (const { info } of known) info.guards.forEach((g) => guardSet.add(g));
  targetMetrics.forEach((m) => guardSet.delete(m));
  const guardMetrics = [...guardSet];

  const purgers = known.filter(({ info }) => info.purge);
  const purgeWindow = purgers.length
    ? {
        startDay: Math.min(...purgers.map(({ info }) => info.purge!.startDay)),
        endDay: Math.max(...purgers.map(({ info }) => info.purge!.endDay)),
      }
    : undefined;

  steps.push({
    id: "safety",
    title: "Planning for side effects",
    lines: [
      ...(guardMetrics.length
        ? [{ text: `Watching ${guardMetrics.map((g) => METRICS[g].label.toLowerCase()).join(" and ")} for irritation. If either drops sharply, I'll flag it before the trial ends.` }]
        : [{ text: "Nothing in this formula commonly irritates, so I'm not adding extra guards.", tone: "good" as StepTone }]),
      ...(purgeWindow
        ? [{
            text: `${purgers.map(({ info }) => info.name).join(" and ")} can cause purging between day ${purgeWindow.startDay} and day ${purgeWindow.endDay}. More breakouts in your usual spots during that stretch won't count against it.`,
            tone: "warn" as StepTone,
          }]
        : []),
    ],
  });

  // 4. Routine clashes
  const clashLines: { text: string; tone?: StepTone }[] = [];
  for (const other of input.routine) {
    for (const oa of other.actives) {
      for (const { info } of known) {
        if (info.clashes.includes(oa.key)) {
          const sameSlot = other.slot === "both" || input.product.slot === "both" || other.slot === input.product.slot;
          clashLines.push({
            text: sameSlot
              ? `${info.name} and ${getActive(oa.key)?.name ?? oa.label} in ${other.name} share a routine slot. Use them on alternate nights, or the trial can't tell which one caused a change.`
              : `${other.name} has ${getActive(oa.key)?.name ?? oa.label}, but it's in a different slot, so that's fine.`,
            tone: sameSlot ? "warn" : "neutral",
          });
        }
      }
    }
  }
  const hero = known[0]?.a.key;
  const newOverlaps = hero ? input.routine.filter((p) => p.actives.some((oa) => oa.key === hero)) : [];
  for (const p of newOverlaps) {
    clashLines.push({ text: `${p.name} also contains ${known[0].info.name.toLowerCase()}. Pause it during the trial so you're measuring one product, not two.`, tone: "warn" });
  }
  steps.push({
    id: "routine",
    title: "Checking your routine",
    lines: clashLines.length ? clashLines : [{ text: "No clashes with anything on your shelf.", tone: "good" }],
  });

  // 5. Duration vs the return window
  const longestOnset = Math.max(...hypotheses.map((h) => h.onsetDay), 14);
  const durationDays = clamp(roundUpToWeek(longestOnset + 10), MIN_DAYS, MAX_DAYS);
  const returnDeadline = addDays(input.product.purchasedAt, input.product.returnWindowDays);
  const deadlineDay = daysBetween(input.startDate, returnDeadline);
  const fitsReturnWindow = durationDays <= deadlineDay - 1;
  const returnCheckpointDay = !fitsReturnWindow && deadlineDay > 7 ? deadlineDay - 2 : undefined;
  const earliestTarget = Math.min(...hypotheses.map((h) => h.onsetDay));

  steps.push({
    id: "window",
    title: "Fitting it inside your return window",
    lines: fitsReturnWindow
      ? [{
          text: `${input.product.retailer} accepts returns until ${formatDay(returnDeadline)}. A ${durationDays}-day trial ends ${deadlineDay - durationDays} days before that, so you'll have the verdict in time.`,
          tone: "good",
        }]
      : [
          {
            text: `A fair read takes ${durationDays} days, but ${input.product.retailer}'s return window closes on day ${deadlineDay} (${formatDay(returnDeadline)}).`,
            tone: "warn",
          },
          returnCheckpointDay && returnCheckpointDay >= earliestTarget
            ? { text: `I'll add a checkpoint scan on day ${returnCheckpointDay}. By then ${METRICS[hypotheses[0].metric].label.toLowerCase()} should have started to move, which is enough for an early verdict.` }
            : returnCheckpointDay
              ? { text: `I'll add a checkpoint scan on day ${returnCheckpointDay}. It's too early to judge results then, but it can catch irritation, which is the most common reason to return a product.` }
              : { text: "The window is too short for any measurement. Consider asking the retailer for an extension." },
        ],
  });

  // 6. Scan schedule
  const scanDays = buildSchedule(durationDays, returnCheckpointDay, purgeWindow);
  steps.push({
    id: "schedule",
    title: "Booking your scans",
    lines: [
      { text: "Day 0: two baseline scans a minute apart. The difference between them shows how much readings wobble on their own." },
      { text: `${scanDays.length - 2} more scans on days ${scanDays.filter((d) => d > 0).join(", ")}. Same mirror, same light, same time of day.` },
    ],
  });

  return {
    steps,
    plan: {
      targetMetrics,
      guardMetrics,
      hypotheses,
      purgeWindow,
      durationDays,
      scanDays,
      returnDeadline,
      returnCheckpointDay,
      fitsReturnWindow,
    },
  };
}

function buildSchedule(duration: number, checkpoint?: number, purge?: { startDay: number; endDay: number }) {
  const days = new Set<number>([0, 0.01]); // two baseline captures on day 0
  for (let d = 7; d < duration; d += 7) days.add(d);
  days.add(duration);
  // Denser sampling in the final fortnight, where the verdict is decided.
  if (duration >= 28) days.add(duration - 3);
  if (checkpoint) days.add(checkpoint);
  if (purge && purge.endDay < duration) days.add(purge.endDay);
  return [...days].sort((a, b) => a - b).map((d) => (d < 1 ? 0 : d));
}

function familyLabel(f: ActiveInfo["family"]) {
  return {
    retinoid: "a retinoid that speeds up cell turnover",
    exfoliant: "a chemical exfoliant",
    antioxidant: "an antioxidant",
    humectant: "a humectant that pulls in water",
    barrier: "a barrier-repair lipid",
    soothing: "a calming, oil-balancing ingredient",
    brightening: "a pigment-fading ingredient",
    antibacterial: "an acne-bacteria fighter",
    peptide: "a signalling peptide",
    sunscreen: "UV protection",
  }[f];
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const roundUpToWeek = (n: number) => Math.ceil(n / 7) * 7;

export { ACTIVES };

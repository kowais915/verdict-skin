import "server-only";
import { store } from "./data";
import { addDays, daysBetween, today } from "./dates";
import { analyzeTrial, dayOf, scansForTrial, type TrialAnalysis } from "./verdict";
import type { CheckIn, Product, Scan, Trial } from "./types";

export interface NextScan {
  day: number;
  date: string;
  dueIn: number;
  kind: "baseline" | "checkpoint" | "final" | "regular";
}

export interface TrialView {
  trial: Trial;
  product: Product;
  analysis: TrialAnalysis;
  scans: Scan[];
  nextScan: NextScan | null;
  returnDaysLeft: number;
  checkpointDay?: number;
}

export function buildTrialView(trial: Trial, product: Product, allScans: Scan[], asOf = today()): TrialView {
  const at = trial.status === "closed" && trial.verdictAt ? trial.verdictAt : asOf;
  const analysis = analyzeTrial(trial, allScans, at);
  const scans = scansForTrial(trial, allScans);
  const returnDaysLeft = daysBetween(asOf, trial.returnDeadline);
  const deadlineDay = daysBetween(trial.startedAt, trial.returnDeadline);
  const checkpointDay = trial.scanDays.find((d) => d === deadlineDay - 2 && d < trial.durationDays);

  let nextScan: NextScan | null = null;
  if (trial.status !== "closed") {
    const baselines = scans.filter((s) => s.isBaseline && dayOf(trial, s) === 0).length;
    if (baselines < 2) {
      nextScan = { day: 0, date: trial.startedAt, dueIn: Math.max(0, daysBetween(asOf, trial.startedAt)), kind: "baseline" };
    } else {
      const done = new Set(scans.filter((s) => !s.isBaseline).map((s) => dayOf(trial, s)));
      const todayDay = daysBetween(trial.startedAt, asOf);
      const d = [...new Set(trial.scanDays)].find((d) => d > 0 && d >= todayDay - 1 && ![d, d + 1, d + 2].some((x) => done.has(x)));
      if (d !== undefined) {
        const date = addDays(trial.startedAt, d);
        nextScan = {
          day: d,
          date,
          dueIn: daysBetween(asOf, date),
          kind: d === trial.durationDays ? "final" : d === checkpointDay ? "checkpoint" : "regular",
        };
      }
    }
  }
  return { trial, product, analysis, scans, nextScan, returnDaysLeft, checkpointDay };
}

export async function loadAccount(userId: string) {
  const [products, trials, scans, events, checkIns] = await Promise.all([
    store.listProducts(userId),
    store.listTrials(userId),
    store.listScans(userId),
    store.listAgentEvents(userId),
    store.listCheckIns(userId),
  ]);
  const views = trials
    .map((t) => {
      const p = products.find((x) => x.id === t.productId);
      return p ? buildTrialView(t, p, scans) : null;
    })
    .filter((v): v is TrialView => v !== null);
  return { products, trials: views, scans, events, checkIns };
}

/** Check-ins that could explain a change, mapped to trial days, for chart annotations. */
export function confounders(trial: Trial, checkIns: CheckIn[]) {
  const out: { day: number; label: string }[] = [];
  for (const c of checkIns) {
    const day = daysBetween(trial.startedAt, c.date);
    if (day < 0 || day > trial.durationDays) continue;
    const reasons = [
      c.onPeriod && "period",
      c.sun === "lots" && "lots of sun",
      c.sleepHours < 6 && "short sleep",
      c.stress >= 4 && "high stress",
      c.newProduct && "new product",
    ].filter(Boolean);
    if (reasons.length) out.push({ day, label: reasons.join(", ") });
  }
  return out;
}

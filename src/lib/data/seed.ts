import { designTrial } from "../agent/designer";
import { addDays, daysBetween, today } from "../dates";
import { METRIC_KEYS } from "../metrics";
import type { AgentEvent, CheckIn, MetricKey, Product, Scan, Trial, UserProfile } from "../types";

/**
 * A believable demo account: one trial about to beat its return window, one
 * retinoid trial mid-purge, and two finished trials (one kept, one returned).
 * Scores come from a simple skin model plus measurement noise, so the verdict
 * engine sees the same kind of data a real account produces.
 */

export interface SeedData {
  profile: UserProfile;
  products: Product[];
  trials: Trial[];
  scans: Scan[];
  checkIns: CheckIn[];
  events: AgentEvent[];
}

// Deterministic PRNG so the demo looks the same on every load.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}
function gauss(r: () => number) {
  const u = Math.max(r(), 1e-9);
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const BASE: Record<MetricKey, number> = {
  redness: 58, acne: 66, pore: 54, oiliness: 49, moisture: 61, texture: 57,
  wrinkle: 72, radiance: 55, age_spot: 68, dark_circle: 60, eye_bag: 70, firmness: 74,
};

/** Raw-score change at full effect for each seeded trial (negative = harm). */
type Effect = { metric: MetricKey; full: number; from: number; to: number };

export function buildSeed(userId: string, name = "Maya", email = "maya@example.com"): SeedData {
  const T = today();
  const r = rng(42);

  const profile: UserProfile = {
    id: userId,
    name,
    email,
    skinType: "combination",
    goals: ["redness", "pore", "texture"],
    onboarded: true,
    reminderTime: "08:00",
  };

  const mk = (p: Omit<Product, "userId">): Product => ({ ...p, userId });

  const niac = mk({
    id: "p_calmfix", name: "Calm Fix Serum", brand: "Halden Lab", category: "serum", retailer: "Lumen Beauty",
    price: 38, currency: "USD", purchasedAt: addDays(T, -29), returnWindowDays: 30,
    actives: [{ key: "niacinamide", label: "Niacinamide", pct: 10 }, { key: "zinc", label: "Zinc PCA", pct: 1 }],
    status: "on_trial", tint: "#BFD8D2", slot: "pm",
  });
  const retinal = mk({
    id: "p_nightshift", name: "Night Shift Retinal Cream", brand: "Novella", category: "treatment", retailer: "Shelf & Co",
    price: 54, currency: "USD", purchasedAt: addDays(T, -15), returnWindowDays: 60,
    actives: [{ key: "retinal", label: "Retinal", pct: 0.1 }, { key: "ceramides", label: "Ceramide NP" }],
    status: "on_trial", tint: "#E9C9A8", slot: "pm",
  });
  const hyal = mk({
    id: "p_dewtheory", name: "Dew Theory Water Gel", brand: "Orrery", category: "moisturizer", retailer: "Lumen Beauty",
    price: 46, currency: "USD", purchasedAt: addDays(T, -64), returnWindowDays: 30,
    actives: [{ key: "hyaluronic_acid", label: "Sodium hyaluronate", pct: 2 }],
    status: "ditched", tint: "#C7D3EE", slot: "both",
  });
  const ceramide = mk({
    id: "p_barrierbalm", name: "Barrier Balm", brand: "Fieldwork", category: "moisturizer", retailer: "Shelf & Co",
    price: 29, currency: "USD", purchasedAt: addDays(T, -114), returnWindowDays: 45,
    actives: [{ key: "ceramides", label: "Ceramides NP, AP, EOP" }, { key: "centella", label: "Centella asiatica" }],
    status: "kept", tint: "#EDE3CF", slot: "both",
  });
  const toner = mk({
    id: "p_resurface", name: "Resurface 7% Toner", brand: "Halden Lab", category: "toner", retailer: "Lumen Beauty",
    price: 22, currency: "USD", purchasedAt: addDays(T, -200), returnWindowDays: 30,
    actives: [{ key: "glycolic_acid", label: "Glycolic acid", pct: 7 }],
    status: "shelf", tint: "#F2D7DF", slot: "pm",
  });
  const spf = mk({
    id: "p_dailyveil", name: "Daily Veil SPF 50", brand: "Fieldwork", category: "sunscreen", retailer: "Shelf & Co",
    price: 32, currency: "USD", purchasedAt: addDays(T, -150), returnWindowDays: 30,
    actives: [{ key: "spf", label: "Zinc oxide 18%" }],
    status: "shelf", tint: "#F4EBC8", slot: "am",
  });
  const products = [niac, retinal, ceramide, hyal, toner, spf];

  // Trials are designed by the same agent the app uses for new trials.
  const mkTrial = (id: string, product: Product, startOffset: number, routine: Product[]): Trial => {
    const startedAt = addDays(T, startOffset);
    const { plan } = designTrial({ product, routine, goals: profile.goals, startDate: startedAt });
    return {
      id, userId, productId: product.id, startedAt,
      durationDays: plan.durationDays, targetMetrics: plan.targetMetrics, guardMetrics: plan.guardMetrics,
      hypotheses: plan.hypotheses, purgeWindow: plan.purgeWindow, scanDays: plan.scanDays,
      status: "running", returnDeadline: plan.returnDeadline,
    };
  };

  const tCeramide = { ...mkTrial("t_barrierbalm", ceramide, -110, [spf]), status: "closed" as const, verdict: "keep" as const };
  tCeramide.verdictAt = addDays(tCeramide.startedAt, tCeramide.durationDays);
  const tHyal = { ...mkTrial("t_dewtheory", hyal, -60, [spf, ceramide]), status: "closed" as const, verdict: "ditch" as const };
  // Returned at the checkpoint, before the window closed.
  tHyal.verdictAt = addDays(tHyal.startedAt, tHyal.scanDays.find((d, i, a) => d > 0 && a[i + 1] !== undefined && d < tHyal.durationDays && d > 21) ?? 21);
  const tNiac = mkTrial("t_calmfix", niac, -26, [spf, ceramide, toner]);
  const tRetinal = mkTrial("t_nightshift", retinal, -14, [spf, ceramide, toner, niac]);
  const trials = [tNiac, tRetinal, tCeramide, tHyal];

  // Skin model: each product nudges metrics along its expected timeline.
  const effects: { trial: Trial; fx: Effect[] }[] = [
    { trial: tCeramide, fx: [{ metric: "moisture", full: 9, from: 0, to: 21 }, { metric: "redness", full: 4, from: 7, to: 28 }] },
    { trial: tHyal, fx: [{ metric: "moisture", full: 0.6, from: 0, to: 14 }] },
    { trial: tNiac, fx: [{ metric: "oiliness", full: 9, from: 4, to: 28 }, { metric: "redness", full: 14, from: 11, to: 42 }, { metric: "pore", full: 4, from: 18, to: 56 }] },
    {
      trial: tRetinal,
      fx: [
        { metric: "acne", full: -11, from: 3, to: 10 }, // purge flare
        { metric: "moisture", full: -3, from: 2, to: 12 },
        { metric: "texture", full: 6, from: 14, to: 56 },
      ],
    },
  ];
  const kept = new Set(["t_barrierbalm"]);

  const skinOn = (date: string): Record<MetricKey, number> => {
    const v = { ...BASE };
    for (const { trial, fx } of effects) {
      const day = (Date.parse(date) - Date.parse(trial.startedAt)) / 86_400_000;
      if (day < 0) continue;
      const stopped = trial.status === "closed" && !kept.has(trial.id) && day > trial.durationDays;
      for (const e of fx) {
        let amt = e.full * smooth(e.from, e.to, day);
        if (stopped) amt *= Math.max(0, 1 - (day - trial.durationDays) / 10);
        v[e.metric] += amt;
      }
    }
    return v;
  };

  const scans: Scan[] = [];
  const takeScan = (id: string, date: string, hour: number, opts: { baseline?: boolean; light?: number } = {}) => {
    const truth = skinOn(date);
    const light = opts.light ?? Math.round(78 + r() * 18);
    const wobble = light < 55 ? 3.2 : 1.1;
    scans.push({
      id, userId, capturedAt: `${date}T${String(hour).padStart(2, "0")}:${String(Math.floor(r() * 50) + 5).padStart(2, "0")}:00.000Z`,
      lightScore: light, alignScore: Math.round(80 + r() * 18), skinAge: Math.round(29 + gauss(r) * 0.8),
      source: "demo", isBaseline: Boolean(opts.baseline),
      readings: METRIC_KEYS.map((m) => {
        const raw = clampScore(truth[m] + gauss(r) * wobble);
        return { metric: m, rawScore: Math.round(raw * 10) / 10, uiScore: Math.round(Math.min(99, raw * 0.7 + 30)) };
      }),
    });
  };

  for (const t of trials) {
    const seen = new Set<number>();
    for (const d of t.scanDays) {
      const date = addDays(t.startedAt, d);
      if (date > T) continue;
      if (d === 0) {
        takeScan(`s_${t.id}_b${seen.has(0) ? 2 : 1}`, date, 7, { baseline: true });
        seen.add(0);
        continue;
      }
      if (date === T) continue; // today's scan is still due
      const badLight = t.id === "t_calmfix" && d === 14;
      takeScan(`s_${t.id}_d${d}`, date, 7, { light: badLight ? 46 : undefined });
    }
  }
  scans.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));

  // Daily check-ins for the last three weeks.
  const checkIns: CheckIn[] = [];
  for (let i = 20; i >= 1; i--) {
    const date = addDays(T, -i);
    checkIns.push({
      id: `c_${date}`, userId, date,
      sleepHours: Math.round((6.4 + r() * 2.2) * 2) / 2,
      stress: (1 + Math.floor(r() * 4)) as CheckIn["stress"],
      sun: i === 9 ? "lots" : r() > 0.7 ? "some" : "none",
      onPeriod: i >= 4 && i <= 8,
      newProduct: i === 14,
      note: i === 9 ? "Beach day, reapplied SPF twice." : i === 14 ? "Started the retinal cream tonight." : undefined,
    });
  }

  const ev = (trialId: string, at: string, kind: AgentEvent["kind"], title: string, body: string): AgentEvent => ({
    id: `e_${trialId}_${at}_${title.length}`, trialId, at, kind, title, body,
  });
  const events: AgentEvent[] = [
    ev("t_calmfix", `${tNiac.startedAt}T07:10:00.000Z`, "plan", "Trial designed", "Tracking oil, redness and pores. Lumen Beauty's window closes before a full 42-day read, so I added a checkpoint on day 25."),
    ev("t_calmfix", `${addDays(tNiac.startedAt, 14)}T07:20:00.000Z`, "warn", "Day 14 scan set aside", "The light was too dim and came from one side. I kept the scan but left it out of the verdict."),
    ev("t_calmfix", `${addDays(tNiac.startedAt, 21)}T07:22:00.000Z`, "insight", "Oil is clearly down", "Oil readings are past the noise band. Redness is moving the right way but hasn't cleared it yet."),
    ev("t_calmfix", `${addDays(tNiac.startedAt, 25)}T07:25:00.000Z`, "verdict", "Checkpoint verdict: keep", "Oil and redness both cleared the noise band before the return window closes. Pores need longer; I'll keep tracking them."),
    ev("t_nightshift", `${tRetinal.startedAt}T07:15:00.000Z`, "plan", "Trial designed", "Tracking texture, breakouts and fine lines over 56 days. Purge window is days 7–35."),
    ev("t_nightshift", `${tRetinal.startedAt}T07:16:00.000Z`, "warn", "Clash with your toner", "Resurface 7% Toner has glycolic acid and is also a PM product. Use it on non-retinal nights so the trial measures one thing."),
    ev("t_nightshift", `${addDays(tRetinal.startedAt, 7)}T07:30:00.000Z`, "insight", "Breakouts are up: this looks like purging", "The rise is inside the purge window and in your usual T-zone. It doesn't count against the cream. Keep going."),
    ev("t_nightshift", `${addDays(tRetinal.startedAt, 7)}T07:31:00.000Z`, "warn", "Overlapping trial", "Calm Fix Serum is also running. Redness gains during this window are likely the serum's, so I'm not crediting them to the cream."),
    ev("t_nightshift", `${T}T06:00:00.000Z`, "reminder", "Day 14 scan due", "Same mirror, same light as day 0. Takes about a minute."),
    ev("t_dewtheory", `${tHyal.startedAt}T07:15:00.000Z`, "plan", "Trial designed", "Hyaluronic acid works within days, so a 21-day trial is plenty."),
    ev("t_dewtheory", `${tHyal.verdictAt}T07:15:00.000Z`, "verdict", "Verdict: ditch", `Hydration didn't move beyond the noise by day 24. You sent it back to Lumen Beauty ${daysBetween(tHyal.verdictAt!, tHyal.returnDeadline)} days before the window closed.`),
    ev("t_barrierbalm", `${tCeramide.startedAt}T07:15:00.000Z`, "plan", "Trial designed", "Tracking hydration and redness over 28 days."),
    ev("t_barrierbalm", `${tCeramide.verdictAt}T07:15:00.000Z`, "verdict", "Verdict: keep", "Hydration up 9 points, well past the noise. Added to your shelf."),
  ];

  return { profile, products, trials, scans, checkIns, events };
}

const clampScore = (n: number) => Math.min(99, Math.max(1, n));

/**
 * The same sample history with ids made unique to one account, so it can be
 * written to a shared database for any number of users.
 */
export function buildSampleFor(userId: string, name: string): Omit<SeedData, "profile"> {
  const seed = buildSeed(userId, name);
  const tag = Array.from(userId).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
  const re = (id: string) => `${id}_${tag}`;
  const productIds = new Map(seed.products.map((p) => [p.id, re(p.id)]));
  const trialIds = new Map(seed.trials.map((t) => [t.id, re(t.id)]));
  return {
    products: seed.products.map((p) => ({ ...p, id: productIds.get(p.id)! })),
    trials: seed.trials.map((t) => ({ ...t, id: trialIds.get(t.id)!, productId: productIds.get(t.productId)! })),
    scans: seed.scans.map((sc) => ({ ...sc, id: re(sc.id) })),
    checkIns: seed.checkIns.map((c) => ({ ...c, id: `c_${userId}_${c.date}` })),
    events: seed.events.map((e) => ({ ...e, id: re(e.id), trialId: trialIds.get(e.trialId)! })),
  };
}

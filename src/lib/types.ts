/**
 * Domain model for Verdict.
 *
 * These types mirror the Drizzle schema in `src/db/schema.ts` one-to-one, so the
 * demo store (`src/lib/data/demo-store.ts`) and the Neon-backed store
 * (`src/lib/data/db-store.ts`) are interchangeable behind `src/lib/data`.
 */

/** Skin concerns we track. Keys map to YouCam Skin Analysis `dst_actions` (see `src/lib/metrics.ts`). */
export type MetricKey =
  | "redness"
  | "acne"
  | "pore"
  | "oiliness"
  | "moisture"
  | "texture"
  | "wrinkle"
  | "radiance"
  | "age_spot"
  | "dark_circle"
  | "eye_bag"
  | "firmness";

export type Verdict = "keep" | "ditch" | "inconclusive";

export type TrialStatus = "running" | "verdict_ready" | "closed";

export type ProductStatus = "on_trial" | "kept" | "ditched" | "shelf";

export type ProductCategory =
  | "serum"
  | "moisturizer"
  | "cleanser"
  | "treatment"
  | "sunscreen"
  | "toner"
  | "eye";

export interface Active {
  /** Canonical ingredient key from the actives knowledge base, e.g. "niacinamide". */
  key: string;
  /** Display name as printed on the label. */
  label: string;
  /** Concentration in percent when the label states it. */
  pct?: number;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  brand: string;
  category: ProductCategory;
  retailer: string;
  price: number;
  currency: string;
  url?: string;
  purchasedAt: string; // ISO date
  returnWindowDays: number;
  actives: Active[];
  status: ProductStatus;
  /** Packaging tint used for the bottle illustration. */
  tint: string;
  /** When in the routine it is used. */
  slot: "am" | "pm" | "both";
}

export interface MetricReading {
  metric: MetricKey;
  /** YouCam `ui_score` (1–100, tuned to be encouraging). Shown to the user. */
  uiScore: number;
  /** YouCam `raw_score` (1–100, higher is healthier, unadjusted). Used for statistics. */
  rawScore: number;
  maskUrl?: string;
}

export interface Scan {
  id: string;
  userId: string;
  capturedAt: string; // ISO datetime
  imageUrl?: string;
  /** 0–100, how even and bright the light was (computed on device before upload). */
  lightScore: number;
  /** 0–100, how closely the face matched the baseline framing. */
  alignScore: number;
  skinAge?: number;
  readings: MetricReading[];
  source: "youcam" | "demo";
  youcamTaskId?: string;
  /** Baseline scans are taken twice on day 0 to measure the noise floor. */
  isBaseline: boolean;
}

export interface Hypothesis {
  metric: MetricKey;
  /** Day we expect a change to become measurable. */
  onsetDay: number;
  /** Day the effect usually plateaus. */
  peakDay: number;
  because: string;
}

export interface Trial {
  id: string;
  userId: string;
  productId: string;
  startedAt: string; // ISO date (day 0)
  durationDays: number;
  targetMetrics: MetricKey[];
  /** Metrics we watch for harm (irritation, breakouts) even if they are not targets. */
  guardMetrics: MetricKey[];
  hypotheses: Hypothesis[];
  purgeWindow?: { startDay: number; endDay: number };
  scanDays: number[];
  status: TrialStatus;
  verdict?: Verdict;
  verdictAt?: string;
  returnDeadline: string; // ISO date
}

export interface CheckIn {
  id: string;
  userId: string;
  date: string; // ISO date
  sleepHours: number;
  stress: 1 | 2 | 3 | 4 | 5;
  sun: "none" | "some" | "lots";
  onPeriod: boolean;
  newProduct: boolean;
  note?: string;
}

export type AgentEventKind = "plan" | "warn" | "insight" | "reminder" | "verdict";

export interface AgentEvent {
  id: string;
  trialId: string;
  at: string; // ISO datetime
  kind: AgentEventKind;
  title: string;
  body: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  skinType: "dry" | "oily" | "combination" | "normal" | "sensitive";
  goals: MetricKey[];
  avatarUrl?: string;
  onboarded: boolean;
  reminderTime: string; // "08:00"
}

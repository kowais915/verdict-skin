import type { MetricKey } from "../types";

/**
 * A small, opinionated knowledge base of skincare actives.
 *
 * Onset / peak days are conservative, consumer-facing estimates drawn from the
 * typical timelines reported in dermatology literature and product trials. They
 * are what the trial designer uses to decide *when* a verdict is even possible.
 */
export interface ActiveTarget {
  metric: MetricKey;
  onsetDay: number;
  peakDay: number;
}

export interface ActiveInfo {
  key: string;
  name: string;
  aliases: string[];
  family: "retinoid" | "exfoliant" | "antioxidant" | "humectant" | "barrier" | "soothing" | "brightening" | "antibacterial" | "peptide" | "sunscreen";
  targets: ActiveTarget[];
  /** Metrics that tend to get worse first if the skin doesn't tolerate it. */
  guards: MetricKey[];
  /** Cell-turnover actives can cause a temporary flare in usual breakout zones. */
  purge?: { startDay: number; endDay: number };
  /** Keys of actives that shouldn't share the same routine slot. */
  clashes: string[];
  note: string;
}

export const ACTIVES: ActiveInfo[] = [
  {
    key: "niacinamide",
    name: "Niacinamide",
    aliases: ["niacinamide", "vitamin b3", "nicotinamide"],
    family: "soothing",
    targets: [
      { metric: "oiliness", onsetDay: 14, peakDay: 28 },
      { metric: "redness", onsetDay: 21, peakDay: 42 },
      { metric: "pore", onsetDay: 28, peakDay: 56 },
      { metric: "age_spot", onsetDay: 42, peakDay: 84 },
    ],
    guards: ["redness"],
    clashes: [],
    note: "Well tolerated at 2–5%. At 10% and above, some sensitive skin flushes, so redness is watched as a guard too.",
  },
  {
    key: "retinol",
    name: "Retinol",
    aliases: ["retinol", "retinyl palmitate", "retinyl retinoate"],
    family: "retinoid",
    targets: [
      { metric: "texture", onsetDay: 28, peakDay: 84 },
      { metric: "acne", onsetDay: 42, peakDay: 84 },
      { metric: "wrinkle", onsetDay: 56, peakDay: 168 },
      { metric: "age_spot", onsetDay: 56, peakDay: 112 },
    ],
    guards: ["redness", "moisture"],
    purge: { startDay: 7, endDay: 42 },
    clashes: ["glycolic_acid", "lactic_acid", "salicylic_acid", "benzoyl_peroxide"],
    note: "Converts to retinoic acid in the skin. Expect dryness in the first weeks; a breakout spike in your usual zones is purging, not failure.",
  },
  {
    key: "retinal",
    name: "Retinal",
    aliases: ["retinal", "retinaldehyde"],
    family: "retinoid",
    targets: [
      { metric: "texture", onsetDay: 21, peakDay: 56 },
      { metric: "acne", onsetDay: 35, peakDay: 70 },
      { metric: "wrinkle", onsetDay: 42, peakDay: 112 },
    ],
    guards: ["redness", "moisture"],
    purge: { startDay: 7, endDay: 35 },
    clashes: ["glycolic_acid", "lactic_acid", "salicylic_acid", "benzoyl_peroxide"],
    note: "One conversion step from retinoic acid, so it works faster than retinol. Purging is common in weeks 1–5.",
  },
  {
    key: "tretinoin",
    name: "Tretinoin",
    aliases: ["tretinoin", "retinoic acid"],
    family: "retinoid",
    targets: [
      { metric: "acne", onsetDay: 42, peakDay: 84 },
      { metric: "texture", onsetDay: 28, peakDay: 84 },
      { metric: "wrinkle", onsetDay: 84, peakDay: 168 },
    ],
    guards: ["redness", "moisture"],
    purge: { startDay: 10, endDay: 42 },
    clashes: ["glycolic_acid", "lactic_acid", "salicylic_acid", "benzoyl_peroxide"],
    note: "Prescription retinoid. Purging peaks around weeks 2–6. Benzoyl peroxide can degrade it if applied together.",
  },
  {
    key: "adapalene",
    name: "Adapalene",
    aliases: ["adapalene"],
    family: "retinoid",
    targets: [
      { metric: "acne", onsetDay: 42, peakDay: 84 },
      { metric: "texture", onsetDay: 42, peakDay: 84 },
    ],
    guards: ["redness", "moisture"],
    purge: { startDay: 7, endDay: 35 },
    clashes: ["glycolic_acid", "salicylic_acid"],
    note: "A stable retinoid built for acne. Needs about 12 weeks for a fair read on breakouts.",
  },
  {
    key: "glycolic_acid",
    name: "Glycolic acid",
    aliases: ["glycolic acid", "aha"],
    family: "exfoliant",
    targets: [
      { metric: "texture", onsetDay: 14, peakDay: 42 },
      { metric: "radiance", onsetDay: 7, peakDay: 28 },
      { metric: "age_spot", onsetDay: 42, peakDay: 84 },
    ],
    guards: ["redness"],
    purge: { startDay: 7, endDay: 28 },
    clashes: ["retinol", "retinal", "tretinoin", "adapalene", "ascorbic_acid"],
    note: "The smallest AHA, so it penetrates fast. Makes skin more sun-sensitive; daily SPF matters during the trial.",
  },
  {
    key: "lactic_acid",
    name: "Lactic acid",
    aliases: ["lactic acid"],
    family: "exfoliant",
    targets: [
      { metric: "texture", onsetDay: 14, peakDay: 42 },
      { metric: "moisture", onsetDay: 7, peakDay: 28 },
      { metric: "radiance", onsetDay: 7, peakDay: 28 },
    ],
    guards: ["redness"],
    clashes: ["retinol", "retinal", "tretinoin"],
    note: "A gentler AHA that also acts as a humectant.",
  },
  {
    key: "salicylic_acid",
    name: "Salicylic acid",
    aliases: ["salicylic acid", "bha", "beta hydroxy acid"],
    family: "exfoliant",
    targets: [
      { metric: "oiliness", onsetDay: 7, peakDay: 28 },
      { metric: "pore", onsetDay: 21, peakDay: 42 },
      { metric: "acne", onsetDay: 28, peakDay: 56 },
    ],
    guards: ["moisture", "redness"],
    purge: { startDay: 7, endDay: 28 },
    clashes: ["retinol", "retinal", "tretinoin", "adapalene"],
    note: "Oil-soluble, so it works inside the pore. Can dry out skin, so hydration is guarded.",
  },
  {
    key: "azelaic_acid",
    name: "Azelaic acid",
    aliases: ["azelaic acid"],
    family: "soothing",
    targets: [
      { metric: "redness", onsetDay: 28, peakDay: 56 },
      { metric: "acne", onsetDay: 42, peakDay: 84 },
      { metric: "age_spot", onsetDay: 56, peakDay: 112 },
    ],
    guards: ["redness"],
    clashes: [],
    note: "A mild tingle in week one is normal and fades; it is not a reason to stop.",
  },
  {
    key: "ascorbic_acid",
    name: "Vitamin C",
    aliases: ["ascorbic acid", "l-ascorbic acid", "vitamin c", "ethyl ascorbic acid", "sodium ascorbyl phosphate", "magnesium ascorbyl phosphate"],
    family: "antioxidant",
    targets: [
      { metric: "radiance", onsetDay: 21, peakDay: 56 },
      { metric: "age_spot", onsetDay: 56, peakDay: 112 },
      { metric: "wrinkle", onsetDay: 84, peakDay: 168 },
    ],
    guards: ["redness"],
    clashes: ["glycolic_acid"],
    note: "L-ascorbic acid oxidizes once opened. A serum that has turned orange has lost most of its effect.",
  },
  {
    key: "hyaluronic_acid",
    name: "Hyaluronic acid",
    aliases: ["hyaluronic acid", "sodium hyaluronate"],
    family: "humectant",
    targets: [
      { metric: "moisture", onsetDay: 3, peakDay: 14 },
      { metric: "wrinkle", onsetDay: 7, peakDay: 21 },
    ],
    guards: [],
    clashes: [],
    note: "Works within days, so a short trial is enough. Fine-line changes are plumping, not repair.",
  },
  {
    key: "ceramides",
    name: "Ceramides",
    aliases: ["ceramide", "ceramides", "ceramide np", "ceramide ap", "ceramide eop"],
    family: "barrier",
    targets: [
      { metric: "moisture", onsetDay: 7, peakDay: 28 },
      { metric: "redness", onsetDay: 14, peakDay: 42 },
    ],
    guards: [],
    clashes: [],
    note: "Rebuilds the lipid barrier, so redness from irritation calms down as hydration improves.",
  },
  {
    key: "peptides",
    name: "Peptides",
    aliases: ["peptide", "peptides", "matrixyl", "argireline", "copper peptide", "palmitoyl"],
    family: "peptide",
    targets: [
      { metric: "firmness", onsetDay: 56, peakDay: 112 },
      { metric: "wrinkle", onsetDay: 56, peakDay: 112 },
    ],
    guards: [],
    clashes: [],
    note: "Evidence is modest and slow. Most peptide serums need 8+ weeks before a fair read.",
  },
  {
    key: "benzoyl_peroxide",
    name: "Benzoyl peroxide",
    aliases: ["benzoyl peroxide"],
    family: "antibacterial",
    targets: [
      { metric: "acne", onsetDay: 14, peakDay: 42 },
    ],
    guards: ["redness", "moisture"],
    clashes: ["tretinoin", "retinol", "retinal"],
    note: "Kills acne bacteria fast. Bleaches fabric, and it dries skin if overused.",
  },
  {
    key: "centella",
    name: "Centella asiatica",
    aliases: ["centella", "centella asiatica", "cica", "madecassoside", "asiaticoside"],
    family: "soothing",
    targets: [
      { metric: "redness", onsetDay: 14, peakDay: 28 },
      { metric: "moisture", onsetDay: 7, peakDay: 21 },
    ],
    guards: [],
    clashes: [],
    note: "Calms irritation. Good as a supporting product during a retinoid trial.",
  },
  {
    key: "tranexamic_acid",
    name: "Tranexamic acid",
    aliases: ["tranexamic acid", "txa"],
    family: "brightening",
    targets: [
      { metric: "age_spot", onsetDay: 42, peakDay: 84 },
      { metric: "redness", onsetDay: 28, peakDay: 56 },
    ],
    guards: [],
    clashes: [],
    note: "Targets pigment triggered by inflammation and UV. Slow but steady.",
  },
  {
    key: "alpha_arbutin",
    name: "Alpha arbutin",
    aliases: ["alpha arbutin", "arbutin"],
    family: "brightening",
    targets: [{ metric: "age_spot", onsetDay: 56, peakDay: 112 }],
    guards: [],
    clashes: [],
    note: "Slows melanin production; spots fade only as skin turns over.",
  },
  {
    key: "caffeine",
    name: "Caffeine",
    aliases: ["caffeine"],
    family: "soothing",
    targets: [
      { metric: "eye_bag", onsetDay: 3, peakDay: 14 },
      { metric: "dark_circle", onsetDay: 21, peakDay: 56 },
    ],
    guards: [],
    clashes: [],
    note: "De-puffs within minutes, but that effect is temporary. Scan at the same time of day.",
  },
  {
    key: "zinc",
    name: "Zinc PCA",
    aliases: ["zinc", "zinc pca", "zinc gluconate"],
    family: "soothing",
    targets: [{ metric: "oiliness", onsetDay: 14, peakDay: 28 }],
    guards: [],
    clashes: [],
    note: "Regulates sebum; usually paired with niacinamide.",
  },
  {
    key: "bakuchiol",
    name: "Bakuchiol",
    aliases: ["bakuchiol"],
    family: "antioxidant",
    targets: [
      { metric: "wrinkle", onsetDay: 56, peakDay: 84 },
      { metric: "texture", onsetDay: 42, peakDay: 84 },
    ],
    guards: [],
    clashes: [],
    note: "A plant-based retinol alternative with no known purge phase.",
  },
  {
    key: "spf",
    name: "UV filters",
    aliases: ["spf", "zinc oxide", "titanium dioxide", "avobenzone", "tinosorb", "uvinul"],
    family: "sunscreen",
    targets: [
      { metric: "age_spot", onsetDay: 56, peakDay: 168 },
      { metric: "redness", onsetDay: 28, peakDay: 56 },
    ],
    guards: ["acne"],
    clashes: [],
    note: "Prevents new damage rather than reversing it. Watch breakouts: some formulas clog pores.",
  },
];

const BY_KEY = new Map(ACTIVES.map((a) => [a.key, a]));

export function getActive(key: string) {
  return BY_KEY.get(key);
}

/**
 * Pull known actives out of a free-text INCI list or product name.
 * Returns canonical keys with any percentage found right next to the name.
 */
export function parseActives(text: string): { key: string; label: string; pct?: number }[] {
  const lower = text.toLowerCase();
  const found: { key: string; label: string; pct?: number; at: number }[] = [];
  for (const a of ACTIVES) {
    let best: { at: number; alias: string } | undefined;
    for (const alias of a.aliases) {
      const re = new RegExp(`(^|[^a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`);
      const m = re.exec(lower);
      if (m && (!best || m.index < best.at)) best = { at: m.index, alias };
    }
    if (!best) continue;
    // Look for "10%" within a few characters either side of the match.
    const window = lower.slice(Math.max(0, best.at - 8), best.at + best.alias.length + 10);
    const pct = /(\d+(?:\.\d+)?)\s*%/.exec(window);
    found.push({ key: a.key, label: a.name, pct: pct ? Number(pct[1]) : undefined, at: best.at });
  }
  return found.sort((x, y) => x.at - y.at).map((f) => ({ key: f.key, label: f.label, pct: f.pct }));
}

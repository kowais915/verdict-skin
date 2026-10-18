import type { MetricKey } from "./types";

export interface MetricInfo {
  key: MetricKey;
  label: string;
  /** YouCam Skin Analysis HD concern (used when the capture is ≥1080px on the short side). */
  hd: string;
  /** YouCam Skin Analysis SD concern (fallback for smaller captures). */
  sd: string;
  /** What a higher score means, in plain words. */
  better: string;
  /**
   * Typical scan-to-scan wobble in raw_score points under good capture conditions.
   * Used as the floor for the noise estimate so two lucky baseline scans can't make
   * the test over-confident.
   */
  minNoise: number;
}

export const METRICS: Record<MetricKey, MetricInfo> = {
  redness: { key: "redness", label: "Redness", hd: "hd_redness", sd: "redness", better: "calmer, more even tone", minNoise: 2.2 },
  acne: { key: "acne", label: "Breakouts", hd: "hd_acne", sd: "acne", better: "fewer active blemishes", minNoise: 2.8 },
  pore: { key: "pore", label: "Pores", hd: "hd_pore", sd: "pore", better: "less visible pores", minNoise: 1.8 },
  oiliness: { key: "oiliness", label: "Oil", hd: "hd_oiliness", sd: "oiliness", better: "less shine", minNoise: 3.0 },
  moisture: { key: "moisture", label: "Hydration", hd: "hd_moisture", sd: "moisture", better: "better hydrated", minNoise: 2.5 },
  texture: { key: "texture", label: "Texture", hd: "hd_texture", sd: "texture", better: "smoother surface", minNoise: 1.9 },
  wrinkle: { key: "wrinkle", label: "Fine lines", hd: "hd_wrinkle", sd: "wrinkle", better: "softer lines", minNoise: 1.6 },
  radiance: { key: "radiance", label: "Radiance", hd: "hd_radiance", sd: "radiance", better: "brighter, more luminous", minNoise: 2.6 },
  age_spot: { key: "age_spot", label: "Dark spots", hd: "hd_age_spot", sd: "age_spot", better: "fewer, fainter spots", minNoise: 1.7 },
  dark_circle: { key: "dark_circle", label: "Dark circles", hd: "hd_dark_circle", sd: "dark_circle_v2", better: "lighter under-eyes", minNoise: 2.4 },
  eye_bag: { key: "eye_bag", label: "Puffiness", hd: "hd_eye_bag", sd: "eye_bag", better: "less puffy under-eyes", minNoise: 2.6 },
  firmness: { key: "firmness", label: "Firmness", hd: "hd_firmness", sd: "firmness", better: "firmer contour", minNoise: 1.5 },
};

export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

export function metricLabel(key: MetricKey) {
  return METRICS[key].label;
}

/** Map a YouCam `output[].type` (SD or HD) back to our metric key. */
export function metricFromYoucamType(type: string): MetricKey | undefined {
  const t = type.toLowerCase();
  return METRIC_KEYS.find((k) => METRICS[k].hd === t || METRICS[k].sd === t || k === t);
}

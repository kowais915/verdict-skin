/**
 * On-device capture checks. These run in the browser before anything is sent
 * to YouCam, so bad photos are caught early and never cost API units.
 */

export interface LightReading {
  /** 0–100 overall score used by the verdict engine (scans under 55 are set aside). */
  score: number;
  brightness: number; // mean luma 0–255
  evenness: number; // 0–1, left vs right half balance
  hint?: string;
}

/** Mean luma of the face region and how balanced the light is across it. */
export function readLight(source: CanvasImageSource, w: number, h: number): LightReading {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  // Sample the centre 60% where the face sits.
  ctx.drawImage(source, w * 0.2, h * 0.15, w * 0.6, h * 0.7, 0, 0, 64, 64);
  const { data } = ctx.getImageData(0, 0, 64, 64);
  let left = 0;
  let right = 0;
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4;
      const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (x < 32) left += l;
      else right += l;
    }
  }
  const n = 64 * 32;
  const L = left / n;
  const R = right / n;
  const brightness = (L + R) / 2;
  const evenness = 1 - Math.abs(L - R) / Math.max(1, L + R);
  // Brightness sweet spot is roughly 110–185.
  const b = brightness < 110 ? brightness / 110 : brightness > 185 ? Math.max(0, 1 - (brightness - 185) / 70) : 1;
  const e = Math.min(1, Math.max(0, (evenness - 0.8) / 0.2));
  const score = Math.round(100 * (0.6 * b + 0.4 * e));
  const hint =
    brightness < 90
      ? "Too dark. Face a window or turn on a light in front of you."
      : brightness > 210
        ? "Too bright. Step out of direct sun."
        : evenness < 0.88
          ? `Light is coming from your ${L > R ? "left" : "right"}. Turn to face it.`
          : undefined;
  return { score, brightness, evenness, hint };
}

/** 32×32 grayscale thumbnail, normalised, for comparing framing with the baseline. */
export function signature(source: CanvasImageSource, w: number, h: number): number[] {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, w, h, 0, 0, 32, 32);
  const { data } = ctx.getImageData(0, 0, 32, 32);
  const g: number[] = [];
  for (let i = 0; i < data.length; i += 4) g.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  const mean = g.reduce((a, b) => a + b, 0) / g.length;
  const sd = Math.sqrt(g.reduce((a, b) => a + (b - mean) ** 2, 0) / g.length) || 1;
  return g.map((v) => (v - mean) / sd);
}

/** Correlation between two signatures, mapped to 0–100. */
export function alignment(a: number[] | null, b: number[] | null): number {
  if (!a || !b || a.length !== b.length) return 85;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  const r = s / a.length; // -1..1
  return Math.round(Math.max(0, Math.min(1, (r - 0.3) / 0.6)) * 100);
}

export function thumbnail(source: CanvasImageSource, w: number, h: number, max = 480): string {
  const scale = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  c.getContext("2d")!.drawImage(source, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82);
}

export async function toJpeg(source: CanvasImageSource, w: number, h: number): Promise<Blob> {
  // YouCam resizes anything over 2560px on the long side, so cap there.
  const scale = Math.min(1, 2560 / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  c.getContext("2d")!.drawImage(source, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not encode photo"))), "image/jpeg", 0.92));
}

const listeners = new Set<() => void>();

/** Subscribe hook for useSyncExternalStore: fires when a photo is saved on this device. */
export function subscribePhotos(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** Local, per-device photo storage. Photos never sit on our server. */
export const photoStore = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(`verdict:${key}`);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(`verdict:${key}`, value);
      listeners.forEach((l) => l());
    } catch {
      /* storage full or blocked: the scan still counts, we just lose the preview */
    }
  },
};

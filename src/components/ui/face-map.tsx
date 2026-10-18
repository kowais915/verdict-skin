import type { MetricKey } from "@/lib/types";

/**
 * A topographic face: contour lines suggest skin as terrain, and each zone is
 * tinted by how its concerns scored. Used when no photo is available (photos
 * stay on the device by default).
 */
const ZONES: { id: string; metrics: MetricKey[]; cx: number; cy: number; rx: number; ry: number }[] = [
  { id: "forehead", metrics: ["wrinkle", "texture", "oiliness"], cx: 100, cy: 62, rx: 46, ry: 22 },
  { id: "left-eye", metrics: ["dark_circle", "eye_bag"], cx: 72, cy: 112, rx: 18, ry: 9 },
  { id: "right-eye", metrics: ["dark_circle", "eye_bag"], cx: 128, cy: 112, rx: 18, ry: 9 },
  { id: "nose", metrics: ["pore", "oiliness"], cx: 100, cy: 138, rx: 13, ry: 26 },
  { id: "left-cheek", metrics: ["redness", "pore", "age_spot", "acne"], cx: 64, cy: 152, rx: 24, ry: 26 },
  { id: "right-cheek", metrics: ["redness", "pore", "age_spot", "acne"], cx: 136, cy: 152, rx: 24, ry: 26 },
  { id: "chin", metrics: ["acne", "firmness"], cx: 100, cy: 210, rx: 26, ry: 16 },
];

export function FaceMap({
  scores,
  focus,
  className = "",
}: {
  /** 1–100, higher is healthier. */
  scores: Partial<Record<MetricKey, number>>;
  focus?: MetricKey;
  className?: string;
}) {
  const zoneHeat = (metrics: MetricKey[]) => {
    const vals = (focus ? metrics.filter((m) => m === focus) : metrics).map((m) => scores[m]).filter((v): v is number => v !== undefined);
    if (!vals.length) return 0;
    const worst = Math.min(...vals);
    return Math.max(0, Math.min(1, (75 - worst) / 35)); // 75+ calm, 40- strong
  };
  return (
    <svg viewBox="0 0 200 260" className={className} role="img" aria-label="Face map of skin scores">
      <defs>
        <clipPath id="face-clip">
          <path d="M100 18c44 0 72 34 72 86 0 30-6 58-20 84-14 26-32 50-52 50s-38-24-52-50C34 162 28 134 28 104c0-52 28-86 72-86z" />
        </clipPath>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <g clipPath="url(#face-clip)">
        <rect width="200" height="260" fill="var(--color-vial)" />
        {ZONES.map((z) => {
          const heat = zoneHeat(z.metrics);
          return heat > 0.02 ? (
            <ellipse key={z.id} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill="var(--color-ditch)" opacity={0.12 + heat * 0.5} filter="url(#soft)" />
          ) : null;
        })}
        {/* contour lines */}
        {Array.from({ length: 11 }, (_, i) => {
          const s = 1 - i * 0.085;
          return (
            <path
              key={i}
              d="M100 18c44 0 72 34 72 86 0 30-6 58-20 84-14 26-32 50-52 50s-38-24-52-50C34 162 28 134 28 104c0-52 28-86 72-86z"
              fill="none"
              stroke="var(--color-ink)"
              strokeOpacity={0.09 + i * 0.012}
              transform={`translate(${100 * (1 - s)} ${140 * (1 - s)}) scale(${s})`}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </g>
      <path d="M100 18c44 0 72 34 72 86 0 30-6 58-20 84-14 26-32 50-52 50s-38-24-52-50C34 162 28 134 28 104c0-52 28-86 72-86z" fill="none" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* features, drawn lightly */}
      <path d="M60 104q12-7 24 0M116 104q12-7 24 0" fill="none" stroke="var(--color-ink)" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M100 120v34q-6 4-10 2M84 188q16 9 32 0" fill="none" stroke="var(--color-ink)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

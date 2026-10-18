import type { ProductCategory } from "@/lib/types";

/**
 * Packaging illustration, tinted per product. Gives every product a recognisable
 * object without relying on brand imagery.
 */
export function Vial({
  tint,
  category,
  label,
  size = 56,
  className = "",
}: {
  tint: string;
  category: ProductCategory;
  label?: string;
  size?: number;
  className?: string;
}) {
  const shape = category === "serum" || category === "eye" ? "dropper" : category === "moisturizer" ? "jar" : category === "toner" ? "bottle" : "tube";
  const initial = (label ?? "").slice(0, 1).toUpperCase();
  return (
    <svg viewBox="0 0 64 80" width={size} height={(size * 80) / 64} className={className} aria-hidden>
      {shape === "dropper" && (
        <>
          <rect x="27" y="4" width="10" height="14" rx="5" fill="#231d35" />
          <rect x="24" y="16" width="16" height="10" rx="2" fill="#231d35" />
          <rect x="16" y="24" width="32" height="52" rx="9" fill={tint} stroke="#231d35" strokeOpacity=".18" />
          <rect x="16" y="44" width="32" height="18" fill="#fafbf8" fillOpacity=".75" />
        </>
      )}
      {shape === "jar" && (
        <>
          <rect x="10" y="26" width="44" height="12" rx="4" fill="#231d35" />
          <rect x="8" y="36" width="48" height="38" rx="10" fill={tint} stroke="#231d35" strokeOpacity=".18" />
          <rect x="8" y="48" width="48" height="14" fill="#fafbf8" fillOpacity=".75" />
        </>
      )}
      {shape === "bottle" && (
        <>
          <rect x="25" y="4" width="14" height="12" rx="3" fill="#231d35" />
          <path d="M22 16h20v6c6 3 8 7 8 12v38a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6V34c0-5 2-9 8-12z" fill={tint} stroke="#231d35" strokeOpacity=".18" />
          <rect x="14" y="44" width="36" height="18" fill="#fafbf8" fillOpacity=".75" />
        </>
      )}
      {shape === "tube" && (
        <>
          <path d="M14 6h36l-4 52H18z" fill={tint} stroke="#231d35" strokeOpacity=".18" />
          <rect x="16" y="22" width="32" height="16" fill="#fafbf8" fillOpacity=".75" />
          <rect x="22" y="58" width="20" height="18" rx="3" fill="#231d35" />
        </>
      )}
      {initial && (
        <text
          x="32"
          y={shape === "tube" ? 34.5 : shape === "jar" ? 59 : 57.5}
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="#231d35"
          style={{ fontStretch: "75%" }}
        >
          {initial}
        </text>
      )}
    </svg>
  );
}

import type { StripCell } from "@/lib/verdict";

const FILL: Record<StripCell["state"], string> = {
  baseline: "bg-ink",
  pending: "bg-pending",
  missed: "bg-[repeating-linear-gradient(135deg,var(--color-pending)_0_3px,transparent_3px_6px)] ring-1 ring-inset ring-pending",
  keep: "bg-keep",
  ditch: "bg-ditch",
  inconclusive: "bg-unsure",
};

const LABEL: Record<StripCell["state"], string> = {
  baseline: "baseline",
  pending: "not yet scanned",
  missed: "scan missed",
  keep: "leaning keep",
  ditch: "leaning ditch",
  inconclusive: "not clear yet",
};

/**
 * The litmus strip: one pad per scheduled scan, coloured by what the evidence
 * said on that day. Reads left to right like a test strip developing.
 */
export function Litmus({
  cells,
  size = "md",
  showDays = false,
  animate = false,
  className = "",
}: {
  cells: StripCell[];
  size?: "sm" | "md" | "lg";
  showDays?: boolean;
  animate?: boolean;
  className?: string;
}) {
  const h = size === "lg" ? "h-20 sm:h-24" : size === "md" ? "h-8" : "h-2.5";
  const gap = size === "sm" ? "gap-[3px]" : "gap-1.5";
  const radius = size === "sm" ? "rounded-[2px]" : size === "md" ? "rounded-[5px]" : "rounded-lg";
  return (
    <div className={className}>
      <ol className={`flex ${gap}`} aria-label="Trial evidence strip">
        {cells.map((c, i) => (
          <li
            key={`${c.day}-${i}`}
            className={`${h} ${radius} flex-1 origin-bottom ${FILL[c.state]} ${animate && c.state !== "pending" ? "animate-develop" : ""} ${c.state === "baseline" && size !== "sm" ? "max-w-6" : ""}`}
            style={animate ? { animationDelay: `${i * 140}ms` } : undefined}
            title={`Day ${c.day}: ${LABEL[c.state]}`}
          >
            <span className="sr-only">
              Day {c.day}: {LABEL[c.state]}
            </span>
          </li>
        ))}
      </ol>
      {showDays && (
        <ol className={`mt-1.5 flex ${gap} text-2xs text-smoke numeral`} aria-hidden>
          {cells.map((c, i) => (
            <li key={`${c.day}-${i}`} className={`flex-1 ${c.state === "baseline" && size !== "sm" ? "max-w-6" : ""}`}>
              {c.day === 0 ? "0" : c.day}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function LitmusKey({ className = "" }: { className?: string }) {
  const items: [string, string][] = [
    ["bg-keep", "Leaning keep"],
    ["bg-unsure", "Not clear yet"],
    ["bg-ditch", "Leaning ditch"],
    ["bg-pending", "Still to come"],
  ];
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 text-2xs text-smoke ${className}`}>
      {items.map(([c, l]) => (
        <li key={l} className="flex items-center gap-1.5">
          <span className={`inline-block size-2.5 rounded-[3px] ${c}`} />
          {l}
        </li>
      ))}
    </ul>
  );
}

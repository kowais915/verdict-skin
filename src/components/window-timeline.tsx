import { addDays, formatDay } from "@/lib/dates";

/**
 * The trial laid against the return window. The point of the app in one line:
 * a verdict has to land left of the return marker.
 */
export function WindowTimeline({
  startedAt,
  durationDays,
  deadlineDay,
  today,
  checkpointDay,
  purgeWindow,
}: {
  startedAt: string;
  durationDays: number;
  deadlineDay: number;
  today: number;
  checkpointDay?: number;
  purgeWindow?: { startDay: number; endDay: number };
}) {
  const span = Math.max(durationDays, deadlineDay) + 2;
  const frac = (d: number) => Math.min(Math.max(d, 0), span) / span;
  const pct = (d: number) => `${frac(d) * 100}%`;
  return (
    <div className="pt-7 pb-9">
      <div className="relative h-3 rounded-full bg-mist">
        {purgeWindow && (
          <div className="absolute inset-y-0 rounded-full bg-unsure-wash" style={{ left: pct(purgeWindow.startDay), width: `calc(${pct(purgeWindow.endDay)} - ${pct(purgeWindow.startDay)})` }} title="Purge window" />
        )}
        <div className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: pct(Math.min(today, durationDays)) }} />

        {/* today */}
        <Marker at={pct(today)} f={frac(today)} label={`Today, day ${today}`} position="top" className="text-ink" dot="bg-ink" />
        {/* return deadline */}
        <Marker
          at={pct(deadlineDay)}
          f={frac(deadlineDay)}
          label={`Returns close ${formatDay(addDays(startedAt, deadlineDay))}`}
          position="bottom"
          className="text-ditch"
          dot="bg-ditch"
          tall
        />
        {checkpointDay !== undefined && (
          <Marker at={pct(checkpointDay)} f={frac(checkpointDay)} label={`Checkpoint, day ${checkpointDay}`} position="top" className="text-serum-deep" dot="bg-serum-deep" hideLabel={Math.abs(checkpointDay - today) < 4} />
        )}
      </div>
      <div className="mt-1 flex justify-between text-2xs text-smoke numeral">
        <span>day 0</span>
        <span>trial ends day {durationDays}</span>
      </div>
    </div>
  );
}

function Marker({
  at,
  f,
  label,
  position,
  className,
  dot,
  tall,
  hideLabel,
}: {
  at: string;
  f: number;
  label: string;
  position: "top" | "bottom";
  className: string;
  dot: string;
  tall?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <div className="absolute top-1/2" style={{ left: at }}>
      <span className={`absolute left-0 -translate-x-1/2 -translate-y-1/2 block rounded-full ring-2 ring-vial ${dot} ${tall ? "h-6 w-1.5" : "size-3.5"}`} />
      {!hideLabel && (
        <span
          className={`absolute whitespace-nowrap text-2xs font-semibold ${className} ${position === "top" ? "-top-7" : "top-4"} ${
            f > 0.75 ? "right-0 translate-x-2" : f < 0.15 ? "left-0 -translate-x-2" : "left-0 -translate-x-1/2"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Vial } from "../ui/vial";
import type { StripCell } from "@/lib/verdict";

/**
 * The landing page's single orchestrated moment: a trial develops in a few
 * seconds, the return window counts down, and the verdict lands before it closes.
 */
const DAYS = [0, 7, 14, 21, 25, 28, 35, 42];
const STATES: StripCell["state"][] = ["baseline", "inconclusive", "inconclusive", "keep", "keep", "pending", "pending", "pending"];
const STOP_DAY = 26;
const RETURN_DAY = 27;

export function HeroTrial() {
  const [day, setDay] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const t = setTimeout(() => setDay(STOP_DAY), 0);
      return () => clearTimeout(t);
    }
    let d = 0;
    const id = setInterval(() => {
      d += 1;
      setDay(d);
      if (d >= STOP_DAY) clearInterval(id);
    }, 85);
    return () => clearInterval(id);
  }, []);

  const done = day >= STOP_DAY;
  const left = RETURN_DAY - day;

  return (
    <div className="rounded-vial border border-hairline bg-vial p-6 sm:p-8" aria-label="Example trial: Calm Fix Serum, verdict keep">
      <div className="flex items-start gap-4">
        <Vial tint="#BFD8D2" category="serum" label="Halden" size={52} />
        <div className="flex-1">
          <p className="text-sm text-smoke">Halden Lab</p>
          <p className="text-xl font-semibold leading-tight">Calm Fix Serum</p>
          <p className="mt-1 text-sm text-smoke numeral">Niacinamide 10%, day {day} of 42</p>
        </div>
      </div>

      <ol className="mt-8 flex h-24 gap-1.5 sm:h-28" aria-hidden>
        {DAYS.map((d, i) => {
          const reached = day >= d;
          const s = reached ? STATES[i] : "pending";
          const bg = s === "baseline" ? "bg-ink" : s === "keep" ? "bg-keep" : s === "inconclusive" ? "bg-unsure" : "bg-pending";
          return <li key={d} className={`flex-1 rounded-lg transition-colors duration-500 ${bg} ${d === 0 ? "max-w-6" : ""}`} />;
        })}
      </ol>
      <ol className="mt-1.5 flex gap-1.5 text-2xs text-smoke numeral" aria-hidden>
        {DAYS.map((d) => (
          <li key={d} className={`flex-1 ${d === 0 ? "max-w-6" : ""}`}>
            {d}
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`display text-7xl transition-colors duration-700 sm:text-8xl ${done ? "text-keep" : "text-unsure"}`}>{done ? "Keep." : "Not yet"}</p>
          <p className="mt-2 text-[15px]">{done ? "Redness up 7 points, oil up 8.6. Both clear the noise band." : "Waiting for a change bigger than the noise."}</p>
        </div>
        <p className={`rounded-full px-3 py-1.5 text-sm font-semibold numeral ${left <= 3 ? "bg-ditch-wash text-ditch" : "bg-mist"}`}>
          {left <= 1 ? "Returns close tomorrow" : `${left} days to return`}
        </p>
      </div>
    </div>
  );
}

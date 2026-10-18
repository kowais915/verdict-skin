"use client";

import { useState, useTransition } from "react";
import { saveCheckIn } from "../actions";
import { Button } from "@/components/ui/button";
import { IconCheck } from "@/components/ui/icons";
import type { CheckIn } from "@/lib/types";

export function CheckInForm({ date, existing }: { date: string; existing?: CheckIn }) {
  const [sleep, setSleep] = useState(existing?.sleepHours ?? 7);
  const [stress, setStress] = useState<number>(existing?.stress ?? 2);
  const [sun, setSun] = useState<CheckIn["sun"]>(existing?.sun ?? "none");
  const [onPeriod, setOnPeriod] = useState(existing?.onPeriod ?? false);
  const [newProduct, setNewProduct] = useState(existing?.newProduct ?? false);
  const [note, setNote] = useState(existing?.note ?? "");
  const [saved, setSaved] = useState(Boolean(existing));
  const [pending, start] = useTransition();

  const touch = () => setSaved(false);

  return (
    <form
      className="space-y-7"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await saveCheckIn({ date, sleepHours: sleep, stress, sun, onPeriod, newProduct, note });
          setSaved(true);
        });
      }}
    >
      <div>
        <label htmlFor="sleep" className="flex items-baseline justify-between font-semibold">
          Sleep last night <span className="display text-3xl numeral">{sleep}h</span>
        </label>
        <input id="sleep" type="range" min={3} max={11} step={0.5} value={sleep} onChange={(e) => { setSleep(Number(e.target.value)); touch(); }} className="mt-2 w-full accent-[var(--color-ink)]" />
      </div>

      <fieldset>
        <legend className="font-semibold">Stress</legend>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={stress === n}
              onClick={() => { setStress(n); touch(); }}
              className={`rounded-2xl py-2.5 text-sm font-semibold ${stress === n ? "bg-ink text-vial" : "border border-hairline bg-vial"}`}
            >
              {["Calm", "Fine", "Busy", "Tense", "Rough"][n - 1]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-semibold">Sun on your face</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["none", "some", "lots"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sun === s}
              onClick={() => { setSun(s); touch(); }}
              className={`rounded-2xl py-2.5 text-sm font-semibold ${sun === s ? "bg-ink text-vial" : "border border-hairline bg-vial"}`}
            >
              {s === "none" ? "Barely" : s === "some" ? "A little" : "A lot"}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-3">
        <Toggle label="On my period" hint="Hormones shift oil and breakouts for a few days." on={onPeriod} set={(v) => { setOnPeriod(v); touch(); }} />
        <Toggle label="Started something new today" hint="Any product, not just ones on trial." on={newProduct} set={(v) => { setNewProduct(v); touch(); }} />
      </div>

      <label className="block">
        <span className="font-semibold">Anything else?</span>
        <textarea rows={2} maxLength={280} value={note} onChange={(e) => { setNote(e.target.value); touch(); }} className="field mt-2" placeholder="Long flight, new pillowcase, spicy dinner…" />
      </label>

      <Button type="submit" size="lg" disabled={pending || saved}>
        {saved ? (
          <>
            <IconCheck /> Saved for today
          </>
        ) : pending ? (
          "Saving…"
        ) : (
          "Save today's log"
        )}
      </Button>
    </form>
  );
}

function Toggle({ label, hint, on, set }: { label: string; hint: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => set(!on)} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-hairline bg-vial p-4 text-left">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-smoke">{hint}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-ink" : "bg-pending"}`}>
        <span className={`absolute top-1 size-5 rounded-full bg-vial transition-all ${on ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

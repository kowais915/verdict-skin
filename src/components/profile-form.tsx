"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/app/app/actions";
import { METRICS, METRIC_KEYS } from "@/lib/metrics";
import { Button } from "./ui/button";
import { IconCheck } from "./ui/icons";
import type { MetricKey, UserProfile } from "@/lib/types";

export const SKIN_TYPES: { value: UserProfile["skinType"]; label: string; hint: string }[] = [
  { value: "oily", label: "Oily", hint: "Shiny by midday, visible pores" },
  { value: "dry", label: "Dry", hint: "Tight after washing, flaky patches" },
  { value: "combination", label: "Combination", hint: "Oily T-zone, drier cheeks" },
  { value: "normal", label: "Balanced", hint: "Rarely oily or tight" },
  { value: "sensitive", label: "Sensitive", hint: "Reacts, stings or flushes easily" },
];

export function GoalPicker({ goals, onChange }: { goals: MetricKey[]; onChange: (g: MetricKey[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {METRIC_KEYS.map((m) => {
        const on = goals.includes(m);
        const full = goals.length >= 3 && !on;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={on}
            disabled={full}
            onClick={() => onChange(on ? goals.filter((g) => g !== m) : [...goals, m])}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${on ? "bg-ink text-vial" : "border border-hairline bg-vial hover:border-ink/40"}`}
          >
            {METRICS[m].label}
          </button>
        );
      })}
    </div>
  );
}

export function ProfileForm({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [skinType, setSkinType] = useState(profile.skinType);
  const [goals, setGoals] = useState<MetricKey[]>(profile.goals);
  const [reminderTime, setReminderTime] = useState(profile.reminderTime);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-8"
      onChange={() => setSaved(false)}
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await saveProfile({ name, skinType, goals, reminderTime });
          setSaved(true);
          router.refresh();
        });
      }}
    >
      <label className="block max-w-sm">
        <span className="mb-1.5 block font-semibold">First name</span>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <fieldset>
        <legend className="font-semibold">Skin type</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {SKIN_TYPES.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={skinType === s.value}
              onClick={() => { setSkinType(s.value); setSaved(false); }}
              className={`rounded-full px-4 py-2 text-sm font-medium ${skinType === s.value ? "bg-ink text-vial" : "border border-hairline bg-vial"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="font-semibold">Goals</legend>
        <p className="text-sm text-smoke">Up to three. Trials rank these first when deciding what to measure.</p>
        <div className="mt-3">
          <GoalPicker goals={goals} onChange={(g) => { setGoals(g); setSaved(false); }} />
        </div>
      </fieldset>
      <label className="block max-w-[12rem]">
        <span className="mb-1.5 block font-semibold">Scan reminder</span>
        <input type="time" className="field" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
      </label>
      <Button type="submit" disabled={pending || saved}>
        {saved ? (
          <>
            <IconCheck /> Saved
          </>
        ) : pending ? (
          "Saving…"
        ) : (
          "Save changes"
        )}
      </Button>
    </form>
  );
}

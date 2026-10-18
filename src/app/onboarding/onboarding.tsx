"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadSampleData, saveProfile } from "@/app/app/actions";
import { GoalPicker, SKIN_TYPES } from "@/components/profile-form";
import { Button } from "@/components/ui/button";
import { Litmus } from "@/components/ui/litmus";
import type { MetricKey, UserProfile } from "@/lib/types";

const DEMO_STRIP = [
  { day: 0, state: "baseline" as const },
  { day: 7, state: "inconclusive" as const },
  { day: 14, state: "inconclusive" as const },
  { day: 21, state: "keep" as const },
  { day: 25, state: "keep" as const },
  { day: 28, state: "keep" as const },
];

export function Onboarding({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.name === "there" ? "" : profile.name);
  const [skinType, setSkinType] = useState(profile.skinType);
  const [goals, setGoals] = useState<MetricKey[]>(profile.goals);
  const [pending, start] = useTransition();

  const finish = (withSample: boolean) =>
    start(async () => {
      await saveProfile({ name: name || "there", skinType, goals, reminderTime: profile.reminderTime });
      if (withSample) await loadSampleData();
      router.push(withSample ? "/app" : "/app/trials/new");
      router.refresh();
    });

  return (
    <div>
      <div className="flex gap-1.5" aria-label={`Step ${step + 1} of 4`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-ink" : "bg-pending"}`} />
        ))}
      </div>

      {step === 0 && (
        <section className="mt-10 animate-rise">
          <h1 className="display text-6xl sm:text-7xl">Is it working?</h1>
          <p className="mt-4 text-xl leading-relaxed text-ink/80 measure">
            Verdict turns every new skincare product into a small, honest experiment. You scan on schedule, it measures the change against your own noise, and you
            get a verdict before the store stops taking returns.
          </p>
          <Litmus cells={DEMO_STRIP} size="lg" animate className="mt-10 max-w-md" />
          <label className="mt-10 block max-w-sm">
            <span className="mb-1.5 block font-semibold">What should we call you?</span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" autoFocus />
          </label>
          <Button size="lg" className="mt-8" onClick={() => setStep(1)}>
            Continue
          </Button>
        </section>
      )}

      {step === 1 && (
        <section className="mt-10 animate-rise">
          <h1 className="display text-5xl sm:text-6xl">Your skin, in a word.</h1>
          <p className="mt-3 text-lg text-ink/80 measure">It shapes which side effects the trial agent watches for.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {SKIN_TYPES.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={skinType === s.value}
                onClick={() => setSkinType(s.value)}
                className={`rounded-vial border p-5 text-left transition-colors ${skinType === s.value ? "border-ink bg-ink text-vial" : "border-hairline bg-vial hover:border-ink/40"}`}
              >
                <span className="block text-lg font-semibold">{s.label}</span>
                <span className={`block text-sm ${skinType === s.value ? "text-vial/75" : "text-smoke"}`}>{s.hint}</span>
              </button>
            ))}
          </div>
          <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} />
        </section>
      )}

      {step === 2 && (
        <section className="mt-10 animate-rise">
          <h1 className="display text-5xl sm:text-6xl">What are you working on?</h1>
          <p className="mt-3 text-lg text-ink/80 measure">Pick up to three. When a product could change several things, these get measured first.</p>
          <div className="mt-8">
            <GoalPicker goals={goals} onChange={setGoals} />
          </div>
          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!goals.length} />
        </section>
      )}

      {step === 3 && (
        <section className="mt-10 animate-rise">
          <h1 className="display text-5xl sm:text-6xl">How a trial runs.</h1>
          <ol className="mt-8 space-y-6">
            {[
              ["Add the product the day it arrives", "Paste the ingredient list. The agent works out what should change, how long that takes, and whether it fits the return window."],
              ["Take two baseline scans", "A minute apart, before the first use. Their difference is your noise floor: how much readings move when nothing has changed."],
              ["Scan on schedule", "About once a week, same mirror and light. YouCam Skin AI scores 12 skin concerns each time. A short daily log flags rough weeks."],
              ["Get the verdict", "Keep, ditch, or not yet, with the evidence. If it's a ditch, you'll have a return note ready before the window closes."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-5">
                <span className="display w-8 shrink-0 text-4xl text-smoke numeral">{i + 1}</span>
                <span>
                  <span className="block text-lg font-semibold">{t}</span>
                  <span className="block text-ink/80 measure">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => finish(false)} disabled={pending}>
              {pending ? "Setting up…" : "Start my first trial"}
            </Button>
            <Button size="lg" variant="secondary" onClick={() => finish(true)} disabled={pending}>
              Explore with sample trials first
            </Button>
            <Button size="lg" variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function Nav({ onBack, onNext, nextDisabled }: { onBack: () => void; onNext: () => void; nextDisabled?: boolean }) {
  return (
    <div className="mt-10 flex gap-3">
      <Button size="lg" onClick={onNext} disabled={nextDisabled}>
        Continue
      </Button>
      <Button size="lg" variant="ghost" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}

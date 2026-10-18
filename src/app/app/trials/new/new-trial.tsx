"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { previewTrial, startTrial } from "../../actions";
import { parseActives } from "@/lib/agent/actives";
import type { DesignStep, TrialPlan } from "@/lib/agent/designer";
import { METRICS } from "@/lib/metrics";
import { addDays, formatDay } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Vial } from "@/components/ui/vial";
import { IconAgent, IconAlert, IconBack, IconCheck } from "@/components/ui/icons";
import type { ProductCategory } from "@/lib/types";

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "serum", label: "Serum" },
  { value: "treatment", label: "Treatment" },
  { value: "moisturizer", label: "Moisturizer" },
  { value: "toner", label: "Toner" },
  { value: "cleanser", label: "Cleanser" },
  { value: "sunscreen", label: "Sunscreen" },
  { value: "eye", label: "Eye" },
];
const WINDOWS = [14, 30, 60, 90];
const TINTS = ["#BFD8D2", "#E9C9A8", "#C7D3EE", "#F2D7DF", "#EDE3CF", "#D8CFF0", "#F4EBC8"];

type FormState = {
  name: string;
  brand: string;
  category: ProductCategory;
  retailer: string;
  price: number;
  url: string;
  purchasedAt: string;
  returnWindowDays: number;
  slot: "am" | "pm" | "both";
  ingredients: string;
  tint: string;
};

const EXAMPLE: FormState = {
  name: "Clear Shift BHA Serum",
  brand: "Pell & Moss",
  category: "serum",
  retailer: "Lumen Beauty",
  price: 34,
  url: "",
  purchasedAt: new Date().toISOString().slice(0, 10),
  returnWindowDays: 30,
  slot: "pm",
  ingredients:
    "Aqua, Propanediol, Salicylic Acid 2%, Niacinamide 4%, Glycerin, Panthenol, Allantoin, Sodium Hyaluronate, Xanthan Gum, Phenoxyethanol, Ethylhexylglycerin",
  tint: "#D8CFF0",
};

type Stage = "product" | "designing" | "plan";

export function NewTrial({ today }: { today: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("product");
  const [form, setForm] = useState<FormState>({
    name: "",
    brand: "",
    category: "serum",
    retailer: "",
    price: 0,
    url: "",
    purchasedAt: today,
    returnWindowDays: 30,
    slot: "pm",
    ingredients: "",
    tint: TINTS[0],
  });
  const [error, setError] = useState<string>();
  const [steps, setSteps] = useState<DesignStep[]>([]);
  const [plan, setPlan] = useState<TrialPlan>();
  const [shown, setShown] = useState(0);
  const [starting, startTransition] = useTransition();

  const actives = useMemo(() => parseActives(`${form.name} ${form.ingredients}`), [form.name, form.ingredients]);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Reveal the agent's steps one at a time, as if it's thinking out loud.
  useEffect(() => {
    if (stage !== "designing" || !steps.length) return;
    if (shown >= steps.length) {
      const t = setTimeout(() => setStage("plan"), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 350 : 750);
    return () => clearTimeout(t);
  }, [stage, steps, shown]);

  async function design() {
    setError(undefined);
    if (!form.name || !form.brand || !form.retailer) {
      setError("Add the product name, brand and where you bought it.");
      return;
    }
    setStage("designing");
    setShown(0);
    setSteps([]);
    const res = await previewTrial(form);
    if (!res.ok) {
      setError(res.error);
      setStage("product");
      return;
    }
    setSteps(res.steps);
    setPlan(res.plan);
  }

  function begin() {
    startTransition(async () => {
      const { trialId } = await startTrial(form);
      router.push(`/app/scan?trial=${trialId}&baseline=1`);
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-4">
        {stage !== "product" && (
          <button type="button" onClick={() => setStage("product")} className="grid size-10 place-items-center rounded-full hover:bg-mist" aria-label="Edit product">
            <IconBack />
          </button>
        )}
        <ol className="flex gap-2 text-sm" aria-label="Progress">
          {(["product", "designing", "plan"] as Stage[]).map((s, i) => (
            <li key={s} className={`flex items-center gap-2 ${stage === s ? "text-ink font-semibold" : "text-smoke"}`}>
              <span className={`grid size-6 place-items-center rounded-full text-2xs numeral ${stage === s ? "bg-ink text-vial" : "bg-mist"}`}>{i + 1}</span>
              <span className="hidden sm:inline">{s === "product" ? "The product" : s === "designing" ? "Agent designs" : "Your plan"}</span>
            </li>
          ))}
        </ol>
      </div>

      {stage === "product" && (
        <form
          className="mt-8 space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
            design();
          }}
        >
          <div>
            <h1 className="display text-5xl sm:text-6xl">What are you testing?</h1>
            <p className="mt-3 text-lg text-ink/80 measure">
              Start the day it arrives, before the first use. The ingredient list tells the agent what to measure and how long it needs.
            </p>
            <button type="button" onClick={() => setForm({ ...EXAMPLE, purchasedAt: today })} className="mt-3 text-sm font-semibold text-serum-deep underline underline-offset-4">
              Fill in an example product
            </button>
          </div>

          <div>
            <label htmlFor="ing" className="font-semibold">
              Ingredient list
            </label>
            <p className="text-sm text-smoke">Copy it from the box or the product page. Percentages help.</p>
            <textarea
              id="ing"
              rows={4}
              value={form.ingredients}
              onChange={(e) => set("ingredients", e.target.value)}
              placeholder="Aqua, Niacinamide 10%, Zinc PCA 1%, Glycerin…"
              className="field mt-2"
            />
            <div className="mt-2 flex min-h-8 flex-wrap items-center gap-2" aria-live="polite">
              {actives.length ? (
                <>
                  <span className="text-sm text-smoke">Recognised:</span>
                  {actives.map((a) => (
                    <span key={a.key} className="inline-flex items-center gap-1 rounded-full bg-serum px-2.5 py-1 text-2xs font-semibold text-serum-deep">
                      <IconCheck width={12} height={12} />
                      {a.label}
                      {a.pct ? ` ${a.pct}%` : ""}
                    </span>
                  ))}
                </>
              ) : form.ingredients ? (
                <span className="text-sm text-smoke">No known actives yet. The agent will track your goals instead.</span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Product name">
              <input className="field" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Calm Fix Serum" />
            </Field>
            <Field label="Brand">
              <input className="field" value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Halden Lab" />
            </Field>
          </div>

          <fieldset>
            <legend className="font-semibold">Type</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip key={c.value} on={form.category === c.value} onClick={() => set("category", c.value)}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-semibold">When you&apos;ll use it</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["am", "pm", "both"] as const).map((s) => (
                <Chip key={s} on={form.slot === s} onClick={() => set("slot", s)}>
                  {s === "am" ? "Morning" : s === "pm" ? "Night" : "Morning and night"}
                </Chip>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Bought from">
              <input className="field" list="retailers" value={form.retailer} onChange={(e) => set("retailer", e.target.value)} placeholder="Store or site" />
              <datalist id="retailers">
                <option value="Lumen Beauty" />
                <option value="Shelf & Co" />
                <option value="Brand website" />
                <option value="Pharmacy" />
              </datalist>
            </Field>
            <Field label="Price (USD)">
              <input className="field numeral" type="number" min={0} step="0.01" value={form.price || ""} onChange={(e) => set("price", Number(e.target.value))} placeholder="38" />
            </Field>
            <Field label="Bought on">
              <input className="field" type="date" max={today} value={form.purchasedAt} onChange={(e) => set("purchasedAt", e.target.value)} />
            </Field>
          </div>

          <fieldset>
            <legend className="font-semibold">Return window</legend>
            <p className="text-sm text-smoke">
              Returns close on <span className="font-semibold text-ink">{formatDay(addDays(form.purchasedAt, Number(form.returnWindowDays) || 0), { month: "long", day: "numeric" })}</span>.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {WINDOWS.map((w) => (
                <Chip key={w} on={Number(form.returnWindowDays) === w} onClick={() => set("returnWindowDays", w)}>
                  {w} days
                </Chip>
              ))}
              <input
                aria-label="Custom return window in days"
                className="field w-24 numeral"
                type="number"
                min={0}
                max={365}
                value={form.returnWindowDays}
                onChange={(e) => set("returnWindowDays", Number(e.target.value))}
              />
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-semibold">Bottle colour</legend>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              {TINTS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("tint", t)}
                  aria-label={`Tint ${t}`}
                  aria-pressed={form.tint === t}
                  className={`rounded-2xl p-1.5 ${form.tint === t ? "bg-vial ring-2 ring-ink" : "hover:bg-mist"}`}
                >
                  <Vial tint={t} category={form.category} size={28} />
                </button>
              ))}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="flex items-center gap-2 rounded-2xl bg-ditch-wash px-4 py-3 text-ditch">
              <IconAlert /> {error}
            </p>
          )}
          <div>
            <Button type="submit" size="lg" className="w-full sm:w-auto">
              <IconAgent /> Design my trial
            </Button>
          </div>
        </form>
      )}

      {stage === "designing" && (
        <section className="mt-8" aria-live="polite">
          <div className="flex items-center gap-4">
            <Vial tint={form.tint ?? TINTS[0]} category={form.category} label={form.brand} size={48} />
            <div>
              <p className="text-smoke">{form.brand}</p>
              <h1 className="text-3xl font-semibold tracking-tight">{form.name}</h1>
            </div>
          </div>
          <ol className="mt-8 space-y-6">
            {steps.slice(0, shown).map((s) => (
              <StepView key={s.id} step={s} />
            ))}
            {shown < steps.length || !steps.length ? (
              <li className="flex items-center gap-3 text-smoke">
                <span className="relative grid size-8 place-items-center rounded-full bg-serum text-serum-deep">
                  <IconAgent width={16} height={16} className="animate-pulse" />
                </span>
                {steps[shown]?.title ?? "Reading the label"}…
              </li>
            ) : null}
          </ol>
        </section>
      )}

      {stage === "plan" && plan && (
        <section className="mt-8 space-y-8">
          <div>
            <p className="text-smoke">
              {form.brand} {form.name}
            </p>
            <h1 className="display mt-1 text-5xl sm:text-6xl">A {plan.durationDays}-day trial.</h1>
            <p className="mt-3 text-lg text-ink/80 measure">
              {plan.fitsReturnWindow
                ? `It finishes ${formatDay(addDays(today, plan.durationDays))}, before returns close on ${formatDay(plan.returnDeadline)}.`
                : plan.returnCheckpointDay
                  ? `Returns close ${formatDay(plan.returnDeadline)}, so there's a checkpoint verdict on day ${plan.returnCheckpointDay}.`
                  : `Returns close ${formatDay(plan.returnDeadline)}, which is too soon for a fair read.`}
            </p>
          </div>

          <div className="rounded-vial border border-hairline bg-vial p-5 sm:p-6">
            <h2 className="font-semibold">Judged on</h2>
            <ul className="mt-3 divide-y divide-hairline">
              {plan.hypotheses.map((h) => (
                <li key={h.metric} className="flex items-baseline justify-between gap-4 py-2.5">
                  <span className="font-medium">{METRICS[h.metric].label}</span>
                  <span className="text-sm text-smoke numeral">from day {h.onsetDay}</span>
                </li>
              ))}
            </ul>
            {plan.guardMetrics.length > 0 && (
              <p className="mt-3 text-sm text-smoke">Also watching {plan.guardMetrics.map((g) => METRICS[g].label.toLowerCase()).join(" and ")} for irritation.</p>
            )}
          </div>

          <div>
            <h2 className="font-semibold">Scan days</h2>
            <ScheduleStrip plan={plan} start={today} />
          </div>

          <details className="group rounded-vial border border-hairline bg-vial p-5 sm:p-6">
            <summary className="cursor-pointer list-none font-semibold">
              <span className="group-open:hidden">Show the agent&apos;s reasoning</span>
              <span className="hidden group-open:inline">Agent&apos;s reasoning</span>
            </summary>
            <ol className="mt-5 space-y-6">
              {steps.map((s) => (
                <StepView key={s.id} step={s} />
              ))}
            </ol>
          </details>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={begin} disabled={starting}>
              {starting ? "Starting…" : "Start trial and take baseline scans"}
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setStage("product")}>
              Edit product
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function StepView({ step }: { step: DesignStep }) {
  return (
    <li className="animate-rise flex gap-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-serum text-serum-deep">
        <IconCheck width={16} height={16} />
      </span>
      <div className="min-w-0">
        <p className="font-semibold">{step.title}</p>
        <ul className="mt-1.5 space-y-1.5">
          {step.lines.map((l) => (
            <li
              key={l.text}
              className={`text-[15px] leading-relaxed measure ${
                l.tone === "warn" ? "rounded-xl bg-unsure-wash/70 px-3 py-2" : l.tone === "good" ? "text-ink" : "text-ink/80"
              }`}
            >
              {l.text}
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

function ScheduleStrip({ plan, start }: { plan: TrialPlan; start: string }) {
  const days = [...new Set(plan.scanDays)];
  const deadline = Math.round((Date.parse(plan.returnDeadline) - Date.parse(start)) / 86_400_000);
  return (
    <ol className="mt-3 flex gap-1.5 overflow-x-auto pb-2">
      {days.map((d) => {
        const date = addDays(start, d);
        const special = d === 0 ? "Baseline ×2" : d === plan.returnCheckpointDay ? "Checkpoint" : d === plan.durationDays ? "Final" : null;
        return (
          <li
            key={d}
            className={`min-w-[76px] flex-1 rounded-2xl border px-3 py-2.5 ${d === plan.returnCheckpointDay ? "border-serum-deep bg-serum/50" : d > deadline ? "border-hairline bg-mist/60" : "border-hairline bg-vial"}`}
          >
            <p className="display text-2xl numeral">{d}</p>
            <p className="text-2xs text-smoke">{formatDay(date)}</p>
            {special && <p className="mt-1 text-2xs font-semibold">{special}</p>}
          </li>
        );
      })}
    </ol>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-semibold">{label}</span>
      {children}
    </label>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${on ? "bg-ink text-vial" : "border border-hairline bg-vial hover:border-ink/40"}`}
    >
      {children}
    </button>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { store } from "@/lib/data";
import { buildTrialView, confounders } from "@/lib/view";
import { addDays, daysBetween, formatDay } from "@/lib/dates";
import { METRICS } from "@/lib/metrics";
import { ACTIVES } from "@/lib/agent/actives";
import { Litmus } from "@/components/ui/litmus";
import { Vial } from "@/components/ui/vial";
import { IconBack } from "@/components/ui/icons";
import { ReturnPill } from "@/components/ui/pills";
import { VERDICT_TEXT, VERDICT_WORD } from "@/components/ui/verdict-style";
import { EvidenceMeter } from "@/components/evidence-meter";
import { CopyBlock, Decision } from "./decision";

export const metadata: Metadata = { title: "Verdict" };

export default async function VerdictPage({ params }: PageProps<"/app/trials/[id]/verdict">) {
  const { id } = await params;
  const viewer = await getViewer();
  const trial = await store.getTrial(viewer.id, id);
  if (!trial) notFound();
  const [product, scans, checkIns, trials] = await Promise.all([
    store.getProduct(viewer.id, trial.productId),
    store.listScans(viewer.id),
    store.listCheckIns(viewer.id),
    store.listTrials(viewer.id),
  ]);
  if (!product) notFound();

  const { analysis, returnDaysLeft } = buildTrialView(trial, product, scans);
  const verdict = analysis.verdict;
  const evidence = analysis.metrics.filter((m) => m.role === "target" || m.state === "worse");
  const recentConfounders = confounders(trial, checkIns).filter((c) => c.day >= analysis.day - 14);
  const overlapping = trials.filter(
    (t) => t.id !== trial.id && t.startedAt <= addDays(trial.startedAt, analysis.day) && addDays(t.startedAt, t.durationDays) >= trial.startedAt && t.status !== "closed",
  );

  // Ingredients worth trying instead: other actives aimed at the same targets.
  const heldKeys = new Set(product.actives.map((a) => a.key));
  const alternatives = ACTIVES.filter((a) => !heldKeys.has(a.key) && a.family !== "sunscreen")
    .map((a) => ({ a, hits: a.targets.filter((t) => trial.targetMetrics.includes(t.metric)) }))
    .filter((x) => x.hits.length)
    .sort((x, y) => y.hits.length - x.hits.length || Math.min(...x.hits.map((h) => h.onsetDay)) - Math.min(...y.hits.map((h) => h.onsetDay)))
    .slice(0, 3);

  const runOut = addDays(product.purchasedAt, product.category === "moisturizer" ? 56 : 70);
  const returnNote = `Hi ${product.retailer} team,

I'd like to return ${product.brand} ${product.name}, bought on ${formatDay(product.purchasedAt, { month: "long", day: "numeric", year: "numeric" })}.

I used it as directed for ${analysis.day} days and tracked my skin with regular scans. ${analysis.metrics
    .filter((m) => m.role === "target" && m.delta !== undefined)
    .map((m) => `${METRICS[m.metric].label} changed by ${m.delta! >= 0 ? "+" : ""}${m.delta!.toFixed(1)} points`)
    .join(", ")}, which is within normal day-to-day variation, so it hasn't worked for me.

This is within your ${product.returnWindowDays}-day return window. Please let me know the next steps.

Thanks,
${viewer.name}`;

  return (
    <div className="space-y-12">
      <Link href={`/app/trials/${trial.id}`} className="inline-flex items-center gap-1 text-sm text-smoke hover:text-ink">
        <IconBack width={16} height={16} /> Back to the trial
      </Link>

      <section className="rounded-vial border border-hairline bg-vial p-6 sm:p-10">
        <div className="flex items-center gap-3 text-smoke">
          <Vial tint={product.tint} category={product.category} label={product.brand} size={28} />
          <span>
            {product.brand} {product.name}, day {analysis.day} of {trial.durationDays}
          </span>
        </div>
        <h1 className={`display mt-6 text-[96px] sm:text-[168px] ${VERDICT_TEXT[verdict]}`}>{VERDICT_WORD[verdict]}.</h1>
        <p className="mt-4 text-2xl font-semibold leading-snug tracking-tight measure sm:text-3xl">{analysis.headline}.</p>
        <p className="mt-2 text-smoke measure">
          {verdict === "inconclusive"
            ? "The evidence hasn't settled. Here's where it stands and what you can do."
            : `${Math.round(analysis.confidence * 100)}% confident, based on ${analysis.scansUsed} scans measured against your own noise floor${analysis.scansExcluded ? `. ${analysis.scansExcluded} dim-light scan${analysis.scansExcluded > 1 ? "s were" : " was"} set aside` : ""}.`}
        </p>
        <Litmus cells={analysis.strip} size="md" animate className="mt-8 max-w-xl" />
        <div className="mt-8">
          <Decision trialId={trial.id} verdict={verdict} settled={trial.status === "closed" ? trial.verdict : undefined} />
        </div>
      </section>

      <div className="grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="ev-h">
          <h2 id="ev-h" className="text-2xl font-semibold tracking-tight">
            The evidence
          </h2>
          <p className="mt-1 text-smoke measure">Each grey band is how much that reading wobbles on its own. Dots outside it are real change.</p>
          <div className="mt-6 space-y-7">
            {evidence.map((m) => (
              <EvidenceMeter key={m.metric} m={m} />
            ))}
          </div>
        </section>

        <section aria-labelledby="caveat-h">
          <h2 id="caveat-h" className="text-2xl font-semibold tracking-tight">
            What could skew this
          </h2>
          <ul className="mt-4 space-y-3 text-[15px] measure">
            {overlapping.map((t) => (
              <li key={t.id} className="rounded-2xl bg-unsure-wash/60 px-4 py-3">
                Another trial overlapped this one. Changes the two products share (like redness) can&apos;t be fully split between them.
              </li>
            ))}
            {recentConfounders.length > 0 ? (
              <li className="rounded-2xl bg-mist px-4 py-3">
                In the last two weeks you logged {summarize(recentConfounders)}. These can shift
                redness and breakouts for a few days, which is why the verdict uses your last two scans rather than one.
              </li>
            ) : (
              <li className="rounded-2xl bg-mist px-4 py-3">Nothing unusual in your log during the final two weeks.</li>
            )}
            <li className="rounded-2xl bg-mist px-4 py-3">
              Scores use YouCam&apos;s raw score, not the friendlier display score, so small changes aren&apos;t inflated.
            </li>
          </ul>
        </section>
      </div>

      {verdict === "keep" && (
        <section aria-labelledby="next-h" className="grid gap-6 border-t border-hairline pt-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 id="next-h" className="text-2xl font-semibold tracking-tight">
              Keeping it
            </h2>
            <p className="mt-2 text-[15px] measure">
              At nightly use this bottle runs out around <strong>{formatDay(runOut)}</strong>. I&apos;ll remind you a week before so there&apos;s no gap in
              your routine. A gap resets the gains.
            </p>
          </div>
          <div className="rounded-vial bg-keep-wash/60 p-5 text-[15px] measure">
            {analysis.metrics.some((m) => m.role === "target" && m.state !== "improving")
              ? `I'll keep tracking ${analysis.metrics
                  .filter((m) => m.role === "target" && m.state !== "improving")
                  .map((m) => METRICS[m.metric].label.toLowerCase())
                  .join(" and ")} in your regular scans. Those usually take longer.`
              : "Everything it promised has moved. I'll keep an eye on it in your regular scans."}
          </div>
        </section>
      )}

      {verdict === "ditch" && (
        <section aria-labelledby="return-h" className="grid gap-10 border-t border-hairline pt-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="return-h" className="text-2xl font-semibold tracking-tight">
                Sending it back
              </h2>
              {trial.status !== "closed" && <ReturnPill daysLeft={returnDaysLeft} retailer={product.retailer} />}
            </div>
            {trial.status === "closed" ? (
              <p className="mt-2 text-[15px] measure">
                You sent this back on {formatDay(trial.verdictAt ?? trial.startedAt)}, with {daysBetween(trial.verdictAt ?? trial.startedAt, trial.returnDeadline)} days left on{" "}
                {product.retailer}&apos;s window. That&apos;s ${product.price} not spent on something that wasn&apos;t working.
              </p>
            ) : (
              <>
                <p className="mt-2 text-smoke measure">A message you can paste into {product.retailer}&apos;s return form or chat. Check their policy for opened skincare.</p>
                <div className="mt-4">
                  <CopyBlock text={returnNote} />
                </div>
              </>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold">Ingredients to look for next</h3>
            <p className="mt-1 text-sm text-smoke">Aimed at the same goals, with a different mechanism.</p>
            <ul className="mt-4 divide-y divide-hairline">
              {alternatives.map(({ a, hits }) => (
                <li key={a.key} className="py-3">
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-sm text-smoke">
                    {hits.map((h) => `${METRICS[h.metric].label.toLowerCase()} from week ${Math.ceil(h.onsetDay / 7)}`).join(", ")}
                  </p>
                  <p className="mt-1 text-sm text-ink/75">{a.note}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {verdict === "inconclusive" && (
        <section aria-labelledby="wait-h" className="border-t border-hairline pt-10">
          <h2 id="wait-h" className="text-2xl font-semibold tracking-tight">
            Your options
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-vial border border-hairline bg-vial p-5">
              <p className="font-semibold">Keep testing</p>
              <p className="mt-1 text-[15px] text-ink/80">
                {returnDaysLeft > 3
                  ? `You have ${returnDaysLeft} days left to return it. The next scans will firm this up.`
                  : "The return window is nearly closed, so keeping it means committing to the full trial."}
              </p>
            </div>
            <div className="rounded-vial border border-hairline bg-vial p-5">
              <p className="font-semibold">Decide now</p>
              <p className="mt-1 text-[15px] text-ink/80">If it&apos;s irritating or you simply don&apos;t like using it, that&apos;s a fine reason to return it. The scans can&apos;t measure that.</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function summarize(items: { day: number; label: string }[]) {
  const byReason = new Map<string, number[]>();
  for (const it of items) for (const r of it.label.split(", ")) byReason.set(r, [...(byReason.get(r) ?? []), it.day]);
  return [...byReason.entries()]
    .map(([r, days]) => {
      const d = [...new Set(days)].sort((a, b) => a - b);
      const contiguous = d.length > 2 && d[d.length - 1] - d[0] === d.length - 1;
      return `${r} (${contiguous ? `days ${d[0]}–${d[d.length - 1]}` : `day${d.length > 1 ? "s" : ""} ${d.join(", ")}`})`;
    })
    .join(", ");
}

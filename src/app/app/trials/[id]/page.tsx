import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { store } from "@/lib/data";
import { buildTrialView, confounders } from "@/lib/view";
import { daysBetween, formatDateTime, formatDay } from "@/lib/dates";
import { dayOf, MIN_LIGHT } from "@/lib/verdict";
import { getActive } from "@/lib/agent/actives";
import { Vial } from "@/components/ui/vial";
import { Litmus, LitmusKey } from "@/components/ui/litmus";
import { ButtonLink } from "@/components/ui/button";
import { DuePill, ReturnPill } from "@/components/ui/pills";
import { IconBack, IconCamera } from "@/components/ui/icons";
import { VERDICT_TEXT, VERDICT_WORD } from "@/components/ui/verdict-style";
import { WindowTimeline } from "@/components/window-timeline";
import { MetricPanel } from "@/components/metric-panel";
import { AgentFeed } from "@/components/agent-feed";

export async function generateMetadata({ params }: PageProps<"/app/trials/[id]">): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getViewer();
  const trial = await store.getTrial(viewer.id, id);
  const product = trial ? await store.getProduct(viewer.id, trial.productId) : null;
  return { title: product?.name ?? "Trial" };
}

export default async function TrialPage({ params }: PageProps<"/app/trials/[id]">) {
  const { id } = await params;
  const viewer = await getViewer();
  const trial = await store.getTrial(viewer.id, id);
  if (!trial) notFound();
  const [product, scans, events, checkIns] = await Promise.all([
    store.getProduct(viewer.id, trial.productId),
    store.listScans(viewer.id),
    store.listAgentEvents(viewer.id, trial.id),
    store.listCheckIns(viewer.id),
  ]);
  if (!product) notFound();

  const view = buildTrialView(trial, product, scans);
  const { analysis, nextScan, returnDaysLeft, checkpointDay } = view;
  const markers = confounders(trial, checkIns);
  const closed = trial.status === "closed";
  const verdict = closed && trial.verdict ? trial.verdict : analysis.verdict;
  const deadlineDay = daysBetween(trial.startedAt, trial.returnDeadline);
  const targets = analysis.metrics.filter((m) => m.role === "target");
  const guards = analysis.metrics.filter((m) => m.role === "guard");

  return (
    <div className="space-y-10">
      <Link href="/app/trials" className="inline-flex items-center gap-1 text-sm text-smoke hover:text-ink">
        <IconBack width={16} height={16} /> All trials
      </Link>

      {/* Header */}
      <header className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="flex items-start gap-5">
          <Vial tint={product.tint} category={product.category} label={product.brand} size={72} className="shrink-0" />
          <div>
            <p className="text-smoke">{product.brand}</p>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{product.name}</h1>
            <p className="mt-1.5 text-smoke numeral">
              {closed ? `Settled ${formatDay(trial.verdictAt ?? trial.startedAt)}` : `Day ${analysis.day} of ${trial.durationDays}`}, started {formatDay(trial.startedAt)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.actives.map((a) => (
                <span key={a.key} className="rounded-full border border-hairline px-2.5 py-1 text-2xs font-medium" title={getActive(a.key)?.note}>
                  {a.label}
                  {a.pct ? ` ${a.pct}%` : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="md:text-right">
          <p className={`display text-7xl sm:text-8xl ${VERDICT_TEXT[verdict]}`}>{VERDICT_WORD[verdict]}</p>
          <p className="mt-1 text-sm text-smoke numeral">
            {closed ? "Your decision" : verdict === "inconclusive" ? (analysis.readiness === "early" ? "Still early in the trial" : "Evidence still forming") : `${Math.round(analysis.confidence * 100)}% confident so far`}
          </p>
        </div>
      </header>

      {/* Strip */}
      <section aria-labelledby="strip-h" className="rounded-vial border border-hairline bg-vial p-5 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="strip-h" className="text-lg font-semibold">
            {analysis.headline}.
          </h2>
          <LitmusKey />
        </div>
        <Litmus cells={analysis.strip} size="lg" showDays className="mt-5" animate />
        <ul className="mt-5 space-y-1.5 text-[15px] measure">
          {analysis.reasons.map((r) => (
            <li key={r} className="flex gap-2.5">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink/40" />
              {r}
            </li>
          ))}
        </ul>
        {!closed && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {nextScan && nextScan.dueIn <= 0 ? (
              <ButtonLink href={`/app/scan?trial=${trial.id}${nextScan.kind === "baseline" ? "&baseline=1" : ""}`}>
                <IconCamera width={18} height={18} />
                {nextScan.kind === "baseline" ? "Take baseline scans" : `Take day ${nextScan.day} scan`}
              </ButtonLink>
            ) : null}
            {analysis.verdict !== "inconclusive" || analysis.readiness === "ready" || returnDaysLeft <= 3 ? (
              <ButtonLink href={`/app/trials/${trial.id}/verdict`} variant={nextScan && nextScan.dueIn <= 0 ? "secondary" : "primary"}>
                Open the verdict
              </ButtonLink>
            ) : null}
            {nextScan && nextScan.dueIn > 0 && (
              <DuePill dueIn={nextScan.dueIn} label={nextScan.kind === "checkpoint" ? "Checkpoint scan" : nextScan.kind === "final" ? "Final scan" : `Day ${nextScan.day} scan`} />
            )}
            <ReturnPill daysLeft={returnDaysLeft} retailer={product.retailer} />
          </div>
        )}
      </section>

      {/* Return window */}
      {!closed && (
        <section aria-labelledby="window-h">
          <h2 id="window-h" className="text-2xl font-semibold tracking-tight">
            Trial against the return window
          </h2>
          <p className="mt-1 text-smoke measure">
            {deadlineDay >= trial.durationDays
              ? `The full trial finishes ${deadlineDay - trial.durationDays} days before ${product.retailer} stops taking returns.`
              : `A full read takes ${trial.durationDays} days, but ${product.retailer} stops taking returns on day ${deadlineDay}. The checkpoint scan gives you a verdict in time.`}
          </p>
          <WindowTimeline
            startedAt={trial.startedAt}
            durationDays={trial.durationDays}
            deadlineDay={deadlineDay}
            today={analysis.day}
            checkpointDay={checkpointDay}
            purgeWindow={trial.purgeWindow}
          />
        </section>
      )}

      <div className="grid gap-10 xl:grid-cols-[1fr_340px]">
        <div className="space-y-10">
          <section aria-labelledby="targets-h">
            <h2 id="targets-h" className="text-2xl font-semibold tracking-tight">
              What it should change
            </h2>
            <p className="mt-1 text-smoke measure">
              Grey band: how much your readings wobble on their own, measured from your two baseline scans. A change only counts once the line clears it.
            </p>
            <div className="mt-5 space-y-4">
              {targets.map((m) => (
                <MetricPanel key={m.metric} m={m} trial={trial} today={analysis.day} hypothesis={trial.hypotheses.find((h) => h.metric === m.metric)} markers={markers} />
              ))}
            </div>
          </section>

          {guards.length > 0 && (
            <section aria-labelledby="guards-h">
              <h2 id="guards-h" className="text-2xl font-semibold tracking-tight">
                Watching for irritation
              </h2>
              <p className="mt-1 text-smoke measure">Not what it promises to fix, but where trouble shows first. A sharp drop here can end a trial early.</p>
              <div className="mt-5 space-y-4">
                {guards.map((m) => (
                  <MetricPanel key={m.metric} m={m} trial={trial} today={analysis.day} markers={markers} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-10">
          <section aria-labelledby="agent-h">
            <h2 id="agent-h" className="text-lg font-semibold">
              Agent notes
            </h2>
            <div className="mt-4">
              <AgentFeed events={events} />
            </div>
          </section>

          <section aria-labelledby="scans-h">
            <h2 id="scans-h" className="text-lg font-semibold">
              Scans in this trial
            </h2>
            <ul className="mt-3 divide-y divide-hairline">
              {view.scans.map((s) => (
                <li key={s.id}>
                  <Link href={`/app/scans/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-serum-deep">
                    <span>
                      <span className="font-medium numeral">Day {dayOf(trial, s)}</span>
                      <span className="text-sm text-smoke"> {s.isBaseline && dayOf(trial, s) === 0 ? "baseline" : formatDateTime(s.capturedAt)}</span>
                    </span>
                    <span className={`text-2xs font-semibold ${s.lightScore < MIN_LIGHT ? "text-ditch" : "text-smoke"}`}>
                      {s.lightScore < MIN_LIGHT ? "set aside, dim light" : `light ${s.lightScore}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {markers.length > 0 && (
            <section aria-labelledby="conf-h">
              <h2 id="conf-h" className="text-lg font-semibold">
                Things that could muddy it
              </h2>
              <p className="mt-1 text-sm text-smoke">From your daily log. Shown as dots under the charts.</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {markers.map((m) => (
                  <li key={`${m.day}-${m.label}`} className="flex gap-3">
                    <span className="w-14 shrink-0 text-smoke numeral">Day {m.day}</span>
                    <span>{m.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

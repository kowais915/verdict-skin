import Link from "next/link";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { loadAccount, type TrialView } from "@/lib/view";
import { today } from "@/lib/dates";
import { TrialCard, TrialRow } from "@/components/trial-card";
import { AgentFeed } from "@/components/agent-feed";
import { SampleDataButton } from "@/components/sample-data-button";
import { ButtonLink } from "@/components/ui/button";
import { IconCamera, IconCheck, IconClose, IconLog, IconNext, IconPlus } from "@/components/ui/icons";
import { VERDICT_BG, VERDICT_WORD } from "@/components/ui/verdict-style";
import { LitmusKey } from "@/components/ui/litmus";

export const metadata: Metadata = { title: "Today" };

type Due = { key: string; href: string; title: string; detail: string; tone: "verdict" | "scan" | "log"; view?: TrialView };

export default async function TodayPage() {
  const viewer = await getViewer();
  const { trials, events, checkIns } = await loadAccount(viewer.id);
  const running = trials.filter((t) => t.trial.status !== "closed");
  const finished = trials.filter((t) => t.trial.status === "closed");
  const T = today();

  const due: Due[] = [];
  for (const v of running) {
    const { analysis, product, trial, returnDaysLeft, nextScan } = v;
    if (analysis.verdict !== "inconclusive" && (analysis.readiness === "ready" || returnDaysLeft <= 3)) {
      due.push({
        key: `v-${trial.id}`,
        href: `/app/trials/${trial.id}/verdict`,
        title: `${product.name}: verdict is in`,
        detail:
          returnDaysLeft <= 3
            ? `${VERDICT_WORD[analysis.verdict]}, ${Math.round(analysis.confidence * 100)}% confident. ${product.retailer} returns close ${returnDaysLeft <= 0 ? "today" : returnDaysLeft === 1 ? "tomorrow" : `in ${returnDaysLeft} days`}.`
            : `${VERDICT_WORD[analysis.verdict]}, ${Math.round(analysis.confidence * 100)}% confident.`,
        tone: "verdict",
        view: v,
      });
    }
    if (nextScan && nextScan.dueIn <= 0) {
      due.push({
        key: `s-${trial.id}`,
        href: `/app/scan?trial=${trial.id}${nextScan.kind === "baseline" ? "&baseline=1" : ""}`,
        title: nextScan.kind === "baseline" ? `Baseline scans for ${product.name}` : `Day ${nextScan.day} scan for ${product.name}`,
        detail: nextScan.kind === "baseline" ? "Two scans, a minute apart. This sets your noise floor." : "Same mirror, same light as day 0. About a minute.",
        tone: "scan",
      });
    }
  }
  if (!checkIns.some((c) => c.date === T)) {
    due.push({
      key: "log",
      href: "/app/log",
      title: "Log how today went",
      detail: "Sleep, stress, sun and your cycle. A bad week shouldn't be blamed on a good product.",
      tone: "log",
    });
  }

  const productNames = Object.fromEntries(trials.map((t) => [t.trial.id, t.product.name]));
  const verdictReady = due.filter((d) => d.tone === "verdict").length;

  return (
    <div className="space-y-12">
      <section className="animate-rise">
        <h1 className="display text-5xl sm:text-6xl">Hi {viewer.name}.</h1>
        <p className="mt-3 text-lg text-ink/80 measure">
          {running.length === 0
            ? "No trials running. Start one the day a new product arrives, before you open it."
            : `${running.length} ${running.length === 1 ? "trial" : "trials"} running. ${
                verdictReady ? `${verdictReady === 1 ? "One verdict is" : `${verdictReady} verdicts are`} ready before the return window closes.` : "No verdicts yet; keep scanning on schedule."
              }`}
        </p>
      </section>

      {due.length > 0 && (
        <section aria-labelledby="due-h">
          <h2 id="due-h" className="text-sm font-semibold text-smoke">
            Needs you today
          </h2>
          <ul className="mt-3 divide-y divide-hairline rounded-vial border border-hairline bg-vial">
            {due.map((d) => (
              <li key={d.key}>
                <Link href={d.href} className="flex items-center gap-4 px-5 py-4 hover:bg-mist/50 first:rounded-t-vial last:rounded-b-vial">
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-full ${
                      d.tone === "verdict" && d.view ? `${VERDICT_BG[d.view.analysis.verdict]} text-white` : d.tone === "scan" ? "bg-ink text-vial" : "bg-serum text-serum-deep"
                    }`}
                  >
                    {d.tone === "verdict" ? (
                      d.view?.analysis.verdict === "ditch" ? <IconClose /> : <IconCheck />
                    ) : d.tone === "scan" ? (
                      <IconCamera />
                    ) : (
                      <IconLog />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-snug">{d.title}</span>
                    <span className="block text-sm text-smoke">{d.detail}</span>
                  </span>
                  <IconNext className="shrink-0 text-smoke" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="running-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="running-h" className="text-2xl font-semibold tracking-tight">
              On trial
            </h2>
            <LitmusKey className="mt-2" />
          </div>
          <ButtonLink href="/app/trials/new" variant="secondary" size="sm">
            <IconPlus width={16} height={16} />
            New trial
          </ButtonLink>
        </div>
        {running.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {running.map((v) => (
              <TrialCard key={v.trial.id} view={v} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-vial border border-dashed border-hairline p-8">
            <p className="text-lg font-semibold">Got something new arriving?</p>
            <p className="mt-1 text-smoke measure">Paste its ingredient list and the agent will plan a trial that finishes before the return window closes.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ButtonLink href="/app/trials/new">Start a trial</ButtonLink>
              {trials.length === 0 && <SampleDataButton />}
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-12 lg:grid-cols-[1.25fr_1fr]">
        <section aria-labelledby="notes-h">
          <h2 id="notes-h" className="text-2xl font-semibold tracking-tight">
            From your trial agent
          </h2>
          <div className="mt-5">
            <AgentFeed events={events.slice(0, 5)} products={productNames} />
          </div>
        </section>
        {finished.length > 0 && (
          <section aria-labelledby="past-h">
            <h2 id="past-h" className="text-2xl font-semibold tracking-tight">
              Settled
            </h2>
            <div className="mt-3 divide-y divide-hairline">
              {finished.map((v) => (
                <TrialRow key={v.trial.id} view={v} />
              ))}
            </div>
            <p className="mt-4 text-sm text-smoke measure">
              Money saved by returning what didn&apos;t work: <span className="font-semibold text-ink numeral">${finished.filter((v) => v.trial.verdict === "ditch").reduce((s, v) => s + v.product.price, 0)}</span>
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { loadAccount } from "@/lib/view";
import { TrialCard, TrialRow } from "@/components/trial-card";
import { ButtonLink } from "@/components/ui/button";
import { IconPlus } from "@/components/ui/icons";
import { LitmusKey } from "@/components/ui/litmus";

export const metadata: Metadata = { title: "Trials" };

export default async function TrialsPage() {
  const viewer = await getViewer();
  const { trials } = await loadAccount(viewer.id);
  const running = trials.filter((t) => t.trial.status !== "closed");
  const settled = trials.filter((t) => t.trial.status === "closed");
  const kept = settled.filter((t) => t.trial.verdict === "keep");
  const returned = settled.filter((t) => t.trial.verdict === "ditch");
  const saved = returned.reduce((s, t) => s + t.product.price, 0);

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl sm:text-6xl">Trials</h1>
          <p className="mt-3 text-lg text-ink/80 measure">
            Every product gets the same test: two baseline scans, scans on schedule, and a verdict measured against your own noise.
          </p>
        </div>
        <ButtonLink href="/app/trials/new">
          <IconPlus width={18} height={18} /> New trial
        </ButtonLink>
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-vial border border-hairline bg-hairline sm:grid-cols-4">
        {[
          ["Running", running.length],
          ["Kept", kept.length],
          ["Returned", returned.length],
          ["Not wasted", `$${saved}`],
        ].map(([k, v]) => (
          <div key={k} className="bg-vial p-5">
            <dt className="text-sm text-smoke">{k}</dt>
            <dd className="display mt-1 text-4xl numeral">{v}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="run-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="run-h" className="text-2xl font-semibold tracking-tight">
            Running
          </h2>
          <LitmusKey />
        </div>
        {running.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {running.map((v) => (
              <TrialCard key={v.trial.id} view={v} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-smoke">Nothing on trial right now.</p>
        )}
      </section>

      <section aria-labelledby="set-h">
        <h2 id="set-h" className="text-2xl font-semibold tracking-tight">
          Settled
        </h2>
        {settled.length ? (
          <div className="mt-3 divide-y divide-hairline">
            {settled.map((v) => (
              <TrialRow key={v.trial.id} view={v} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-smoke">Finished trials and their verdicts collect here.</p>
        )}
      </section>
    </div>
  );
}

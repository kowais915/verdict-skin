import Link from "next/link";
import type { TrialView } from "@/lib/view";
import { Litmus } from "./ui/litmus";
import { Vial } from "./ui/vial";
import { DuePill, ReturnPill } from "./ui/pills";
import { VERDICT_TEXT, VERDICT_WORD } from "./ui/verdict-style";

/** The primary object in the app: one running trial. */
export function TrialCard({ view }: { view: TrialView }) {
  const { trial, product, analysis, nextScan, returnDaysLeft } = view;
  const decided = analysis.verdict !== "inconclusive";
  return (
    <Link
      href={`/app/trials/${trial.id}`}
      className="group block rounded-vial border border-hairline bg-vial p-5 sm:p-6 transition-colors hover:border-ink/30"
    >
      <div className="flex items-start gap-4">
        <Vial tint={product.tint} category={product.category} label={product.brand} size={52} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-smoke">{product.brand}</p>
          <h3 className="text-xl font-semibold leading-tight tracking-tight">{product.name}</h3>
          <p className="mt-1 text-sm text-smoke numeral">
            Day {analysis.day} of {trial.durationDays}
          </p>
        </div>
        <div className="text-right">
          <p className={`display text-[34px] ${VERDICT_TEXT[analysis.verdict]}`}>{VERDICT_WORD[analysis.verdict]}</p>
          <p className="text-2xs text-smoke numeral">{decided ? `${Math.round(analysis.confidence * 100)}% confident` : analysis.readiness === "early" ? "still early" : "evidence forming"}</p>
        </div>
      </div>

      <Litmus cells={analysis.strip} size="md" className="mt-5" />

      <p className="mt-4 text-[15px] leading-snug">{analysis.headline}.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {nextScan && <DuePill dueIn={nextScan.dueIn} label={nextScan.kind === "baseline" ? "Baseline scans" : nextScan.kind === "checkpoint" ? "Checkpoint scan" : `Day ${nextScan.day} scan`} />}
        {trial.status !== "closed" && <ReturnPill daysLeft={returnDaysLeft} />}
      </div>
    </Link>
  );
}

/** Compact row for finished trials. */
export function TrialRow({ view }: { view: TrialView }) {
  const { trial, product } = view;
  const v = trial.verdict ?? view.analysis.verdict;
  return (
    <Link href={`/app/trials/${trial.id}`} className="flex items-center gap-4 py-3.5 hover:bg-mist/60 -mx-3 px-3 rounded-2xl">
      <Vial tint={product.tint} category={product.category} label={product.brand} size={30} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{product.name}</p>
        <p className="text-sm text-smoke">
          {product.brand}, {trial.durationDays}-day trial
        </p>
      </div>
      <Litmus cells={view.analysis.strip} size="sm" className="hidden w-28 sm:block" />
      <span className={`display w-20 text-right text-2xl ${VERDICT_TEXT[v]}`}>{VERDICT_WORD[v]}</span>
    </Link>
  );
}

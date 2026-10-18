import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { loadAccount } from "@/lib/view";
import { formatDateTime } from "@/lib/dates";
import { MIN_LIGHT } from "@/lib/verdict";
import { IconBack } from "@/components/ui/icons";
import { Litmus } from "@/components/ui/litmus";
import { VERDICT_TEXT, VERDICT_WORD } from "@/components/ui/verdict-style";
import { ScanBody } from "./scan-body";

export const metadata: Metadata = { title: "Scan" };

export default async function ScanResultPage({ params }: PageProps<"/app/scans/[id]">) {
  const { id } = await params;
  const viewer = await getViewer();
  const { scans, trials } = await loadAccount(viewer.id);
  const idx = scans.findIndex((s) => s.id === id);
  if (idx < 0) notFound();
  const scan = scans[idx];
  const previous = scans.slice(0, idx).reverse().find((s) => s.lightScore >= MIN_LIGHT);
  const fed = trials.filter((t) => t.scans.some((s) => s.id === scan.id) && t.trial.status !== "closed");

  return (
    <div className="space-y-10">
      <Link href="/app" className="inline-flex items-center gap-1 text-sm text-smoke hover:text-ink">
        <IconBack width={16} height={16} /> Today
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-smoke">{formatDateTime(scan.capturedAt)}</p>
          <h1 className="display mt-1 text-5xl sm:text-6xl">{scan.isBaseline ? "Baseline scan" : "Scan results"}</h1>
          <p className="mt-2 text-sm text-smoke">
            {scan.source === "youcam" ? `Scored by YouCam Skin AI${scan.imageUrl ? ", using a YouCam sample portrait" : ""}` : "Simulated reading (sample data, or the demo's daily YouCam scan limit was reached)"}
          </p>
        </div>
        <dl className="flex gap-8">
          {scan.skinAge !== undefined && (
            <div>
              <dt className="text-sm text-smoke">Skin age</dt>
              <dd className="display text-4xl numeral">{scan.skinAge}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-smoke">Light</dt>
            <dd className={`display text-4xl numeral ${scan.lightScore < MIN_LIGHT ? "text-ditch" : ""}`}>{scan.lightScore}</dd>
          </div>
          <div>
            <dt className="text-sm text-smoke">Framing</dt>
            <dd className="display text-4xl numeral">{scan.alignScore}</dd>
          </div>
        </dl>
      </header>

      {scan.lightScore < MIN_LIGHT && (
        <p className="rounded-2xl bg-ditch-wash px-4 py-3 text-ditch measure">
          This scan was too dim to compare fairly, so it&apos;s kept but left out of your verdicts. <Link href="/app/scan" className="font-semibold underline underline-offset-4">Retake it</Link> in even daylight.
        </p>
      )}

      <ScanBody scanId={scan.id} readings={scan.readings} previous={previous?.readings} imageUrl={scan.imageUrl} masksFresh={masksFresh(scan.capturedAt)} />

      {fed.length > 0 && (
        <section aria-labelledby="fed-h">
          <h2 id="fed-h" className="text-2xl font-semibold tracking-tight">
            Where this scan counted
          </h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {fed.map((t) => (
              <li key={t.trial.id}>
                <Link href={`/app/trials/${t.trial.id}`} className="block rounded-vial border border-hairline bg-vial p-5 hover:border-ink/30">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-semibold">{t.product.name}</p>
                    <p className={`display text-2xl ${VERDICT_TEXT[t.analysis.verdict]}`}>{VERDICT_WORD[t.analysis.verdict]}</p>
                  </div>
                  <Litmus cells={t.analysis.strip} size="sm" className="mt-3" />
                  <p className="mt-3 text-sm text-smoke">{t.analysis.headline}.</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** YouCam mask URLs are pre-signed for two hours. */
function masksFresh(capturedAt: string) {
  return new Date().getTime() - Date.parse(capturedAt) < 110 * 60_000;
}

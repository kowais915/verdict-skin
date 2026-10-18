"use client";

import { useState, useSyncExternalStore } from "react";
import { photoStore, subscribePhotos } from "@/lib/capture";
import { METRICS } from "@/lib/metrics";
import type { MetricKey, MetricReading } from "@/lib/types";
import { FaceMap } from "@/components/ui/face-map";

export function ScanBody({ scanId, readings, previous, imageUrl, masksFresh = false }: { scanId: string; readings: MetricReading[]; previous?: MetricReading[]; imageUrl?: string; masksFresh?: boolean }) {
  const localPhoto = useSyncExternalStore(subscribePhotos, () => photoStore.get(`scan:${scanId}`), () => null);
  const photo = localPhoto ?? imageUrl ?? null;
  const [viewPref, setView] = useState<"photo" | "map" | null>(null);
  const view = viewPref ?? (photo ? "photo" : "map");
  const [focus, setFocus] = useState<MetricKey | undefined>();

  const scores = Object.fromEntries(readings.map((r) => [r.metric, r.uiScore])) as Partial<Record<MetricKey, number>>;
  const sorted = [...readings].sort((a, b) => a.uiScore - b.uiScore);
  // YouCam's mask images are pre-signed and expire after two hours.
  const maskFor = focus && masksFresh ? readings.find((r) => r.metric === focus)?.maskUrl : undefined;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="md:sticky md:top-8 md:self-start">
        <div className="relative overflow-hidden rounded-vial border border-hairline bg-vial">
          {view === "photo" && photo ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="Your scan photo" className="aspect-[3/4] w-full object-cover" />
              {maskFor && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={maskFor} alt={`Where YouCam found ${focus}`} className="absolute inset-0 h-full w-full object-cover" />
              )}
            </div>
          ) : (
            <FaceMap scores={scores} focus={focus} className="mx-auto aspect-[3/4] w-full p-6" />
          )}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          {photo ? (
            <div className="inline-flex rounded-full bg-mist p-1 text-sm" role="tablist">
              {(["photo", "map"] as const).map((v) => (
                <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`rounded-full px-3.5 py-1.5 font-medium ${view === v ? "bg-vial shadow-[inset_0_0_0_1px_var(--color-hairline)]" : "text-smoke"}`}>
                  {v === "photo" ? "Photo" : "Skin map"}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-smoke">Your photo stays on the device it was taken on. This map shows where scores were lowest.</p>
          )}
          {focus && (
            <button onClick={() => setFocus(undefined)} className="text-sm font-semibold text-serum-deep">
              Show all
            </button>
          )}
        </div>
      </div>

      <div>
        <ul className="divide-y divide-hairline">
          {sorted.map((r) => {
            const prev = previous?.find((p) => p.metric === r.metric);
            const delta = prev ? r.rawScore - prev.rawScore : undefined;
            const on = focus === r.metric;
            return (
              <li key={r.metric}>
                <button
                  type="button"
                  onClick={() => setFocus(on ? undefined : r.metric)}
                  aria-pressed={on}
                  className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 rounded-2xl px-3 py-3 text-left -mx-3 ${on ? "bg-serum/50" : "hover:bg-mist/60"}`}
                >
                  <span>
                    <span className="font-semibold">{METRICS[r.metric].label}</span>
                    {delta !== undefined && Math.abs(delta) >= METRICS[r.metric].minNoise && (
                      <span className={`ml-2 text-2xs font-semibold numeral ${delta > 0 ? "text-keep" : "text-ditch"}`}>
                        {delta > 0 ? "+" : "−"}
                        {Math.abs(delta).toFixed(1)} since last scan
                      </span>
                    )}
                  </span>
                  <span className="display text-3xl numeral">{r.uiScore}</span>
                  <span className="col-span-2 h-1.5 rounded-full bg-mist">
                    <span className="block h-full rounded-full bg-ink" style={{ width: `${r.uiScore}%` }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm text-smoke measure">
          Scores are YouCam&apos;s display scores (higher is healthier). Trials are judged on the unadjusted raw scores, so they don&apos;t flatter small changes.
        </p>
      </div>
    </div>
  );
}

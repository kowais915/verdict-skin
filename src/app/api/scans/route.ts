import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { store } from "@/lib/data";
import { analyzeSkin, explainYoucamError, youcamEnabled } from "@/lib/youcam";
import { METRIC_KEYS, METRICS } from "@/lib/metrics";
import { analyzeTrial, MIN_LIGHT } from "@/lib/verdict";
import { daysBetween, today } from "@/lib/dates";
import type { AgentEvent, MetricReading, Scan } from "@/lib/types";
import { SAMPLE_PHOTOS } from "@/lib/samples";

export const maxDuration = 60;

/**
 * POST /api/scans
 * multipart/form-data:
 *   image      jpeg/png, face filling 60–80% of the width
 *   light      0–100 light score measured on device
 *   align      0–100 match against the baseline framing
 *   hd         "1" when the short side is ≥ 1080px
 *   baseline   "1" for a day-0 baseline capture
 *
 * We store scores, not faces: the photo goes to YouCam for scoring and is not
 * persisted on our side. The device keeps its own copy for before/after views.
 */
export async function POST(req: Request) {
  const userId = await getUserId();
  const form = await req.formData();
  const file = form.get("image");
  const sample = form.has("sample") ? SAMPLE_PHOTOS[Number(form.get("sample"))] : undefined;
  if (!sample && !(file instanceof File)) return NextResponse.json({ error: "Add a photo to scan." }, { status: 400 });
  if (file instanceof File && file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "That photo is over 10 MB. Use a smaller one." }, { status: 400 });

  const light = clampInt(form.get("light"), 80);
  const align = clampInt(form.get("align"), 85);
  const hd = form.get("hd") === "1";
  const isBaseline = form.get("baseline") === "1";

  let readings: MetricReading[];
  let skinAge: number | undefined;
  let taskId: string | undefined;
  let source: Scan["source"] = "demo";

  if (youcamEnabled()) {
    try {
      const result =
        sample || !(file instanceof File)
          ? await analyzeSkin({ srcUrl: sample!.url, metrics: METRIC_KEYS, hd: true })
          : await analyzeSkin({
              image: await file.arrayBuffer(),
              contentType: file.type === "image/png" ? "image/png" : "image/jpeg",
              metrics: METRIC_KEYS,
              hd,
            });
      readings = result.readings;
      skinAge = result.skinAge;
      taskId = result.taskId;
      source = "youcam";
    } catch (e) {
      console.error("[youcam]", e);
      return NextResponse.json({ error: explainYoucamError(e) }, { status: 502 });
    }
  } else {
    // Demo mode: no API key, so simulate a plausible reading from the last scan.
    const previous = (await store.listScans(userId)).at(-1);
    readings = METRIC_KEYS.map((m) => {
      const last = previous?.readings.find((r) => r.metric === m)?.rawScore ?? 60;
      const raw = Math.min(99, Math.max(1, last + gauss() * (light < MIN_LIGHT ? 3 : 1.2)));
      return { metric: m, rawScore: Math.round(raw * 10) / 10, uiScore: Math.round(Math.min(99, raw * 0.7 + 30)) };
    });
    skinAge = previous?.skinAge;
    await new Promise((r) => setTimeout(r, 1200));
  }

  const scan: Scan = {
    id: `s_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    userId,
    capturedAt: new Date().toISOString(),
    imageUrl: sample?.url,
    lightScore: light,
    alignScore: align,
    skinAge,
    readings,
    source,
    youcamTaskId: taskId,
    isBaseline,
  };
  await store.createScan(scan);

  // Let the agent react: one note per running trial this scan fed into.
  const [trials, scans, products] = await Promise.all([store.listTrials(userId), store.listScans(userId), store.listProducts(userId)]);
  const events: AgentEvent[] = [];
  for (const t of trials.filter((x) => x.status !== "closed")) {
    const day = daysBetween(t.startedAt, today());
    if (day < 0 || day > t.durationDays + 3) continue;
    const name = products.find((p) => p.id === t.productId)?.name ?? "your product";
    const a = analyzeTrial(t, scans, today());
    const baselinePair = isBaseline ? scans.filter((x) => x.isBaseline && daysBetween(t.startedAt, x.capturedAt) === 0) : [];
    if (isBaseline && day !== 0) continue;
    if (isBaseline && baselinePair.length >= 2) {
      const [b1, b2] = baselinePair.slice(-2);
      const diffs = t.targetMetrics.map((m) => Math.abs((b1.readings.find((r) => r.metric === m)?.rawScore ?? 0) - (b2.readings.find((r) => r.metric === m)?.rawScore ?? 0)));
      events.push({
        id: `e_${crypto.randomUUID().slice(0, 12)}`,
        trialId: t.id,
        at: scan.capturedAt,
        kind: "insight",
        title: "Noise floor set",
        body: `Your two baselines differ by ${(diffs.reduce((x, y) => x + y, 0) / Math.max(1, diffs.length)).toFixed(1)} points on average across ${t.targetMetrics.map((m) => METRICS[m].label.toLowerCase()).join(", ")}. Later changes have to clear at least twice that to count.`,
      });
      continue;
    }
    const moved = a.metrics.filter((m) => m.role === "target" && (m.state === "improving" || m.state === "worse"));
    events.push({
      id: `e_${crypto.randomUUID().slice(0, 12)}`,
      trialId: t.id,
      at: scan.capturedAt,
      kind: light < MIN_LIGHT ? "warn" : a.verdict !== "inconclusive" ? "verdict" : "insight",
      title:
        light < MIN_LIGHT
          ? `Day ${day} scan set aside`
          : isBaseline
            ? "Baseline captured"
            : a.verdict !== "inconclusive"
              ? `Leaning ${a.verdict} on day ${day}`
              : `Day ${day} scan logged`,
      body:
        light < MIN_LIGHT
          ? "The light was too dim or uneven to compare. I kept it, but it won't count toward the verdict. Retake it near a window if you can."
          : isBaseline
            ? `Baseline for ${name} is in. Two baseline scans set the noise floor.`
            : moved.length
              ? moved.map((m) => `${METRICS[m.metric].label} ${m.state === "improving" ? "improved" : "dropped"} ${Math.abs(m.delta ?? 0).toFixed(1)} points`).join("; ") + "."
              : `${a.headline}. Nothing has cleared the noise band yet.`,
    });
  }
  await store.addAgentEvents(events);

  return NextResponse.json({ scanId: scan.id, source });
}

function clampInt(v: FormDataEntryValue | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(Math.min(100, Math.max(0, n))) : fallback;
}

function gauss() {
  const u = Math.max(Math.random(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

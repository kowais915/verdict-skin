"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { alignment, photoStore, readLight, signature, subscribePhotos, thumbnail, toJpeg, type LightReading } from "@/lib/capture";
import { Button } from "@/components/ui/button";
import { SAMPLE_PHOTOS } from "@/lib/samples";
import { IconAlert, IconCamera, IconCheck, IconClose, IconUpload } from "@/components/ui/icons";

type Stage = "intro" | "camera" | "review" | "analyzing" | "between" | "error";

interface Shot {
  blob: Blob;
  preview: string;
  light: LightReading;
  align: number;
  hd: boolean;
  sig: number[];
}

const STEPS = ["Checking the photo", "Sending it to YouCam Skin AI", "Scoring 12 skin concerns", "Comparing with your baseline"];

export function Scanner({
  trialId,
  trialName,
  baseline,
  live,
}: {
  trialId?: string;
  trialName?: string;
  baseline: boolean;
  live: boolean;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("intro");
  const [meter, setMeter] = useState<LightReading | null>(null);
  const [align, setAlign] = useState<number | null>(null);
  const ghost = useSyncExternalStore(subscribePhotos, () => photoStore.get("ghost"), () => null);
  const [shot, setShot] = useState<Shot | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string>();
  const [baselineCount, setBaselineCount] = useState(0);
  const ghostSig = useRef<number[] | null>(null);

  useEffect(() => {
    const s = photoStore.get("ghost-sig");
    ghostSig.current = s ? JSON.parse(s) : null;
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  async function openCamera() {
    setError(undefined);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      setStage("camera");
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setError("Camera access was blocked. Allow it in your browser settings, or upload a photo instead.");
    }
  }

  // Live light + framing meter while the camera is open.
  useEffect(() => {
    if (stage !== "camera") return;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return;
      setMeter(readLight(v, v.videoWidth, v.videoHeight));
      setAlign(ghostSig.current ? alignment(signature(v, v.videoWidth, v.videoHeight), ghostSig.current) : null);
    }, 400);
    return () => clearInterval(id);
  }, [stage]);

  async function captureFrom(source: CanvasImageSource, w: number, h: number) {
    const light = readLight(source, w, h);
    const sig = signature(source, w, h);
    setShot({
      blob: await toJpeg(source, w, h),
      preview: thumbnail(source, w, h, 720),
      light,
      align: alignment(sig, ghostSig.current),
      hd: Math.min(w, h) >= 1080,
      sig,
    });
    setStage("review");
  }

  function capture() {
    const v = videoRef.current;
    if (!v) return;
    captureFrom(v, v.videoWidth, v.videoHeight);
    stop();
  }

  function onFile(file: File) {
    const img = new Image();
    img.onload = () => captureFrom(img, img.naturalWidth, img.naturalHeight);
    img.onerror = () => setError("That file isn't an image we can read. Use a JPG or PNG.");
    img.src = URL.createObjectURL(file);
  }

  async function submit(sampleIndex?: number) {
    if (!shot && sampleIndex === undefined) return;
    setStage("analyzing");
    setStep(0);
    const ticker = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), live ? 2200 : 450);
    try {
      const fd = new FormData();
      if (sampleIndex !== undefined) {
        fd.set("sample", String(sampleIndex));
        fd.set("light", "90");
        fd.set("align", "90");
        fd.set("hd", "1");
      } else if (shot) {
        fd.set("image", new File([shot.blob], "scan.jpg", { type: "image/jpeg" }));
        fd.set("light", String(shot.light.score));
        fd.set("align", String(shot.align));
        fd.set("hd", shot.hd ? "1" : "0");
      }
      if (baseline) fd.set("baseline", "1");
      const res = await fetch("/api/scans", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "The scan didn't finish. Try again.");

      if (shot) {
        const img = await blobImage(shot.preview);
        photoStore.set(`scan:${body.scanId}`, thumbnail(img, img.naturalWidth, img.naturalHeight, 480));
        if (baseline && baselineCount === 0) {
          photoStore.set("ghost", shot.preview);
          photoStore.set("ghost-sig", JSON.stringify(shot.sig));
        }
      }
      clearInterval(ticker);
      setStep(STEPS.length);

      if (baseline && baselineCount === 0) {
        setBaselineCount(1);
        setShot(null);
        setStage("between");
        return;
      }
      router.push(baseline && trialId ? `/app/trials/${trialId}` : `/app/scans/${body.scanId}`);
      router.refresh();
    } catch (e) {
      clearInterval(ticker);
      setError(e instanceof Error ? e.message : "The scan didn't finish. Try again.");
      setStage("error");
    }
  }

  const title = baseline ? (baselineCount === 0 ? "Baseline scan 1 of 2" : "Baseline scan 2 of 2") : "Today's scan";

  return (
    <div className="mx-auto max-w-2xl">
      {stage === "intro" && (
        <section>
          <p className="text-smoke">{trialName ? `${trialName}` : "Counts toward every running trial"}</p>
          <h1 className="display mt-1 text-5xl sm:text-6xl">{title}</h1>
          <p className="mt-3 text-lg text-ink/80 measure">
            {baseline
              ? "Two scans, a minute apart. How much they disagree tells us how much your readings wobble on their own, so later changes can be judged fairly."
              : "Same spot, same light, same time of day as your baseline. Consistency matters more than a perfect photo."}
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ["Face a window", "Soft daylight from the front. No overhead spotlights."],
              ["Bare skin", "No makeup or SPF tint. Wait 10 minutes after cleansing."],
              ["Fill the oval", "Your face should cover 60–80% of the frame width."],
              ["Hair back", "Forehead and jawline visible, glasses off."],
            ].map(([t, d]) => (
              <li key={t} className="rounded-2xl border border-hairline bg-vial p-4">
                <p className="font-semibold">{t}</p>
                <p className="text-sm text-smoke">{d}</p>
              </li>
            ))}
          </ul>
          {error && <ErrorNote text={error} />}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={openCamera}>
              <IconCamera /> Open camera
            </Button>
            <Button size="lg" variant="secondary" onClick={() => fileRef.current?.click()}>
              <IconUpload /> Upload a photo
            </Button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" capture="user" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>
          <SamplePicker onPick={(i) => submit(i)} />
          <p className="mt-6 text-sm text-smoke measure">
            {live ? "Scored by YouCam Skin AI (HD when your camera allows it). " : "Demo mode: no YouCam key is set, so readings are simulated. "}
            Your photo is used for scoring and kept on this device, not on our servers.
          </p>
        </section>
      )}

      {stage === "camera" && (
        <section className="mx-auto max-w-md">
          <div className="relative overflow-hidden rounded-vial bg-ink">
            <video ref={videoRef} playsInline muted className="aspect-[3/4] w-full -scale-x-100 object-cover" />
            {ghost && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ghost} alt="" className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover opacity-25 mix-blend-screen" />
            )}
            <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              <defs>
                <mask id="oval">
                  <rect width="300" height="400" fill="white" />
                  <ellipse cx="150" cy="190" rx="105" ry="140" fill="black" />
                </mask>
              </defs>
              <rect width="300" height="400" fill="#231d35" opacity=".45" mask="url(#oval)" />
              <ellipse cx="150" cy="190" rx="105" ry="140" fill="none" stroke={meter && meter.score >= 70 ? "#12846b" : "#fafbf8"} strokeWidth="2" strokeDasharray="6 6" />
            </svg>
            <button type="button" onClick={() => { stop(); setStage("intro"); }} className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-ink/60 text-vial" aria-label="Close camera">
              <IconClose />
            </button>
            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className="flex gap-2">
                <Meter label="Light" value={meter?.score} />
                <Meter label={ghost ? "Matches baseline" : "Framing"} value={align ?? (meter ? 85 : undefined)} />
              </div>
              <p className="mt-2 min-h-5 text-sm text-vial" aria-live="polite">
                {meter?.hint ?? (ghost ? "Line your face up with the faint outline of your baseline." : "Fill the oval and hold still.")}
              </p>
            </div>
          </div>
          <div className="mt-5 flex justify-center">
            <button type="button" onClick={capture} className="grid size-20 place-items-center rounded-full border-4 border-ink bg-vial" aria-label="Take photo">
              <span className="size-14 rounded-full bg-ink" />
            </button>
          </div>
        </section>
      )}

      {stage === "review" && shot && (
        <section>
          <h1 className="text-3xl font-semibold tracking-tight">Use this photo?</h1>
          <div className="mt-5 grid gap-6 sm:grid-cols-[1fr_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot.preview} alt="Your capture" className="aspect-[3/4] w-full rounded-vial object-cover" />
            <div className="space-y-4">
              <Quality label="Light" value={shot.light.score} note={shot.light.hint ?? "Even and bright enough."} />
              <Quality label="Matches baseline" value={shot.align} note={ghost ? (shot.align >= 70 ? "Close to your baseline framing." : "Framing differs from your baseline. Try to line up.") : "This becomes the framing future scans match."} />
              <Quality label="Resolution" value={shot.hd ? 100 : 70} note={shot.hd ? "HD analysis (1080px or more)." : "Standard analysis. A sharper photo unlocks HD."} />
              {shot.light.score < 55 && <ErrorNote text="This scan is too dim to count toward a verdict. You can still save it, but a retake is better." />}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button size="lg" onClick={() => submit()}>
                  <IconCheck /> Analyze my skin
                </Button>
                <Button size="lg" variant="secondary" onClick={() => { setShot(null); setStage("intro"); }}>
                  Retake
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {stage === "analyzing" && (
        <section aria-live="polite">
          <h1 className="display text-5xl">Reading your skin</h1>
          <ol className="mt-8 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s} className={`flex items-center gap-3 text-lg ${i <= step ? "text-ink" : "text-smoke/60"}`}>
                <span className={`grid size-8 place-items-center rounded-full ${i < step ? "bg-keep text-white" : i === step ? "bg-serum text-serum-deep" : "bg-mist"}`}>
                  {i < step ? <IconCheck width={16} height={16} /> : <span className={`size-2 rounded-full bg-current ${i === step ? "animate-pulse" : ""}`} />}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </section>
      )}

      {stage === "between" && (
        <section>
          <p className="text-smoke">{trialName}</p>
          <h1 className="display mt-1 text-5xl">One more.</h1>
          <p className="mt-3 text-lg text-ink/80 measure">
            Step away from the mirror, then come back and take the same photo again. Don&apos;t try to match it perfectly; natural variation is exactly what we&apos;re measuring.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={openCamera}>
              <IconCamera /> Take baseline 2
            </Button>
            <Button size="lg" variant="secondary" onClick={() => fileRef.current?.click()}>
              <IconUpload /> Upload a photo
            </Button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>
          <SamplePicker onPick={(i) => submit(i)} />
        </section>
      )}

      {stage === "error" && (
        <section>
          <h1 className="text-3xl font-semibold tracking-tight">The scan didn&apos;t go through</h1>
          {error && <ErrorNote text={error} />}
          <div className="mt-6 flex gap-3">
            <Button onClick={() => setStage(shot ? "review" : "intro")}>Try again</Button>
            <Button variant="secondary" onClick={() => { setShot(null); setStage("intro"); }}>
              Retake photo
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function Meter({ label, value }: { label: string; value?: number }) {
  const tone = value === undefined ? "bg-vial/40" : value >= 70 ? "bg-keep" : value >= 55 ? "bg-unsure" : "bg-ditch";
  return (
    <div className="flex-1 rounded-2xl bg-ink/70 px-3 py-2 text-vial backdrop-blur">
      <div className="flex justify-between text-2xs">
        <span>{label}</span>
        <span className="numeral">{value ?? "–"}</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-vial/20">
        <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${value ?? 0}%` }} />
      </div>
    </div>
  );
}

function Quality({ label, value, note }: { label: string; value: number; note: string }) {
  const tone = value >= 70 ? "text-keep" : value >= 55 ? "text-unsure" : "text-ditch";
  return (
    <div className="flex items-start gap-4 border-b border-hairline pb-4">
      <span className={`display w-14 text-3xl numeral ${tone}`}>{value}</span>
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-smoke">{note}</span>
      </span>
    </div>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-ditch-wash px-4 py-3 text-[15px] text-ditch">
      <IconAlert className="mt-0.5 shrink-0" /> {text}
    </p>
  );
}

function blobImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function SamplePicker({ onPick }: { onPick: (index: number) => void }) {
  return (
    <div className="mt-10 rounded-vial border border-hairline bg-vial p-5">
      <p className="font-semibold">No mirror handy? Try a sample portrait.</p>
      <p className="mt-1 text-sm text-smoke">Runs a real YouCam Skin AI scan on one of YouCam&apos;s own sample photos.</p>
      <ul className="mt-4 grid grid-cols-6 gap-2">
        {SAMPLE_PHOTOS.map((p) => (
          <li key={p.index}>
            <button
              type="button"
              onClick={() => onPick(p.index)}
              className="block w-full overflow-hidden rounded-xl ring-ink/0 transition hover:ring-2 hover:ring-ink focus-visible:ring-2"
              aria-label={`Scan sample portrait ${p.index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb} alt="" className="aspect-[3/4] w-full object-cover" loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

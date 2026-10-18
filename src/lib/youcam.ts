import "server-only";
import { METRICS, metricFromYoucamType } from "./metrics";
import type { MetricKey, MetricReading } from "./types";

/**
 * YouCam Skin Analysis (API v2) client.
 *
 * Flow, per https://docs.perfectcorp.com/reference/ai_skin_analysis :
 *   1. POST /s2s/v2.0/file              → file_id + pre-signed PUT url
 *   2. PUT  <pre-signed url>            → upload the image bytes
 *   3. POST /s2s/v2.0/task/skin-analysis → task_id
 *   4. GET  /s2s/v2.0/task/skin-analysis/<task_id> until task_status is success | error
 *
 * Units are only consumed on success. Results are kept for 24h, so we copy the
 * scores into our own database straight away.
 */

const BASE = process.env.YOUCAM_API_BASE ?? "https://yce-api-01.makeupar.com";
const POLL_MS = 1500;
const TIMEOUT_MS = 90_000;

export class YoucamError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
  ) {
    super(message);
  }
}

export function youcamEnabled() {
  return Boolean(process.env.YOUCAM_API_KEY);
}

function headers(extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${process.env.YOUCAM_API_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || (body.status && body.status !== 200)) {
    throw new YoucamError(body.error ?? `YouCam request failed (${res.status})`, body.error_code, res.status);
  }
  return body as T;
}

interface FileResponse {
  data: {
    files: {
      file_id: string;
      requests: { method: string; url: string; headers?: Record<string, string> }[];
    }[];
  };
}

interface TaskResponse {
  data: { task_id: string };
}

interface PollResponse {
  data: {
    task_status: "running" | "success" | "error";
    polling_interval?: number;
    error?: string;
    results?: {
      output?: { type: string; ui_score: number; raw_score: number; score?: number; mask_urls?: string[] }[];
      skin_age?: number;
    };
  };
}

export interface SkinAnalysisResult {
  taskId: string;
  readings: MetricReading[];
  skinAge?: number;
}

/**
 * Run a full skin analysis on one image.
 * `hd` should be true when the short side is ≥ 1080px (HD and SD concerns can't be mixed).
 */
export async function analyzeSkin(
  opts:
    | { image: ArrayBuffer; contentType: "image/jpeg" | "image/png"; metrics: MetricKey[]; hd: boolean }
    | { srcUrl: string; metrics: MetricKey[]; hd: boolean },
): Promise<SkinAnalysisResult> {
  const source = "srcUrl" in opts ? { src_file_url: opts.srcUrl } : { src_file_id: await uploadImage(opts.image, opts.contentType) };

  // 3. Start the task.
  const dstActions = opts.metrics.map((m) => (opts.hd ? METRICS[m].hd : METRICS[m].sd));
  const task = await call<TaskResponse>("/s2s/v2.0/task/skin-analysis", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      ...source,
      dst_actions: dstActions,
      miniserver_args: { enable_mask_overlay: true },
      format: "json",
    }),
  });

  // 4. Poll until done.
  const taskId = task.data.task_id;
  const started = Date.now();
  for (;;) {
    const poll = await call<PollResponse>(`/s2s/v2.0/task/skin-analysis/${taskId}`, { method: "GET", headers: headers() });
    const { task_status, results, error, polling_interval } = poll.data;
    if (task_status === "success") {
      if (process.env.YOUCAM_DEBUG) console.log("[youcam] result", JSON.stringify(poll.data).slice(0, 4000));
      const ageItem = (results?.output ?? []).find((o) => o.type === "skin_age");
      const readings: MetricReading[] = (results?.output ?? []).flatMap((o) => {
        const metric = metricFromYoucamType(o.type);
        return metric && typeof o.raw_score === "number" ? [{ metric, uiScore: o.ui_score, rawScore: o.raw_score, maskUrl: o.mask_urls?.[0] }] : [];
      });
      return { taskId, readings, skinAge: results?.skin_age ?? (ageItem?.score !== undefined ? Math.round(ageItem.score) : undefined) };
    }
    if (task_status === "error") throw new YoucamError(error ?? "Skin analysis failed", error);
    if (Date.now() - started > TIMEOUT_MS) throw new YoucamError("Skin analysis timed out");
    await new Promise((r) => setTimeout(r, polling_interval ?? POLL_MS));
  }
}

/** Plain-language messages for the errors users can actually fix. */
export function explainYoucamError(e: unknown): string {
  const code = e instanceof YoucamError ? `${e.code ?? ""} ${e.message}`.toLowerCase() : "";
  if (code.includes("face") && code.includes("small")) return "Your face is too small in the frame. Move closer until it fills the oval.";
  if (code.includes("no_face") || code.includes("face not")) return "No face found. Face the camera straight on, with your hair off your forehead.";
  if (code.includes("multiple")) return "More than one face is in the frame. Make sure you're alone in the shot.";
  if (code.includes("resolution") || code.includes("size")) return "The photo is too small. Use the rear camera or a sharper image (at least 480px on the short side).";
  if (code.includes("unit") || code.includes("credit")) return "The YouCam account is out of units. Top up in the API console.";
  return "The skin scan didn't finish. Try again in good, even light.";
}

/** Register an image with YouCam and PUT the bytes to the pre-signed URL. Returns the file id. */
async function uploadImage(image: ArrayBuffer, contentType: "image/jpeg" | "image/png"): Promise<string> {
  // 1. Register the file. Newer accounts use the generic /file endpoint; older
  //    docs used a feature-scoped path, so fall back if the first 404s.
  const fileBody = JSON.stringify({
    files: [{ content_type: contentType, file_name: `scan.${contentType === "image/png" ? "png" : "jpg"}`, file_size: image.byteLength }],
  });
  let file: FileResponse;
  try {
    file = await call<FileResponse>("/s2s/v2.0/file", { method: "POST", headers: headers(), body: fileBody });
  } catch (e) {
    if (e instanceof YoucamError && e.status === 404) {
      file = await call<FileResponse>("/s2s/v2.0/file/skin-analysis", { method: "POST", headers: headers(), body: fileBody });
    } else throw e;
  }
  const entry = file.data.files[0];
  const upload = entry.requests[0];

  // 2. Upload the bytes. Calling the File API alone does not upload anything.
  const put = await fetch(upload.url, {
    method: upload.method ?? "PUT",
    headers: upload.headers ?? { "Content-Type": contentType },
    body: image,
  });
  if (!put.ok) throw new YoucamError(`Image upload failed (${put.status})`);

  return entry.file_id;
}

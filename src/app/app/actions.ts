"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserId, getViewer } from "@/lib/auth";
import { store } from "@/lib/data";
import { designTrial } from "@/lib/agent/designer";
import { parseActives } from "@/lib/agent/actives";
import { today } from "@/lib/dates";
import { buildSampleFor } from "@/lib/data/seed";
import { METRICS } from "@/lib/metrics";
import type { AgentEvent, CheckIn, MetricKey, Product, Trial, UserProfile } from "@/lib/types";

const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

const productInput = z.object({
  name: z.string().trim().min(1, "Add the product name"),
  brand: z.string().trim().min(1, "Add the brand"),
  category: z.enum(["serum", "moisturizer", "cleanser", "treatment", "sunscreen", "toner", "eye"]),
  retailer: z.string().trim().min(1, "Where did you buy it?"),
  price: z.coerce.number().min(0),
  url: z.string().trim().url().optional().or(z.literal("")),
  purchasedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnWindowDays: z.coerce.number().int().min(0).max(365),
  slot: z.enum(["am", "pm", "both"]),
  ingredients: z.string().default(""),
  tint: z.string().default("#C9C4E6"),
});
export type ProductInput = z.input<typeof productInput>;

/** Parse an ingredient list into recognised actives (used live as the user types). */
export async function readLabel(text: string) {
  return parseActives(text);
}

/** Run the trial designer without saving anything, so the user can review the plan. */
export async function previewTrial(raw: ProductInput) {
  const viewer = await getViewer();
  const input = productInput.safeParse(raw);
  if (!input.success) return { ok: false as const, error: input.error.issues[0]?.message ?? "Check the product details" };
  const products = await store.listProducts(viewer.id);
  const routine = products.filter((p) => p.status === "kept" || p.status === "on_trial" || p.status === "shelf");
  const actives = parseActives(`${input.data.name} ${input.data.ingredients}`);
  const result = designTrial({
    product: { ...input.data, actives },
    routine,
    goals: viewer.goals,
    startDate: today(),
  });
  return { ok: true as const, actives, ...result };
}

export async function startTrial(raw: ProductInput) {
  const viewer = await getViewer();
  const input = productInput.parse(raw);
  const products = await store.listProducts(viewer.id);
  const actives = parseActives(`${input.name} ${input.ingredients}`);
  const startedAt = today();
  const { plan, steps } = designTrial({
    product: { ...input, actives },
    routine: products.filter((p) => p.status !== "ditched"),
    goals: viewer.goals,
    startDate: startedAt,
  });

  const product: Product = {
    id: id("p"),
    userId: viewer.id,
    name: input.name,
    brand: input.brand,
    category: input.category,
    retailer: input.retailer,
    price: input.price,
    currency: "USD",
    url: input.url || undefined,
    purchasedAt: input.purchasedAt,
    returnWindowDays: input.returnWindowDays,
    actives,
    status: "on_trial",
    tint: input.tint,
    slot: input.slot,
  };
  const trial: Trial = {
    id: id("t"),
    userId: viewer.id,
    productId: product.id,
    startedAt,
    durationDays: plan.durationDays,
    targetMetrics: plan.targetMetrics,
    guardMetrics: plan.guardMetrics,
    hypotheses: plan.hypotheses,
    purgeWindow: plan.purgeWindow,
    scanDays: plan.scanDays,
    status: "running",
    returnDeadline: plan.returnDeadline,
  };
  const now = new Date().toISOString();
  const events: AgentEvent[] = [
    {
      id: id("e"),
      trialId: trial.id,
      at: now,
      kind: "plan",
      title: "Trial designed",
      body: `Tracking ${plan.targetMetrics.map((m) => METRICS[m].label.toLowerCase()).join(", ")} over ${plan.durationDays} days.${plan.returnCheckpointDay ? ` Checkpoint on day ${plan.returnCheckpointDay}, before ${input.retailer}'s return window closes.` : ""}`,
    },
    ...steps
      .flatMap((s) => s.lines.filter((l) => l.tone === "warn").map((l) => ({ step: s.title, text: l.text })))
      .map((w) => ({ id: id("e"), trialId: trial.id, at: now, kind: "warn" as const, title: w.step, body: w.text })),
  ];

  await store.createProduct(product);
  await store.createTrial(trial, events);
  revalidatePath("/app", "layout");
  return { trialId: trial.id };
}

/** The user acts on a verdict: keep the product, or send it back. */
export async function settleTrial(trialId: string, decision: "keep" | "ditch") {
  const userId = await getUserId();
  const trial = await store.getTrial(userId, trialId);
  if (!trial) throw new Error("Trial not found");
  const product = await store.getProduct(userId, trial.productId);
  await store.closeTrial(userId, trialId, decision);
  await store.setProductStatus(userId, trial.productId, decision === "keep" ? "kept" : "ditched");
  await store.addAgentEvents([
    {
      id: id("e"),
      trialId,
      at: new Date().toISOString(),
      kind: "verdict",
      title: decision === "keep" ? "Kept" : "Sent back",
      body:
        decision === "keep"
          ? `${product?.name ?? "It"} is now part of your routine. I'll keep logging it in your scans.`
          : `${product?.name ?? "It"} is marked for return. Nothing else on your shelf changes.`,
    },
  ]);
  revalidatePath("/app", "layout");
}

const checkInInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sleepHours: z.coerce.number().min(0).max(14),
  stress: z.coerce.number().int().min(1).max(5),
  sun: z.enum(["none", "some", "lots"]),
  onPeriod: z.boolean(),
  newProduct: z.boolean(),
  note: z.string().max(280).optional(),
});

export async function saveCheckIn(raw: z.input<typeof checkInInput>) {
  const userId = await getUserId();
  const c = checkInInput.parse(raw);
  const checkIn: CheckIn = { id: `c_${userId}_${c.date}`, userId, ...c, stress: c.stress as CheckIn["stress"], note: c.note || undefined };
  await store.saveCheckIn(checkIn);
  revalidatePath("/app", "layout");
}

const profileInput = z.object({
  name: z.string().trim().min(1).max(60),
  skinType: z.enum(["dry", "oily", "combination", "normal", "sensitive"]),
  goals: z.array(z.string()).max(3),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function saveProfile(raw: z.input<typeof profileInput>) {
  const viewer = await getViewer({ allowNew: true });
  const p = profileInput.parse(raw);
  const next: UserProfile = { ...viewer, ...p, goals: p.goals.filter((g): g is MetricKey => g in METRICS), onboarded: true };
  await store.saveProfile(next);
  revalidatePath("/", "layout");
}

/** Fill an empty account with a realistic sample history so every screen has something to show. */
export async function loadSampleData() {
  const viewer = await getViewer({ allowNew: true });
  const existing = await store.listTrials(viewer.id);
  if (existing.some((t) => t.id.startsWith("t_calmfix"))) return { ok: true as const };
  await store.importSample(buildSampleFor(viewer.id, viewer.name));
  revalidatePath("/app", "layout");
  return { ok: true as const };
}

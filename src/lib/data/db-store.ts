import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Store } from "./store";
import type { AgentEvent, CheckIn, Product, Scan, Trial, UserProfile } from "../types";

const { users, products, trials, scans, scanReadings, checkIns, agentEvents } = schema;

type ProductRow = typeof products.$inferSelect;
type TrialRow = typeof trials.$inferSelect;
type ScanRow = typeof scans.$inferSelect;
type ReadingRow = typeof scanReadings.$inferSelect;

const toProduct = (r: ProductRow): Product => ({
  id: r.id, userId: r.userId, name: r.name, brand: r.brand, category: r.category, retailer: r.retailer,
  price: r.price, currency: r.currency, url: r.url ?? undefined, purchasedAt: r.purchasedAt,
  returnWindowDays: r.returnWindowDays, actives: r.actives, status: r.status, tint: r.tint, slot: r.slot,
});

const toTrial = (r: TrialRow): Trial => ({
  id: r.id, userId: r.userId, productId: r.productId, startedAt: r.startedAt, durationDays: r.durationDays,
  targetMetrics: r.targetMetrics, guardMetrics: r.guardMetrics, hypotheses: r.hypotheses,
  purgeWindow: r.purgeWindow ?? undefined, scanDays: r.scanDays, status: r.status,
  verdict: r.verdict ?? undefined, verdictAt: r.verdictAt?.toISOString().slice(0, 10), returnDeadline: r.returnDeadline,
});

const toScan = (r: ScanRow, readings: ReadingRow[]): Scan => ({
  id: r.id, userId: r.userId, capturedAt: r.capturedAt.toISOString(), imageUrl: r.imageUrl ?? undefined,
  lightScore: r.lightScore, alignScore: r.alignScore, skinAge: r.skinAge ?? undefined, source: r.source,
  youcamTaskId: r.youcamTaskId ?? undefined, isBaseline: r.isBaseline,
  readings: readings.map((x) => ({ metric: x.metric, uiScore: x.uiScore, rawScore: x.rawScore, maskUrl: x.maskUrl ?? undefined })),
});

async function withReadings(rows: ScanRow[]): Promise<Scan[]> {
  if (!rows.length) return [];
  const readings = await getDb().select().from(scanReadings).where(inArray(scanReadings.scanId, rows.map((r) => r.id)));
  return rows.map((r) => toScan(r, readings.filter((x) => x.scanId === r.id)));
}

export const dbStore: Store = {
  async getProfile(userId) {
    const [r] = await getDb().select().from(users).where(eq(users.id, userId));
    return r
      ? { id: r.id, name: r.name, email: r.email, avatarUrl: r.avatarUrl ?? undefined, skinType: r.skinType, goals: r.goals, onboarded: r.onboarded, reminderTime: r.reminderTime }
      : null;
  },
  async saveProfile(p: UserProfile) {
    const values = { id: p.id, name: p.name, email: p.email, avatarUrl: p.avatarUrl, skinType: p.skinType, goals: p.goals, onboarded: p.onboarded, reminderTime: p.reminderTime };
    await getDb().insert(users).values(values).onConflictDoUpdate({ target: users.id, set: values });
    return p;
  },

  async listProducts(userId) {
    return (await getDb().select().from(products).where(eq(products.userId, userId)).orderBy(desc(products.createdAt))).map(toProduct);
  },
  async getProduct(userId, id) {
    const [r] = await getDb().select().from(products).where(and(eq(products.userId, userId), eq(products.id, id)));
    return r ? toProduct(r) : null;
  },
  async createProduct(p) {
    await getDb().insert(products).values({ ...p, url: p.url ?? null });
    return p;
  },
  async setProductStatus(userId, id, status) {
    await getDb().update(products).set({ status }).where(and(eq(products.userId, userId), eq(products.id, id)));
  },

  async listTrials(userId) {
    return (await getDb().select().from(trials).where(eq(trials.userId, userId)).orderBy(desc(trials.startedAt))).map(toTrial);
  },
  async getTrial(userId, id) {
    const [r] = await getDb().select().from(trials).where(and(eq(trials.userId, userId), eq(trials.id, id)));
    return r ? toTrial(r) : null;
  },
  async createTrial(t, events) {
    // neon-http has no interactive transactions; batch keeps both writes atomic.
    const db = getDb();
    const insertTrial = db.insert(trials).values({
      ...t, purgeWindow: t.purgeWindow ?? null, verdict: t.verdict ?? null,
      verdictAt: t.verdictAt ? new Date(t.verdictAt) : null,
    });
    if (events.length) {
      await db.batch([insertTrial, db.insert(agentEvents).values(events.map((e) => ({ ...e, at: new Date(e.at) })))]);
    } else {
      await insertTrial;
    }
    return t;
  },
  async closeTrial(userId, id, verdict) {
    await getDb().update(trials).set({ status: "closed", verdict, verdictAt: new Date() }).where(and(eq(trials.userId, userId), eq(trials.id, id)));
  },

  async listScans(userId) {
    return withReadings(await getDb().select().from(scans).where(eq(scans.userId, userId)).orderBy(asc(scans.capturedAt)));
  },
  async getScan(userId, id) {
    const rows = await getDb().select().from(scans).where(and(eq(scans.userId, userId), eq(scans.id, id)));
    return (await withReadings(rows))[0] ?? null;
  },
  async createScan(s) {
    const db = getDb();
    const insertScan = db.insert(scans).values({
      id: s.id, userId: s.userId, capturedAt: new Date(s.capturedAt), imageUrl: s.imageUrl, lightScore: s.lightScore,
      alignScore: s.alignScore, skinAge: s.skinAge, source: s.source, youcamTaskId: s.youcamTaskId, isBaseline: s.isBaseline,
    });
    if (s.readings.length) {
      await db.batch([insertScan, db.insert(scanReadings).values(s.readings.map((r) => ({ scanId: s.id, ...r })))]);
    } else {
      await insertScan;
    }
    return s;
  },

  async listCheckIns(userId) {
    return (await getDb().select().from(checkIns).where(eq(checkIns.userId, userId)).orderBy(desc(checkIns.date))).map(
      (r): CheckIn => ({ ...r, stress: r.stress as CheckIn["stress"], note: r.note ?? undefined }),
    );
  },
  async saveCheckIn(c) {
    await getDb().insert(checkIns).values(c).onConflictDoUpdate({ target: checkIns.id, set: c });
    return c;
  },

  async listAgentEvents(userId, trialId) {
    const db = getDb();
    const owned = db.select({ id: trials.id }).from(trials).where(eq(trials.userId, userId));
    const rows = await db
      .select()
      .from(agentEvents)
      .where(trialId ? and(eq(agentEvents.trialId, trialId), inArray(agentEvents.trialId, owned)) : inArray(agentEvents.trialId, owned))
      .orderBy(desc(agentEvents.at));
    return rows.map((r): AgentEvent => ({ ...r, at: r.at.toISOString() }));
  },
  async addAgentEvents(events) {
    if (events.length) await getDb().insert(agentEvents).values(events.map((e) => ({ ...e, at: new Date(e.at) })));
  },
  async importSample(data) {
    const db = getDb();
    await db.batch([
      db.insert(products).values(data.products.map((p) => ({ ...p, url: p.url ?? null }))),
      db.insert(trials).values(
        data.trials.map((t) => ({ ...t, purgeWindow: t.purgeWindow ?? null, verdict: t.verdict ?? null, verdictAt: t.verdictAt ? new Date(t.verdictAt) : null })),
      ),
      db.insert(agentEvents).values(data.events.map((e) => ({ ...e, at: new Date(e.at) }))),
      db.insert(scans).values(
        data.scans.map((s) => ({
          id: s.id, userId: s.userId, capturedAt: new Date(s.capturedAt), imageUrl: s.imageUrl, lightScore: s.lightScore,
          alignScore: s.alignScore, skinAge: s.skinAge, source: s.source, youcamTaskId: s.youcamTaskId, isBaseline: s.isBaseline,
        })),
      ),
      db.insert(scanReadings).values(data.scans.flatMap((s) => s.readings.map((r) => ({ scanId: s.id, ...r })))),
      db.insert(checkIns).values(data.checkIns.map((c) => ({ ...c, note: c.note ?? null }))).onConflictDoNothing(),
    ]);
  },
};

import { buildSeed, type SeedData } from "./seed";
import type { Store } from "./store";

/**
 * In-memory store seeded with demo data. Each user id gets its own copy, so
 * when Clerk is on but Neon isn't, every signed-in user still sees a full app.
 * Survives hot reloads via globalThis; resets on server restart.
 */
const g = globalThis as unknown as { __verdictDemo?: Map<string, SeedData> };
const accounts: Map<string, SeedData> = (g.__verdictDemo ??= new Map<string, SeedData>());

function account(userId: string): SeedData {
  let a = accounts.get(userId);
  if (!a) {
    a = buildSeed(userId);
    accounts.set(userId, a);
  }
  return a;
}

const byNewest = <T extends { capturedAt?: string; at?: string; date?: string }>(a: T, b: T) =>
  (b.capturedAt ?? b.at ?? b.date ?? "").localeCompare(a.capturedAt ?? a.at ?? a.date ?? "");

export const demoStore: Store = {
  async getProfile(userId) {
    return account(userId).profile;
  },
  async saveProfile(profile) {
    account(profile.id).profile = profile;
    return profile;
  },

  async listProducts(userId) {
    return account(userId).products;
  },
  async getProduct(userId, id) {
    return account(userId).products.find((p) => p.id === id) ?? null;
  },
  async createProduct(product) {
    account(product.userId).products.unshift(product);
    return product;
  },
  async setProductStatus(userId, id, status) {
    const p = account(userId).products.find((x) => x.id === id);
    if (p) p.status = status;
  },

  async listTrials(userId) {
    return account(userId).trials;
  },
  async getTrial(userId, id) {
    return account(userId).trials.find((t) => t.id === id) ?? null;
  },
  async createTrial(trial, events) {
    const a = account(trial.userId);
    a.trials.unshift(trial);
    a.events.push(...events);
    return trial;
  },
  async closeTrial(userId, id, verdict) {
    const t = account(userId).trials.find((x) => x.id === id);
    if (t) {
      t.status = "closed";
      t.verdict = verdict;
      t.verdictAt = new Date().toISOString().slice(0, 10);
    }
  },

  async listScans(userId) {
    return [...account(userId).scans].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  },
  async getScan(userId, id) {
    return account(userId).scans.find((s) => s.id === id) ?? null;
  },
  async createScan(scan) {
    account(scan.userId).scans.push(scan);
    return scan;
  },

  async listCheckIns(userId) {
    return [...account(userId).checkIns].sort(byNewest);
  },
  async saveCheckIn(checkIn) {
    const list = account(checkIn.userId).checkIns;
    const i = list.findIndex((c) => c.date === checkIn.date);
    if (i >= 0) list[i] = checkIn;
    else list.push(checkIn);
    return checkIn;
  },

  async listAgentEvents(userId, trialId) {
    const list = account(userId).events.filter((e) => !trialId || e.trialId === trialId);
    return [...list].sort(byNewest);
  },
  async addAgentEvents(events) {
    if (!events.length) return;
    const owner = [...accounts.values()].find((a) => a.trials.some((t) => t.id === events[0].trialId));
    owner?.events.push(...events);
  },
  async importSample(data) {
    const userId = data.products[0]?.userId;
    if (!userId) return;
    const a = account(userId);
    a.products.push(...data.products);
    a.trials.push(...data.trials);
    a.scans.push(...data.scans);
    a.checkIns.push(...data.checkIns);
    a.events.push(...data.events);
  },
};

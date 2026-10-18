import type { SeedData } from "./seed";
import type { AgentEvent, CheckIn, Product, ProductStatus, Scan, Trial, UserProfile, Verdict } from "../types";

/**
 * Everything the UI needs from persistence. Two implementations:
 *  - `demo-store.ts`: in-memory, seeded with a realistic user. Used when DATABASE_URL is unset.
 *  - `db-store.ts`:   Neon Postgres via Drizzle.
 */
export interface Store {
  getProfile(userId: string): Promise<UserProfile | null>;
  saveProfile(profile: UserProfile): Promise<UserProfile>;

  listProducts(userId: string): Promise<Product[]>;
  getProduct(userId: string, id: string): Promise<Product | null>;
  createProduct(product: Product): Promise<Product>;
  setProductStatus(userId: string, id: string, status: ProductStatus): Promise<void>;

  listTrials(userId: string): Promise<Trial[]>;
  getTrial(userId: string, id: string): Promise<Trial | null>;
  createTrial(trial: Trial, events: AgentEvent[]): Promise<Trial>;
  closeTrial(userId: string, id: string, verdict: Verdict): Promise<void>;

  listScans(userId: string): Promise<Scan[]>;
  getScan(userId: string, id: string): Promise<Scan | null>;
  createScan(scan: Scan): Promise<Scan>;

  listCheckIns(userId: string): Promise<CheckIn[]>;
  saveCheckIn(checkIn: CheckIn): Promise<CheckIn>;

  listAgentEvents(userId: string, trialId?: string): Promise<AgentEvent[]>;
  addAgentEvents(events: AgentEvent[]): Promise<void>;

  /** Load a full sample history into an account (products, trials, scans, log, notes). */
  importSample(data: Omit<SeedData, "profile">): Promise<void>;
}

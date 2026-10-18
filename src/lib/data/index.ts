import "server-only";
import { dbEnabled } from "@/db";
import { demoStore } from "./demo-store";
import { dbStore } from "./db-store";
import type { Store } from "./store";

/** Neon when DATABASE_URL is set, otherwise the seeded in-memory demo. */
export const store: Store = dbEnabled ? dbStore : demoStore;
export const storeMode: "neon" | "demo" = dbEnabled ? "neon" : "demo";

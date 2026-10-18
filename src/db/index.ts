import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/** True once DATABASE_URL (Neon) is configured. Until then the app runs on the demo store. */
export const dbEnabled = Boolean(process.env.DATABASE_URL);

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  _db ??= drizzle(neon(process.env.DATABASE_URL), { schema });
  return _db;
}

export { schema };

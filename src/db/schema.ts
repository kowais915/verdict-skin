import { pgTable, text, integer, real, boolean, timestamp, date, jsonb, pgEnum, index, primaryKey } from "drizzle-orm/pg-core";
import type { Active, Hypothesis, MetricKey } from "@/lib/types";

/**
 * Neon Postgres schema. Users are keyed by their Clerk user id, so there's no
 * password or session table here: Clerk owns identity, we own skin data.
 */

export const skinTypeEnum = pgEnum("skin_type", ["dry", "oily", "combination", "normal", "sensitive"]);
export const productStatusEnum = pgEnum("product_status", ["on_trial", "kept", "ditched", "shelf"]);
export const productCategoryEnum = pgEnum("product_category", ["serum", "moisturizer", "cleanser", "treatment", "sunscreen", "toner", "eye"]);
export const slotEnum = pgEnum("routine_slot", ["am", "pm", "both"]);
export const trialStatusEnum = pgEnum("trial_status", ["running", "verdict_ready", "closed"]);
export const verdictEnum = pgEnum("verdict", ["keep", "ditch", "inconclusive"]);
export const scanSourceEnum = pgEnum("scan_source", ["youcam", "demo"]);
export const sunEnum = pgEnum("sun_exposure", ["none", "some", "lots"]);
export const agentEventKindEnum = pgEnum("agent_event_kind", ["plan", "warn", "insight", "reminder", "verdict"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  name: text("name").notNull(),
  email: text("email").notNull(),
  avatarUrl: text("avatar_url"),
  skinType: skinTypeEnum("skin_type").notNull().default("normal"),
  goals: jsonb("goals").$type<MetricKey[]>().notNull().default([]),
  onboarded: boolean("onboarded").notNull().default(false),
  reminderTime: text("reminder_time").notNull().default("08:00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brand: text("brand").notNull(),
    category: productCategoryEnum("category").notNull(),
    retailer: text("retailer").notNull(),
    price: real("price").notNull(),
    currency: text("currency").notNull().default("USD"),
    url: text("url"),
    purchasedAt: date("purchased_at").notNull(),
    returnWindowDays: integer("return_window_days").notNull(),
    actives: jsonb("actives").$type<Active[]>().notNull().default([]),
    status: productStatusEnum("status").notNull().default("shelf"),
    tint: text("tint").notNull().default("#C9C4E6"),
    slot: slotEnum("slot").notNull().default("pm"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("products_user_idx").on(t.userId)],
);

export const trials = pgTable(
  "trials",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    startedAt: date("started_at").notNull(),
    durationDays: integer("duration_days").notNull(),
    targetMetrics: jsonb("target_metrics").$type<MetricKey[]>().notNull(),
    guardMetrics: jsonb("guard_metrics").$type<MetricKey[]>().notNull().default([]),
    hypotheses: jsonb("hypotheses").$type<Hypothesis[]>().notNull(),
    purgeWindow: jsonb("purge_window").$type<{ startDay: number; endDay: number } | null>(),
    scanDays: jsonb("scan_days").$type<number[]>().notNull(),
    status: trialStatusEnum("status").notNull().default("running"),
    verdict: verdictEnum("verdict"),
    verdictAt: timestamp("verdict_at", { withTimezone: true }),
    returnDeadline: date("return_deadline").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("trials_user_idx").on(t.userId)],
);

export const scans = pgTable(
  "scans",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    imageUrl: text("image_url"),
    lightScore: integer("light_score").notNull(),
    alignScore: integer("align_score").notNull(),
    skinAge: integer("skin_age"),
    source: scanSourceEnum("source").notNull(),
    youcamTaskId: text("youcam_task_id"),
    isBaseline: boolean("is_baseline").notNull().default(false),
  },
  (t) => [index("scans_user_time_idx").on(t.userId, t.capturedAt)],
);

export const scanReadings = pgTable(
  "scan_readings",
  {
    scanId: text("scan_id").notNull().references(() => scans.id, { onDelete: "cascade" }),
    metric: text("metric").$type<MetricKey>().notNull(),
    uiScore: integer("ui_score").notNull(),
    rawScore: real("raw_score").notNull(),
    maskUrl: text("mask_url"),
  },
  (t) => [primaryKey({ columns: [t.scanId, t.metric] })],
);

export const checkIns = pgTable(
  "check_ins",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    sleepHours: real("sleep_hours").notNull(),
    stress: integer("stress").notNull(),
    sun: sunEnum("sun").notNull(),
    onPeriod: boolean("on_period").notNull().default(false),
    newProduct: boolean("new_product").notNull().default(false),
    note: text("note"),
  },
  (t) => [index("check_ins_user_date_idx").on(t.userId, t.date)],
);

export const agentEvents = pgTable(
  "agent_events",
  {
    id: text("id").primaryKey(),
    trialId: text("trial_id").notNull().references(() => trials.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    kind: agentEventKindEnum("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
  },
  (t) => [index("agent_events_trial_idx").on(t.trialId)],
);

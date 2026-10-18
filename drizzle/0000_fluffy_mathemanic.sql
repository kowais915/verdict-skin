CREATE TYPE "public"."agent_event_kind" AS ENUM('plan', 'warn', 'insight', 'reminder', 'verdict');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('serum', 'moisturizer', 'cleanser', 'treatment', 'sunscreen', 'toner', 'eye');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('on_trial', 'kept', 'ditched', 'shelf');--> statement-breakpoint
CREATE TYPE "public"."scan_source" AS ENUM('youcam', 'demo');--> statement-breakpoint
CREATE TYPE "public"."skin_type" AS ENUM('dry', 'oily', 'combination', 'normal', 'sensitive');--> statement-breakpoint
CREATE TYPE "public"."routine_slot" AS ENUM('am', 'pm', 'both');--> statement-breakpoint
CREATE TYPE "public"."sun_exposure" AS ENUM('none', 'some', 'lots');--> statement-breakpoint
CREATE TYPE "public"."trial_status" AS ENUM('running', 'verdict_ready', 'closed');--> statement-breakpoint
CREATE TYPE "public"."verdict" AS ENUM('keep', 'ditch', 'inconclusive');--> statement-breakpoint
CREATE TABLE "agent_events" (
	"id" text PRIMARY KEY NOT NULL,
	"trial_id" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" "agent_event_kind" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "check_ins" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"sleep_hours" real NOT NULL,
	"stress" integer NOT NULL,
	"sun" "sun_exposure" NOT NULL,
	"on_period" boolean DEFAULT false NOT NULL,
	"new_product" boolean DEFAULT false NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"category" "product_category" NOT NULL,
	"retailer" text NOT NULL,
	"price" real NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"url" text,
	"purchased_at" date NOT NULL,
	"return_window_days" integer NOT NULL,
	"actives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "product_status" DEFAULT 'shelf' NOT NULL,
	"tint" text DEFAULT '#C9C4E6' NOT NULL,
	"slot" "routine_slot" DEFAULT 'pm' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_readings" (
	"scan_id" text NOT NULL,
	"metric" text NOT NULL,
	"ui_score" integer NOT NULL,
	"raw_score" real NOT NULL,
	"mask_url" text,
	CONSTRAINT "scan_readings_scan_id_metric_pk" PRIMARY KEY("scan_id","metric")
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"image_url" text,
	"light_score" integer NOT NULL,
	"align_score" integer NOT NULL,
	"skin_age" integer,
	"source" "scan_source" NOT NULL,
	"youcam_task_id" text,
	"is_baseline" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trials" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"started_at" date NOT NULL,
	"duration_days" integer NOT NULL,
	"target_metrics" jsonb NOT NULL,
	"guard_metrics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hypotheses" jsonb NOT NULL,
	"purge_window" jsonb,
	"scan_days" jsonb NOT NULL,
	"status" "trial_status" DEFAULT 'running' NOT NULL,
	"verdict" "verdict",
	"verdict_at" timestamp with time zone,
	"return_deadline" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"avatar_url" text,
	"skin_type" "skin_type" DEFAULT 'normal' NOT NULL,
	"goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"onboarded" boolean DEFAULT false NOT NULL,
	"reminder_time" text DEFAULT '08:00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_events" ADD CONSTRAINT "agent_events_trial_id_trials_id_fk" FOREIGN KEY ("trial_id") REFERENCES "public"."trials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_readings" ADD CONSTRAINT "scan_readings_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trials" ADD CONSTRAINT "trials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trials" ADD CONSTRAINT "trials_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_events_trial_idx" ON "agent_events" USING btree ("trial_id");--> statement-breakpoint
CREATE INDEX "check_ins_user_date_idx" ON "check_ins" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "products_user_idx" ON "products" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scans_user_time_idx" ON "scans" USING btree ("user_id","captured_at");--> statement-breakpoint
CREATE INDEX "trials_user_idx" ON "trials" USING btree ("user_id");
CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"name" text DEFAULT 'Mon PC' NOT NULL,
	"platform" text,
	"version" text,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agents_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "bot_state" (
	"id" integer PRIMARY KEY NOT NULL,
	"max_increment" integer DEFAULT 16 NOT NULL,
	"refresh_min_loops" integer DEFAULT 400 NOT NULL,
	"refresh_max_loops" integer DEFAULT 500 NOT NULL,
	"loop_delay_ms" integer DEFAULT 400 NOT NULL,
	"buy_limit" integer DEFAULT 0 NOT NULL,
	"flood_threshold" integer DEFAULT 6 NOT NULL,
	"auto_refresh_min" integer DEFAULT 15 NOT NULL,
	"min_credits_floor" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"active_strategy_id" integer,
	"rotate_enabled" boolean DEFAULT false NOT NULL,
	"rotate_every_min" integer DEFAULT 20 NOT NULL,
	"last_rotation_at" timestamp with time zone,
	"demo_mode" boolean DEFAULT false NOT NULL,
	"demo_credits" integer DEFAULT 150000 NOT NULL,
	"agent_status" text DEFAULT 'offline' NOT NULL,
	"credits" integer,
	"total_profit" integer DEFAULT 0 NOT NULL,
	"players_bought" integer DEFAULT 0 NOT NULL,
	"loops" integer DEFAULT 0 NOT NULL,
	"refresh_count" integer DEFAULT 0 NOT NULL,
	"increment_value" integer DEFAULT 0 NOT NULL,
	"next_refresh_in" integer,
	"last_seen_at" timestamp with time zone,
	"session_started_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commands" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"strategy_id" integer,
	"lowest_price" integer,
	"listing_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"buy_price" integer,
	"sell_min" integer,
	"sell_max" integer
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"strategy_id" integer,
	"strategy_name" text DEFAULT '—' NOT NULL,
	"player" text NOT NULL,
	"rarity" text,
	"quality" text,
	"position" text,
	"filter_signature" text DEFAULT 'aucun filtre' NOT NULL,
	"buy_price" integer NOT NULL,
	"sell_min" integer,
	"sell_max" integer,
	"profit" integer NOT NULL,
	"status" text DEFAULT 'listed' NOT NULL,
	"sold_price" integer,
	"sold_at" timestamp with time zone,
	"real_profit" integer,
	"market_depth" integer,
	"demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"accent" text DEFAULT 'lime' NOT NULL,
	"player_name" text DEFAULT '' NOT NULL,
	"player_enabled" boolean DEFAULT true NOT NULL,
	"buy_price" integer DEFAULT 1000 NOT NULL,
	"sell_min" integer DEFAULT 1100 NOT NULL,
	"sell_max" integer DEFAULT 1200 NOT NULL,
	"rarity" text DEFAULT '' NOT NULL,
	"rarity_enabled" boolean DEFAULT false NOT NULL,
	"quality" text DEFAULT 'Gold' NOT NULL,
	"quality_enabled" boolean DEFAULT false NOT NULL,
	"position" text DEFAULT '' NOT NULL,
	"position_enabled" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "snapshots_strategy_idx" ON "market_snapshots" USING btree ("strategy_id");--> statement-breakpoint
CREATE INDEX "purchases_strategy_idx" ON "purchases" USING btree ("strategy_id");
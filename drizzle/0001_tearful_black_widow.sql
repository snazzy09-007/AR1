ALTER TABLE "bot_state" ALTER COLUMN "loop_delay_ms" SET DEFAULT 250;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "revoked" boolean DEFAULT false NOT NULL;
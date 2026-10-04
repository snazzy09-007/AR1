import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// État global : réglages MOTEUR (comment on trade) + runtime
// Les réglages MARCHÉ (quoi acheter) vivent dans `strategies`.
// ---------------------------------------------------------------------------
export const botState = pgTable("bot_state", {
  id: integer("id").primaryKey(),

  // ---- Moteur ----
  maxIncrement: integer("max_increment").notNull().default(16),
  refreshMinLoops: integer("refresh_min_loops").notNull().default(400),
  refreshMaxLoops: integer("refresh_max_loops").notNull().default(500),
  loopDelayMs: integer("loop_delay_ms").notNull().default(400),
  buyLimit: integer("buy_limit").notNull().default(0), // 0 = illimité
  floodThreshold: integer("flood_threshold").notNull().default(6),
  autoRefreshMin: integer("auto_refresh_min").notNull().default(15),
  minCreditsFloor: integer("min_credits_floor").notNull().default(0),
  status: text("status").notNull().default("running"), // running | paused | stopped

  // ---- Stratégie active & rotation A/B ----
  activeStrategyId: integer("active_strategy_id"),
  rotateEnabled: boolean("rotate_enabled").notNull().default(false),
  rotateEveryMin: integer("rotate_every_min").notNull().default(20),
  lastRotationAt: timestamp("last_rotation_at", { withTimezone: true }),

  // ---- Démo (simulation sans Selenium) ----
  demoMode: boolean("demo_mode").notNull().default(false),
  demoCredits: integer("demo_credits").notNull().default(150000),

  // ---- Runtime remonté par l'agent ----
  agentStatus: text("agent_status").notNull().default("offline"),
  credits: integer("credits"),
  totalProfit: integer("total_profit").notNull().default(0),
  playersBought: integer("players_bought").notNull().default(0),
  loops: integer("loops").notNull().default(0),
  refreshCount: integer("refresh_count").notNull().default(0),
  incrementValue: integer("increment_value").notNull().default(0),
  nextRefreshIn: integer("next_refresh_in"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  sessionStartedAt: timestamp("session_started_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Stratégies : une cible + ses filtres + ses prix. Comparables entre elles.
// ---------------------------------------------------------------------------
export const strategies = pgTable("strategies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  accent: text("accent").notNull().default("lime"), // couleur d'affichage

  playerName: text("player_name").notNull().default(""),
  playerEnabled: boolean("player_enabled").notNull().default(true),

  buyPrice: integer("buy_price").notNull().default(1000),
  sellMin: integer("sell_min").notNull().default(1100),
  sellMax: integer("sell_max").notNull().default(1200),

  rarity: text("rarity").notNull().default(""),
  rarityEnabled: boolean("rarity_enabled").notNull().default(false),
  quality: text("quality").notNull().default("Gold"), // Gold | Silver | Bronze
  qualityEnabled: boolean("quality_enabled").notNull().default(false),
  position: text("position").notNull().default(""), // CB, ST, GK…
  positionEnabled: boolean("position_enabled").notNull().default(false),

  enabled: boolean("enabled").notNull().default(true), // entre dans la rotation
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Achats (+ suivi de revente) — la matière première des analytics
// ---------------------------------------------------------------------------
export const purchases = pgTable(
  "purchases",
  {
    id: serial("id").primaryKey(),
    strategyId: integer("strategy_id"),
    strategyName: text("strategy_name").notNull().default("—"),

    player: text("player").notNull(),
    rarity: text("rarity"),
    quality: text("quality"),
    position: text("position"),
    filterSignature: text("filter_signature").notNull().default("aucun filtre"),

    buyPrice: integer("buy_price").notNull(),
    sellMin: integer("sell_min"),
    sellMax: integer("sell_max"),
    profit: integer("profit").notNull(), // estimé (taxe 5 %)

    status: text("status").notNull().default("listed"), // listed | sold | expired
    soldPrice: integer("sold_price"),
    soldAt: timestamp("sold_at", { withTimezone: true }),
    realProfit: integer("real_profit"),

    marketDepth: integer("market_depth"), // nb de cartes vues au moment de l'achat
    demo: boolean("demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("purchases_strategy_idx").on(t.strategyId)],
);

// Photographie du marché à chaque recherche : profondeur + prix plancher
export const marketSnapshots = pgTable(
  "market_snapshots",
  {
    id: serial("id").primaryKey(),
    strategyId: integer("strategy_id"),
    lowestPrice: integer("lowest_price"),
    listingCount: integer("listing_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("snapshots_strategy_idx").on(t.strategyId)],
);

// Agents appairés (1 clic = 1 token dédié, pas de clé à recopier)
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  name: text("name").notNull().default("Mon PC"),
  platform: text("platform"),
  version: text("version"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const commands = pgTable("commands", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull().default("info"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const playerPresets = pgTable("player_presets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  buyPrice: integer("buy_price"),
  sellMin: integer("sell_min"),
  sellMax: integer("sell_max"),
});

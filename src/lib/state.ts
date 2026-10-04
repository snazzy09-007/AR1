import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  agents,
  botState,
  commands,
  logs,
  marketSnapshots,
  playerPresets,
  purchases,
  strategies,
} from "@/db/schema";
import { computeAnalytics } from "@/lib/analytics";
import type {
  AgentInfo,
  DashboardData,
  EngineState,
  LogRow,
  PurchaseRow,
  Strategy,
  BotStatus,
} from "@/lib/types";

export const STATE_ID = 1;
export const AGENT_ONLINE_WINDOW_MS = 15_000;
const LOG_CAP = 400;
const SNAPSHOT_CAP = 4000;

export type StateRow = typeof botState.$inferSelect;
export type StrategyRow = typeof strategies.$inferSelect;

const DEFAULT_PRESETS = [
  "Micky van de Ven", "Omar Marmoush", "Cristiano Ronaldo", "Rayan Cherki",
  "Paul Pogba", "Lionel Messi", "Claudia Pina", "Jeremie Frimpong",
  "Randal Kolo Muani", "Joško Gvardiol", "Marcus Rashford", "Jordi Alba",
  "Ryan Gravenberch", "Nuno Mendes", "Karim Adeyemi", "Jude Bellingham",
  "Kylian Mbappé", "Erling Haaland", "Vinícius Jr", "Florian Wirtz",
];

const DEFAULT_STRATEGIES = [
  {
    name: "Van de Ven flip",
    accent: "lime",
    playerName: "Micky van de Ven",
    playerEnabled: true,
    buyPrice: 21000,
    sellMin: 22000,
    sellMax: 22250,
  },
  {
    name: "TOTW sniper",
    accent: "gold",
    playerName: "Omar Marmoush",
    playerEnabled: true,
    buyPrice: 34000,
    sellMin: 36000,
    sellMax: 36500,
    rarity: "Team of the Week",
    rarityEnabled: true,
  },
  {
    name: "Marché global — Or",
    accent: "frost",
    playerName: "",
    playerEnabled: false,
    buyPrice: 1200,
    sellMin: 1400,
    sellMax: 1500,
    quality: "Gold",
    qualityEnabled: true,
  },
];

/* ------------------------------ utilitaires ------------------------------ */

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export function filterSignature(s: {
  rarityEnabled?: boolean; rarity?: string;
  qualityEnabled?: boolean; quality?: string;
  positionEnabled?: boolean; position?: string;
  playerEnabled?: boolean;
}): string {
  const parts: string[] = [];
  if (s.rarityEnabled && s.rarity) parts.push(s.rarity);
  if (s.qualityEnabled && s.quality) parts.push(s.quality);
  if (s.positionEnabled && s.position) parts.push(s.position);
  if (!s.playerEnabled) parts.push("marché global");
  return parts.length ? parts.join(" · ") : "aucun filtre";
}

export function serializeStrategy(r: StrategyRow): Strategy {
  return {
    id: r.id,
    name: r.name,
    accent: r.accent,
    playerName: r.playerName,
    playerEnabled: r.playerEnabled,
    buyPrice: r.buyPrice,
    sellMin: r.sellMin,
    sellMax: r.sellMax,
    rarity: r.rarity,
    rarityEnabled: r.rarityEnabled,
    quality: r.quality,
    qualityEnabled: r.qualityEnabled,
    position: r.position,
    positionEnabled: r.positionEnabled,
    enabled: r.enabled,
    createdAt: r.createdAt.toISOString(),
  };
}

export function serializeEngine(row: StateRow): EngineState {
  return {
    maxIncrement: row.maxIncrement,
    refreshMinLoops: row.refreshMinLoops,
    refreshMaxLoops: row.refreshMaxLoops,
    loopDelayMs: row.loopDelayMs,
    buyLimit: row.buyLimit,
    floodThreshold: row.floodThreshold,
    autoRefreshMin: row.autoRefreshMin,
    minCreditsFloor: row.minCreditsFloor,
    status: row.status as BotStatus,
    activeStrategyId: row.activeStrategyId,
    rotateEnabled: row.rotateEnabled,
    rotateEveryMin: row.rotateEveryMin,
    demoMode: row.demoMode,
    agentStatus: row.agentStatus,
    credits: row.credits,
    totalProfit: row.totalProfit,
    playersBought: row.playersBought,
    loops: row.loops,
    refreshCount: row.refreshCount,
    incrementValue: row.incrementValue,
    nextRefreshIn: row.nextRefreshIn,
    lastSeenAt: iso(row.lastSeenAt),
    sessionStartedAt: iso(row.sessionStartedAt),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializePurchase(r: typeof purchases.$inferSelect): PurchaseRow {
  return {
    id: r.id,
    strategyId: r.strategyId,
    strategyName: r.strategyName,
    player: r.player,
    filterSignature: r.filterSignature,
    buyPrice: r.buyPrice,
    sellMin: r.sellMin,
    sellMax: r.sellMax,
    profit: r.profit,
    status: r.status,
    soldPrice: r.soldPrice,
    realProfit: r.realProfit,
    marketDepth: r.marketDepth,
    demo: r.demo,
    createdAt: r.createdAt.toISOString(),
  };
}

function serializeLog(r: typeof logs.$inferSelect): LogRow {
  return {
    id: r.id,
    level: (r.level as LogRow["level"]) ?? "info",
    message: r.message,
    createdAt: r.createdAt.toISOString(),
  };
}

/* --------------------------------- seeds -------------------------------- */

export async function ensureState(): Promise<StateRow> {
  const [row] = await db.select().from(botState).where(eq(botState.id, STATE_ID));
  if (row) return row;
  const [created] = await db.insert(botState).values({ id: STATE_ID }).returning();
  return created;
}

export async function ensureSeeds(): Promise<StateRow> {
  let state = await ensureState();

  const [hasPreset] = await db.select({ id: playerPresets.id }).from(playerPresets).limit(1);
  if (!hasPreset) {
    await db.insert(playerPresets).values(DEFAULT_PRESETS.map((name) => ({ name })));
  }

  const [hasStrategy] = await db.select({ id: strategies.id }).from(strategies).limit(1);
  if (!hasStrategy) {
    const created = await db.insert(strategies).values(DEFAULT_STRATEGIES).returning();
    if (created.length > 0 && state.activeStrategyId == null) {
      state = await updateState({ activeStrategyId: created[0].id });
    }
  }

  // Garantit une stratégie active valide
  if (state.activeStrategyId == null) {
    const [first] = await db
      .select()
      .from(strategies)
      .where(and(eq(strategies.archived, false), eq(strategies.enabled, true)))
      .limit(1);
    if (first) state = await updateState({ activeStrategyId: first.id });
  }

  return state;
}

/* ------------------------------- mutations ------------------------------- */

export async function updateState(patch: Record<string, unknown>): Promise<StateRow> {
  const [row] = await db
    .update(botState)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(botState.id, STATE_ID))
    .returning();
  return row;
}

export async function addLog(level: string, message: string) {
  await db.insert(logs).values({ level, message: message.slice(0, 500) });
  await db.execute(
    sql`DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY id DESC LIMIT ${LOG_CAP})`,
  );
}

export async function enqueueCommand(type: string, payload?: Record<string, unknown>) {
  await db.insert(commands).values({ type, payload: payload ?? null });
}

export async function drainCommands() {
  const pending = await db
    .select()
    .from(commands)
    .where(eq(commands.status, "pending"))
    .orderBy(commands.id);
  if (pending.length > 0) {
    await db
      .update(commands)
      .set({ status: "done" })
      .where(inArray(commands.id, pending.map((c) => c.id)));
  }
  return pending.map((c) => ({ id: c.id, type: c.type, payload: c.payload ?? {} }));
}

export async function getStrategy(id: number | null): Promise<StrategyRow | null> {
  if (id == null) return null;
  const [row] = await db.select().from(strategies).where(eq(strategies.id, id));
  return row ?? null;
}

export async function listStrategies(): Promise<StrategyRow[]> {
  return db
    .select()
    .from(strategies)
    .where(eq(strategies.archived, false))
    .orderBy(strategies.id);
}

export async function recordSnapshot(input: {
  strategyId: number | null;
  lowestPrice: number | null;
  listingCount: number;
}) {
  await db.insert(marketSnapshots).values({
    strategyId: input.strategyId,
    lowestPrice: input.lowestPrice,
    listingCount: input.listingCount,
  });
  if (Math.random() < 0.02) {
    await db.execute(
      sql`DELETE FROM market_snapshots WHERE id NOT IN (SELECT id FROM market_snapshots ORDER BY id DESC LIMIT ${SNAPSHOT_CAP})`,
    );
  }
}

export async function recordPurchase(input: {
  strategyId?: number | null;
  player: string;
  buyPrice: number;
  sellMin?: number | null;
  sellMax?: number | null;
  marketDepth?: number | null;
  demo?: boolean;
}): Promise<PurchaseRow> {
  const strat = await getStrategy(input.strategyId ?? null);
  const sellMax = input.sellMax ?? strat?.sellMax ?? null;
  const sellMin = input.sellMin ?? strat?.sellMin ?? null;
  const profit = sellMax != null ? Math.round(sellMax * 0.95) - input.buyPrice : -input.buyPrice;

  const [row] = await db
    .insert(purchases)
    .values({
      strategyId: strat?.id ?? null,
      strategyName: strat?.name ?? "Manuel",
      player: (input.player || strat?.playerName || "Carte").slice(0, 80),
      rarity: strat?.rarityEnabled ? strat.rarity : null,
      quality: strat?.qualityEnabled ? strat.quality : null,
      position: strat?.positionEnabled ? strat.position : null,
      filterSignature: strat ? filterSignature(strat) : "aucun filtre",
      buyPrice: input.buyPrice,
      sellMin,
      sellMax,
      profit,
      marketDepth: input.marketDepth ?? null,
      demo: input.demo ?? false,
    })
    .returning();

  await db
    .update(botState)
    .set({
      playersBought: sql`${botState.playersBought} + 1`,
      totalProfit: sql`${botState.totalProfit} + ${profit}`,
      updatedAt: new Date(),
    })
    .where(eq(botState.id, STATE_ID));

  return serializePurchase(row);
}

/** Marque les plus anciennes cartes encore listées comme vendues. */
export async function markSold(count: number, unitPrice?: number | null) {
  const open = await db
    .select()
    .from(purchases)
    .where(eq(purchases.status, "listed"))
    .orderBy(purchases.id)
    .limit(Math.max(0, Math.min(count, 50)));

  for (const p of open) {
    const price = unitPrice ?? p.sellMax ?? p.buyPrice;
    await db
      .update(purchases)
      .set({
        status: "sold",
        soldPrice: price,
        soldAt: new Date(),
        realProfit: Math.round(price * 0.95) - p.buyPrice,
      })
      .where(eq(purchases.id, p.id));
  }
  return open.length;
}

export async function resetStats(hard = false) {
  await updateState({
    totalProfit: 0,
    playersBought: 0,
    loops: 0,
    refreshCount: 0,
    incrementValue: 0,
    nextRefreshIn: null,
    sessionStartedAt: new Date(),
  });
  if (hard) {
    await db.delete(purchases);
    await db.delete(marketSnapshots);
  }
}

/* ------------------------------- dashboard ------------------------------- */

export async function getDashboardData(): Promise<DashboardData> {
  const state = await ensureSeeds();

  const [strategyRows, purchaseRows, logRows, presetRows, agentRows, analytics] =
    await Promise.all([
      listStrategies(),
      db.select().from(purchases).orderBy(desc(purchases.id)).limit(60),
      db.select().from(logs).orderBy(desc(logs.id)).limit(90),
      db.select().from(playerPresets).orderBy(playerPresets.name),
      db.select().from(agents).orderBy(desc(agents.id)).limit(6),
      computeAnalytics(),
    ]);

  const lastSeen = state.lastSeenAt?.getTime() ?? null;
  const agentOnline = lastSeen != null && Date.now() - lastSeen < AGENT_ONLINE_WINDOW_MS;

  const serializedStrategies = strategyRows.map(serializeStrategy);
  const activeStrategy =
    serializedStrategies.find((s) => s.id === state.activeStrategyId) ?? null;

  const agentInfos: AgentInfo[] = agentRows.map((a) => ({
    id: a.id,
    name: a.name,
    platform: a.platform,
    version: a.version,
    lastSeenAt: iso(a.lastSeenAt),
    online:
      a.lastSeenAt != null && Date.now() - a.lastSeenAt.getTime() < AGENT_ONLINE_WINDOW_MS,
    tokenPreview: `${a.token.slice(0, 6)}…${a.token.slice(-4)}`,
  }));

  return {
    engine: serializeEngine(state),
    strategies: serializedStrategies,
    activeStrategy,
    agentOnline,
    agents: agentInfos,
    purchases: purchaseRows.map(serializePurchase),
    logs: logRows.map(serializeLog).reverse(),
    presets: presetRows.map((p) => ({ id: p.id, name: p.name })),
    analytics,
  };
}

import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { AnalyticsData, FilterStat, HourStat, StrategyStat } from "@/lib/types";

interface StratAgg {
  strategy_id: number | null;
  name: string | null;
  accent: string | null;
  player: string | null;
  filters: string | null;
  flips: string;
  sold: string;
  profit: string;
  spend: string;
  best: string;
  first_at: Date | null;
  last_at: Date | null;
}

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/**
 * Agrège les performances par stratégie, par créneau horaire et par
 * combinaison de filtres — le cœur du « qu'est-ce qui marche le mieux ».
 */
export async function computeAnalytics(): Promise<AnalyticsData> {
  const [stratRes, hourRes, filterRes, depthRes] = await Promise.all([
    db.execute(sql`
      SELECT p.strategy_id,
             COALESCE(s.name, p.strategy_name)  AS name,
             COALESCE(s.accent, 'mist')          AS accent,
             COALESCE(MAX(p.player), '—')        AS player,
             COALESCE(MAX(p.filter_signature), 'aucun filtre') AS filters,
             COUNT(*)                            AS flips,
             COUNT(*) FILTER (WHERE p.status = 'sold') AS sold,
             COALESCE(SUM(COALESCE(p.real_profit, p.profit)), 0) AS profit,
             COALESCE(SUM(p.buy_price), 0)       AS spend,
             COALESCE(MAX(COALESCE(p.real_profit, p.profit)), 0) AS best,
             MIN(p.created_at)                   AS first_at,
             MAX(p.created_at)                   AS last_at
      FROM purchases p
      LEFT JOIN strategies s ON s.id = p.strategy_id
      GROUP BY p.strategy_id, COALESCE(s.name, p.strategy_name), COALESCE(s.accent, 'mist')
      ORDER BY profit DESC
    `),
    db.execute(sql`
      SELECT EXTRACT(HOUR FROM created_at)::int AS hour,
             COUNT(*)                            AS flips,
             COALESCE(SUM(COALESCE(real_profit, profit)), 0) AS profit
      FROM purchases
      GROUP BY 1 ORDER BY 1
    `),
    db.execute(sql`
      SELECT filter_signature                    AS signature,
             COUNT(*)                            AS flips,
             COALESCE(SUM(COALESCE(real_profit, profit)), 0) AS profit
      FROM purchases
      GROUP BY 1 ORDER BY profit DESC LIMIT 8
    `),
    db.execute(sql`
      SELECT strategy_id,
             AVG(listing_count)::float AS avg_depth,
             AVG(lowest_price)::float  AS avg_lowest
      FROM market_snapshots
      GROUP BY 1
    `),
  ]);

  const depthMap = new Map<number | null, { depth: number; lowest: number | null }>();
  for (const r of depthRes.rows as unknown as Array<{
    strategy_id: number | null;
    avg_depth: number | null;
    avg_lowest: number | null;
  }>) {
    depthMap.set(r.strategy_id, {
      depth: Math.round(n(r.avg_depth) * 10) / 10,
      lowest: r.avg_lowest != null ? Math.round(n(r.avg_lowest)) : null,
    });
  }

  const rows = stratRes.rows as unknown as StratAgg[];

  const raw = rows.map((r) => {
    const flips = n(r.flips);
    const profit = n(r.profit);
    const spend = n(r.spend);
    const first = r.first_at ? new Date(r.first_at).getTime() : null;
    const last = r.last_at ? new Date(r.last_at).getTime() : null;
    // Plancher de 5 min : évite des « cr/h » absurdes sur les toutes
    // premières minutes d'une session.
    const activeMinutes =
      first != null && last != null ? Math.max(5, Math.round((last - first) / 60000)) : 5;
    const perHour = (profit / activeMinutes) * 60;
    const d = depthMap.get(r.strategy_id);
    return {
      strategyId: r.strategy_id,
      name: r.name ?? "—",
      accent: r.accent ?? "mist",
      player: r.player ?? "—",
      filters: r.filters ?? "aucun filtre",
      flips,
      sold: n(r.sold),
      profit,
      spend,
      avgProfit: flips ? Math.round(profit / flips) : 0,
      bestProfit: n(r.best),
      roi: spend ? Math.round((profit / spend) * 1000) / 10 : 0,
      profitPerHour: Math.round(perHour),
      avgDepth: d?.depth ?? 0,
      avgLowest: d?.lowest ?? null,
      activeMinutes,
      lastFlipAt: r.last_at ? new Date(r.last_at).toISOString() : null,
      score: 0,
    } satisfies StrategyStat;
  });

  // Score 0-100 : rendement horaire pondéré par la confiance (nb de flips)
  const maxPerHour = Math.max(1, ...raw.map((s) => Math.abs(s.profitPerHour)));
  const strategyStats = raw.map((s) => {
    const confidence = Math.min(1, s.flips / 10); // 10 flips = pleine confiance
    const yieldRatio = Math.max(0, s.profitPerHour) / maxPerHour;
    return { ...s, score: Math.round(yieldRatio * (0.55 + 0.45 * confidence) * 100) };
  });

  const hours: HourStat[] = (
    hourRes.rows as unknown as Array<{ hour: number; flips: string; profit: string }>
  ).map((r) => ({ hour: n(r.hour), flips: n(r.flips), profit: n(r.profit) }));

  const filters: FilterStat[] = (
    filterRes.rows as unknown as Array<{ signature: string; flips: string; profit: string }>
  ).map((r) => ({
    signature: r.signature ?? "aucun filtre",
    flips: n(r.flips),
    profit: n(r.profit),
    avgProfit: n(r.flips) ? Math.round(n(r.profit) / n(r.flips)) : 0,
  }));

  const flips = strategyStats.reduce((a, s) => a + s.flips, 0);
  const profit = strategyStats.reduce((a, s) => a + s.profit, 0);
  const spend = strategyStats.reduce((a, s) => a + s.spend, 0);
  const sold = strategyStats.reduce((a, s) => a + s.sold, 0);
  const bestHour = hours.length
    ? hours.reduce((a, b) => (b.profit > a.profit ? b : a)).hour
    : null;
  const totalMinutes = Math.max(1, ...strategyStats.map((s) => s.activeMinutes));

  return {
    strategies: strategyStats.sort((a, b) => b.score - a.score || b.profit - a.profit),
    hours,
    filters,
    totals: {
      flips,
      profit,
      spend,
      sold,
      avgProfit: flips ? Math.round(profit / flips) : 0,
      roi: spend ? Math.round((profit / spend) * 1000) / 10 : 0,
      profitPerHour: Math.round((profit / totalMinutes) * 60),
      bestHour,
    },
    bestStrategyId: strategyStats.length ? strategyStats[0].strategyId : null,
  };
}

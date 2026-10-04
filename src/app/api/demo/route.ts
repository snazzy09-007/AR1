import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { strategies } from "@/db/schema";
import {
  addLog,
  ensureSeeds,
  recordPurchase,
  recordSnapshot,
  markSold,
  updateState,
} from "@/lib/state";

export const dynamic = "force-dynamic";

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Mode démo : simule le marché pour découvrir toute la console
 * sans installer Selenium. Le client appelle POST {action:"tick"}.
 */
export async function POST(req: Request) {
  try {
    const state = await ensureSeeds();
    const body = (await req.json().catch(() => ({}))) as { action?: string };

    if (body.action === "start") {
      await updateState({
        demoMode: true,
        status: "running",
        agentStatus: "demo",
        credits: state.demoCredits,
        sessionStartedAt: new Date(),
        lastSeenAt: new Date(),
      });
      await addLog("ok", "🎬 Mode démo activé — marché simulé, aucun risque.");
      return Response.json({ ok: true });
    }

    if (body.action === "stop") {
      await updateState({ demoMode: false, agentStatus: "offline", status: "paused" });
      await addLog("info", "🎬 Mode démo arrêté.");
      return Response.json({ ok: true });
    }

    // ------------------------------ tick ------------------------------
    if (!state.demoMode || state.status !== "running") {
      return Response.json({ ok: true, skipped: true });
    }

    const pool = await db
      .select()
      .from(strategies)
      .where(and(eq(strategies.archived, false), eq(strategies.enabled, true)));
    if (pool.length === 0) return Response.json({ ok: true, skipped: true });

    const strat = pool.find((s) => s.id === state.activeStrategyId) ?? pool[0];

    // Profondeur de marché + prix plancher simulés
    const depth = Math.max(0, Math.round(rnd(0, state.floodThreshold + 2)));
    const spread = Math.max(200, Math.round(strat.buyPrice * 0.06));
    const lowest = Math.round(strat.buyPrice + rnd(-spread, spread * 1.4));
    await recordSnapshot({ strategyId: strat.id, lowestPrice: lowest, listingCount: depth });

    const loops = state.loops + Math.round(rnd(3, 9));
    let credits = state.credits ?? state.demoCredits;

    // Achat quand une carte passe sous le prix max et que le marché n'est pas saturé
    const buyable = lowest <= strat.buyPrice && depth > 0 && depth < state.floodThreshold;
    if (buyable && Math.random() < 0.45 && credits > lowest) {
      const p = await recordPurchase({
        strategyId: strat.id,
        player: strat.playerEnabled && strat.playerName ? strat.playerName : "Carte or",
        buyPrice: lowest,
        sellMin: strat.sellMin,
        sellMax: strat.sellMax,
        marketDepth: depth,
        demo: true,
      });
      credits -= lowest;
      await addLog(
        "buy",
        `🛒 [DÉMO] ${p.player} @ ${p.buyPrice.toLocaleString("fr-FR")} cr → profit est. ${p.profit.toLocaleString("fr-FR")} cr [${strat.name}]`,
      );
      // Une partie des cartes se revend dans la foulée
      if (Math.random() < 0.55) {
        const sold = await markSold(1);
        if (sold) credits += Math.round((strat.sellMax * 0.95));
      }
    } else if (Math.random() < 0.08) {
      await addLog(
        "info",
        pick([
          `📊 [DÉMO] ${depth} carte(s) listée(s), plancher ${lowest.toLocaleString("fr-FR")} cr.`,
          "♻️ [DÉMO] Rafraîchissement des critères de recherche.",
          "⏳ [DÉMO] Aucun prix intéressant sur ce passage.",
        ]),
      );
    }

    if (depth >= state.floodThreshold) {
      await addLog("warn", `⚠️ [DÉMO] Marché saturé (${depth} cartes) — prudence, dump possible.`);
    }

    await updateState({
      loops,
      refreshCount: (state.refreshCount + 1) % Math.max(20, state.refreshMaxLoops),
      incrementValue: (state.incrementValue + 1) % Math.max(1, state.maxIncrement + 1),
      nextRefreshIn: Math.max(0, state.refreshMaxLoops - state.refreshCount),
      credits,
      agentStatus: "demo",
      lastSeenAt: new Date(),
    });

    return Response.json({ ok: true });
  } catch (e) {
    console.error("[api/demo]", e);
    return Response.json({ ok: false, error: "Erreur interne" }, { status: 500 });
  }
}

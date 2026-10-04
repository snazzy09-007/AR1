import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { authorizeAgent, unauthorized } from "@/lib/agent";
import {
  addLog,
  ensureSeeds,
  markSold,
  recordPurchase,
  recordSnapshot,
  updateState,
} from "@/lib/state";

export const dynamic = "force-dynamic";

interface AgentEvent {
  type?: string;
  level?: string;
  message?: string;
  status?: string;
  player?: string;
  strategyId?: unknown;
  buyPrice?: unknown;
  sellMin?: unknown;
  sellMax?: unknown;
  marketDepth?: unknown;
  lowestPrice?: unknown;
  listingCount?: unknown;
  credits?: unknown;
  loops?: unknown;
  refreshCount?: unknown;
  incrementValue?: unknown;
  nextRefreshIn?: unknown;
  count?: unknown;
  platform?: string;
  version?: string;
  name?: string;
}

const LOG_LEVELS = new Set(["info", "ok", "warn", "error", "buy", "sale"]);
const num = (v: unknown): number | undefined => {
  const x = Math.round(Number(v));
  return Number.isFinite(x) ? x : undefined;
};

async function handleEvent(ev: AgentEvent, agentId?: number) {
  switch (ev.type) {
    case "log":
      if (ev.message) {
        await addLog(LOG_LEVELS.has(ev.level ?? "") ? ev.level! : "info", ev.message);
      }
      return;

    case "purchase": {
      const buyPrice = num(ev.buyPrice);
      if (buyPrice == null) return;
      const p = await recordPurchase({
        strategyId: num(ev.strategyId) ?? null,
        player: ev.player ?? "Carte",
        buyPrice,
        sellMin: num(ev.sellMin) ?? null,
        sellMax: num(ev.sellMax) ?? null,
        marketDepth: num(ev.marketDepth) ?? null,
      });
      await addLog(
        "buy",
        `🛒 ${p.player} @ ${p.buyPrice.toLocaleString("fr-FR")} cr → relisté ${
          p.sellMax?.toLocaleString("fr-FR") ?? "?"
        } · profit est. ${p.profit.toLocaleString("fr-FR")} cr [${p.strategyName}]`,
      );
      return;
    }

    case "snapshot": {
      const count = num(ev.listingCount);
      if (count == null) return;
      await recordSnapshot({
        strategyId: num(ev.strategyId) ?? null,
        lowestPrice: num(ev.lowestPrice) ?? null,
        listingCount: count,
      });
      return;
    }

    case "sale": {
      const count = num(ev.count) ?? 1;
      const sold = await markSold(count, num(ev.buyPrice) ?? null);
      if (sold > 0) await addLog("sale", `💸 ${sold} carte(s) vendue(s) détectée(s).`);
      return;
    }

    case "heartbeat": {
      const patch: Record<string, unknown> = { lastSeenAt: new Date() };
      if (typeof ev.status === "string") patch.agentStatus = ev.status;
      for (const key of [
        "credits",
        "loops",
        "refreshCount",
        "incrementValue",
        "nextRefreshIn",
      ] as const) {
        const v = num(ev[key]);
        if (v !== undefined) patch[key] = v;
      }
      await updateState(patch);
      if (agentId && (ev.platform || ev.version || ev.name)) {
        await db
          .update(agents)
          .set({
            platform: ev.platform?.slice(0, 60) ?? undefined,
            version: ev.version?.slice(0, 20) ?? undefined,
            name: ev.name?.slice(0, 40) ?? undefined,
            lastSeenAt: new Date(),
          })
          .where(eq(agents.id, agentId));
      }
      return;
    }

    case "market_flood":
      await updateState({ status: "paused", agentStatus: "paused" });
      await addLog("warn", ev.message ?? "⏸ Pause auto : marché saturé (dump suspecté).");
      return;

    case "buy_limit":
      await updateState({ status: "paused", agentStatus: "paused" });
      await addLog("warn", ev.message ?? "⏸ Pause auto : limite d'achats atteinte.");
      return;

    case "low_credits":
      await updateState({ status: "paused", agentStatus: "paused" });
      await addLog("warn", ev.message ?? "⏸ Pause auto : plancher de crédits atteint.");
      return;

    default:
      return;
  }
}

export async function POST(req: Request) {
  const auth = await authorizeAgent(req);
  if (!auth.ok) return unauthorized();

  try {
    await ensureSeeds();
    const body = (await req.json()) as { events?: AgentEvent[] } & AgentEvent;
    const events = Array.isArray(body.events) ? body.events : [body];
    for (const ev of events.slice(0, 60)) await handleEvent(ev, auth.agentId);
    await updateState({ lastSeenAt: new Date() });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[api/agent/report]", e);
    return Response.json({ ok: false, error: "Erreur interne" }, { status: 500 });
  }
}

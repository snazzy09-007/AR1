import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { botState, strategies } from "@/db/schema";
import { authorizeAgent, unauthorized } from "@/lib/agent";
import { pickEngineConfig } from "@/lib/config";
import {
  addLog,
  drainCommands,
  ensureSeeds,
  serializeStrategy,
  STATE_ID,
  updateState,
} from "@/lib/state";

export const dynamic = "force-dynamic";

/**
 * Sync agent ← console : moteur, stratégie active, commandes.
 * Gère aussi la rotation A/B automatique entre stratégies actives.
 */
export async function GET(req: Request) {
  const auth = await authorizeAgent(req);
  if (!auth.ok) return unauthorized();

  try {
    let state = await ensureSeeds();

    const pool = await db
      .select()
      .from(strategies)
      .where(and(eq(strategies.archived, false), eq(strategies.enabled, true)))
      .orderBy(strategies.id);

    // ---- Rotation automatique (test A/B des stratégies) ----
    if (state.rotateEnabled && pool.length > 1) {
      const last = state.lastRotationAt?.getTime() ?? 0;
      if (Date.now() - last > state.rotateEveryMin * 60_000) {
        const idx = pool.findIndex((s) => s.id === state.activeStrategyId);
        const next = pool[(idx + 1) % pool.length];
        state = await updateState({
          activeStrategyId: next.id,
          lastRotationAt: new Date(),
        });
        await addLog("info", `🔁 Rotation A/B → stratégie « ${next.name} ».`);
      }
    }

    const active =
      pool.find((s) => s.id === state.activeStrategyId) ?? pool[0] ?? null;
    if (active && active.id !== state.activeStrategyId) {
      state = await updateState({ activeStrategyId: active.id });
    }

    const commands = await drainCommands();

    await db
      .update(botState)
      .set({ lastSeenAt: new Date() })
      .where(eq(botState.id, STATE_ID));

    return Response.json({
      ok: true,
      engine: pickEngineConfig(state),
      strategy: active ? serializeStrategy(active) : null,
      commands,
      ts: Date.now(),
    });
  } catch (e) {
    console.error("[api/agent/poll]", e);
    return Response.json({ ok: false, error: "Erreur interne" }, { status: 500 });
  }
}

import { sanitizeEngine } from "@/lib/config";
import {
  addLog,
  enqueueCommand,
  ensureSeeds,
  getStrategy,
  markSold,
  resetStats,
  updateState,
} from "@/lib/state";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureSeeds();
    const body = (await req.json()) as {
      action?: string;
      config?: Record<string, unknown>;
      strategyId?: number;
      count?: number;
      hard?: boolean;
    };

    switch (body.action) {
      case "update_engine": {
        const clean = sanitizeEngine(body.config ?? {});
        if (Object.keys(clean).length === 0) {
          return Response.json({ ok: false, error: "Aucune valeur valide" }, { status: 400 });
        }
        await updateState(clean);
        await addLog("info", "⚙ Réglages moteur mis à jour.");
        return Response.json({ ok: true });
      }

      case "activate_strategy": {
        const strat = await getStrategy(Number(body.strategyId));
        if (!strat) {
          return Response.json({ ok: false, error: "Stratégie introuvable" }, { status: 404 });
        }
        await updateState({ activeStrategyId: strat.id, lastRotationAt: new Date() });
        await enqueueCommand("reload_strategy");
        await addLog("ok", `🎯 Stratégie active : « ${strat.name} ».`);
        return Response.json({ ok: true });
      }

      case "pause":
        await updateState({ status: "paused" });
        await enqueueCommand("pause");
        await addLog("warn", "⏸ Pause demandée depuis la console.");
        return Response.json({ ok: true });

      case "resume":
        await updateState({ status: "running", sessionStartedAt: new Date() });
        await enqueueCommand("resume");
        await addLog("ok", "▶ Reprise demandée depuis la console.");
        return Response.json({ ok: true });

      case "stop":
        await updateState({ status: "stopped", demoMode: false });
        await enqueueCommand("stop");
        await addLog("error", "⏹ Arrêt demandé depuis la console.");
        return Response.json({ ok: true });

      case "refresh_now":
        await enqueueCommand("refresh_now");
        await addLog("info", "🔄 Rafraîchissement manuel demandé.");
        return Response.json({ ok: true });

      case "restart_driver":
        await enqueueCommand("restart_driver");
        await addLog("warn", "♻ Redémarrage du navigateur demandé.");
        return Response.json({ ok: true });

      case "mark_sold": {
        const sold = await markSold(Number(body.count ?? 1));
        await addLog("sale", `💸 ${sold} carte(s) marquée(s) comme vendue(s).`);
        return Response.json({ ok: true, sold });
      }

      case "reset_stats":
        await resetStats(body.hard === true);
        await enqueueCommand("reset_stats");
        await addLog(
          "info",
          body.hard ? "🧹 Historique complet effacé." : "🧹 Statistiques de session remises à zéro.",
        );
        return Response.json({ ok: true });

      default:
        return Response.json({ ok: false, error: "Action inconnue" }, { status: 400 });
    }
  } catch (e) {
    console.error("[api/control]", e);
    return Response.json({ ok: false, error: "Erreur interne" }, { status: 500 });
  }
}

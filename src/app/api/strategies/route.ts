import { eq } from "drizzle-orm";
import { db } from "@/db";
import { strategies } from "@/db/schema";
import { sanitizeStrategy } from "@/lib/config";
import {
  addLog,
  enqueueCommand,
  ensureSeeds,
  listStrategies,
  serializeStrategy,
  updateState,
} from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeds();
    const rows = await listStrategies();
    return Response.json({ ok: true, strategies: rows.map(serializeStrategy) });
  } catch (e) {
    console.error("[api/strategies GET]", e);
    return Response.json({ ok: false, error: "Erreur interne" }, { status: 500 });
  }
}

// Création (ou duplication via sourceId)
export async function POST(req: Request) {
  try {
    const state = await ensureSeeds();
    const body = (await req.json()) as Record<string, unknown> & { sourceId?: number };

    let values: Record<string, unknown>;
    if (body.sourceId) {
      const [src] = await db
        .select()
        .from(strategies)
        .where(eq(strategies.id, Number(body.sourceId)));
      if (!src) {
        return Response.json({ ok: false, error: "Source introuvable" }, { status: 404 });
      }
      const { id: _id, createdAt: _c, ...rest } = src;
      void _id;
      void _c;
      values = { ...rest, name: `${src.name} (copie)`.slice(0, 48) };
    } else {
      values = sanitizeStrategy(body);
    }

    const [created] = await db.insert(strategies).values(values as never).returning();
    if (state.activeStrategyId == null) {
      await updateState({ activeStrategyId: created.id });
    }
    await addLog("ok", `➕ Stratégie « ${created.name} » créée.`);
    return Response.json({ ok: true, strategy: serializeStrategy(created) });
  } catch (e) {
    console.error("[api/strategies POST]", e);
    return Response.json({ ok: false, error: "Erreur interne" }, { status: 500 });
  }
}

// Mise à jour
export async function PATCH(req: Request) {
  try {
    await ensureSeeds();
    const body = (await req.json()) as Record<string, unknown> & { id?: number };
    const id = Number(body.id);
    if (!id) return Response.json({ ok: false, error: "id manquant" }, { status: 400 });

    const patch = sanitizeStrategy(body, true);
    if (Object.keys(patch).length === 0) {
      return Response.json({ ok: false, error: "Rien à mettre à jour" }, { status: 400 });
    }

    const [row] = await db
      .update(strategies)
      .set(patch as never)
      .where(eq(strategies.id, id))
      .returning();
    if (!row) return Response.json({ ok: false, error: "Introuvable" }, { status: 404 });

    await enqueueCommand("reload_strategy");
    await addLog("info", `✏️ Stratégie « ${row.name} » mise à jour.`);
    return Response.json({ ok: true, strategy: serializeStrategy(row) });
  } catch (e) {
    console.error("[api/strategies PATCH]", e);
    return Response.json({ ok: false, error: "Erreur interne" }, { status: 500 });
  }
}

// Archivage (on garde l'historique pour les analytics)
export async function DELETE(req: Request) {
  try {
    const state = await ensureSeeds();
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return Response.json({ ok: false, error: "id manquant" }, { status: 400 });

    const [row] = await db
      .update(strategies)
      .set({ archived: true, enabled: false })
      .where(eq(strategies.id, id))
      .returning();
    if (!row) return Response.json({ ok: false, error: "Introuvable" }, { status: 404 });

    if (state.activeStrategyId === id) {
      const remaining = await listStrategies();
      await updateState({ activeStrategyId: remaining[0]?.id ?? null });
    }
    await addLog("warn", `🗑 Stratégie « ${row.name} » archivée (stats conservées).`);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[api/strategies DELETE]", e);
    return Response.json({ ok: false, error: "Erreur interne" }, { status: 500 });
  }
}

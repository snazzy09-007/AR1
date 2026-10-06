import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { newToken } from "@/lib/agent";
import { addLog, AGENT_ONLINE_WINDOW_MS } from "@/lib/state";

export const dynamic = "force-dynamic";

// Appairage en 1 clic : token autosigné — valide même sans lecture en base.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const name = (body.name ?? "Mon PC").toString().trim().slice(0, 40) || "Mon PC";

    // L'id est nécessaire pour construire la signature du token
    const provisional = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const [row] = await db.insert(agents).values({ token: provisional, name }).returning();
    const token = newToken(row.id);
    const [updated] = await db
      .update(agents)
      .set({ token })
      .where(eq(agents.id, row.id))
      .returning();

    await addLog("ok", `🔗 Nouvel agent appairé : « ${name} ».`);
    return Response.json({
      ok: true,
      agent: { id: updated.id, name: updated.name, token: updated.token },
    });
  } catch (e) {
    console.error("[api/agents POST]", e);
    return Response.json({ ok: false, error: "Erreur interne" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const rows = await db.select().from(agents).orderBy(desc(agents.id)).limit(10);
    return Response.json({
      ok: true,
      agents: rows.map((a) => ({
        id: a.id,
        name: a.name,
        platform: a.platform,
        version: a.version,
        lastSeenAt: a.lastSeenAt?.toISOString() ?? null,
        online:
          a.lastSeenAt != null &&
          Date.now() - a.lastSeenAt.getTime() < AGENT_ONLINE_WINDOW_MS,
        tokenPreview: `${a.token.slice(0, 6)}…${a.token.slice(-4)}`,
      })),
    });
  } catch (e) {
    console.error("[api/agents GET]", e);
    return Response.json({ ok: false, error: "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return Response.json({ ok: false, error: "id manquant" }, { status: 400 });
    await db.update(agents).set({ revoked: true }).where(eq(agents.id, id));
    await addLog("warn", "🔌 Agent révoqué.");
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[api/agents DELETE]", e);
    return Response.json({ ok: false, error: "Erreur interne" }, { status: 500 });
  }
}

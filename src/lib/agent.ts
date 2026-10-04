import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agents } from "@/db/schema";

export function newToken() {
  return `sfc_${randomBytes(18).toString("base64url")}`;
}

/**
 * Vérifie la clé : token d'appairage individuel en base, ou AGENT_SECRET si
 * l'administrateur a volontairement activé cette compatibilité legacy.
 * Il n'existe aucune clé globale par défaut en production.
 */
export async function authorizeAgent(
  req: Request,
): Promise<{ ok: boolean; agentId?: number }> {
  const key =
    req.headers.get("x-agent-key") ??
    new URL(req.url).searchParams.get("token") ??
    "";
  if (!key) return { ok: false };

  const legacySecret = process.env.AGENT_SECRET;
  if (legacySecret && key === legacySecret) return { ok: true };

  const [row] = await db.select().from(agents).where(eq(agents.token, key));
  if (!row) return { ok: false };

  await db.update(agents).set({ lastSeenAt: new Date() }).where(eq(agents.id, row.id));
  return { ok: true, agentId: row.id };
}

export function unauthorized() {
  return Response.json(
    { ok: false, error: "Clé d'agent invalide — regénère ton launcher depuis la console." },
    { status: 401 },
  );
}

/** Base URL publique utilisée pour générer les launchers auto-configurés. */
export function publicBaseUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  // Vercel fournit ces deux en-têtes sur toutes les fonctions serverless.
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    "localhost:3000";
  return `${proto}://${host}`;
}

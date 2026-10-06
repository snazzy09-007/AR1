import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agents } from "@/db/schema";

/**
 * Tokens autosignés HMAC : l'authentification de l'agent ne dépend jamais
 * d'une lecture en base (robuste aux désynchronisations serveur/DB),
 * tout en restant révocable via le flag `revoked` en base.
 */
const TOKEN_SECRET =
  process.env.AGENT_TOKEN_SECRET ??
  process.env.AGENT_SECRET ??
  "sniperfc-dev-signing-secret";

function sign(subject: string): string {
  return createHmac("sha256", TOKEN_SECRET)
    .update(subject)
    .digest("base64url")
    .slice(0, 22);
}

export function newToken(agentId: number): string {
  const base = `sfc_${agentId}_${randomBytes(10).toString("base64url")}`;
  return `${base}.${sign(base)}`;
}

export function verifySignedToken(token: string): number | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const base = token.slice(0, dot);
  const sig = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(base));
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  const m = /^sfc_(\d+)_/.exec(base);
  if (!m) return null;
  return Number(m[1]);
}

/**
 * Vérifie la clé d'un agent. Ordre :
 *  1. token en base (chemin historique)
 *  2. token autosigné (chemin principal — aucune lecture requise)
 *  3. AGENT_SECRET legacy (si l'admin l'a activée)
 */
export async function authorizeAgent(
  req: Request,
): Promise<{ ok: boolean; agentId?: number }> {
  const key =
    req.headers.get("x-agent-key") ??
    new URL(req.url).searchParams.get("token") ??
    "";
  if (!key) return { ok: false };

  // 1) token référencé en base
  try {
    const [row] = await db.select().from(agents).where(eq(agents.token, key));
    if (row) {
      if (row.revoked) return { ok: false };
      await db
        .update(agents)
        .set({ lastSeenAt: new Date() })
        .where(eq(agents.id, row.id));
      return { ok: true, agentId: row.id };
    }
  } catch {
    /* base indisponible → on tente quand même la signature */
  }

  // 2) token autosigné : vérifiable hors base, avec révocation possible
  const signedId = verifySignedToken(key);
  if (signedId != null) {
    try {
      const [row] = await db
        .select({ id: agents.id, revoked: agents.revoked })
        .from(agents)
        .where(eq(agents.id, signedId));
      if (row?.revoked) return { ok: false };
      await db
        .update(agents)
        .set({ lastSeenAt: new Date() })
        .where(eq(agents.id, signedId));
    } catch {
      /* base indisponible : la signature valide suffit */
    }
    return { ok: true, agentId: signedId };
  }

  // 3) compatibilité legacy
  const legacySecret = process.env.AGENT_SECRET;
  if (legacySecret && key === legacySecret) return { ok: true };

  return { ok: false };
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

import { readFile } from "fs/promises";
import path from "path";
import { publicBaseUrl } from "@/lib/agent";

export const dynamic = "force-dynamic";

/**
 * Sert fut_agent.py avec BASE_URL et le token déjà injectés :
 * l'utilisateur n'a plus rien à éditer, il double-clique.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = (
    url.searchParams.get("token") ??
    req.headers.get("x-agent-key") ??
    ""
  ).slice(0, 200);
  const profile = url.searchParams.get("profile") ?? "";
  const base = publicBaseUrl(req);

  let template: string;
  try {
    template = await readFile(
      path.join(process.cwd(), "public", "agent", "fut_agent.py"),
      "utf8",
    );
  } catch {
    return new Response("# Agent introuvable sur le serveur.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const pyStr = (v: string) => JSON.stringify(v); // échappe proprement pour Python

  const configured = template
    .replace(/^BASE_URL = .*$/m, `BASE_URL = ${pyStr(base)}`)
    .replace(/^AGENT_KEY = .*$/m, `AGENT_KEY = ${pyStr(token || "dev-agent-key")}`)
    .replace(
      /^CHROME_PROFILE = .*$/m,
      profile ? `CHROME_PROFILE = ${pyStr(profile)}` : "CHROME_PROFILE = \"\"",
    );

  // Garanties serveur : le fichier doit être 100% ASCII et contenir le
  // marqueur d'intégrité, sinon on refuse de servir un contenu corrompu.
  if (!/^[\x00-\x7F]*$/.test(configured) || !configured.includes("SNIPERFC-AGENT-OK")) {
    console.error("[agent/download] gabarit invalide détecté, refus de servir");
    return new Response("# Gabarit d'agent invalide cote serveur.\n", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(configured, {
    headers: {
      "Content-Type": "text/x-python; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fut_agent.py"',
      "Cache-Control": "no-store",
    },
  });
}

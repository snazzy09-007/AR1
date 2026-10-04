import { readFile } from "fs/promises";
import path from "path";
import { publicBaseUrl } from "@/lib/agent";

export const dynamic = "force-dynamic";

const AGENT_FILENAME = "sniperfc_agent_v4.py";
const AGENT_MARKER = "SNIPERFC-AGENT-V4-OK";

/** Sert un agent V4 neuf avec URL et token déjà injectés. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = (
    url.searchParams.get("token") ??
    req.headers.get("x-agent-key") ??
    ""
  ).slice(0, 200);
  const profile = url.searchParams.get("profile") ?? "";
  const base = publicBaseUrl(req);

  if (!token) {
    return Response.json(
      { ok: false, error: "Token manquant. Regenere un launcher depuis la console." },
      { status: 400 },
    );
  }

  let template: string;
  try {
    template = await readFile(
      path.join(process.cwd(), "public", "agent", AGENT_FILENAME),
      "utf8",
    );
  } catch (error) {
    console.error("[agent/download] lecture impossible", error);
    return new Response("# Agent V4 introuvable sur le serveur.\n", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const pyStr = (value: string) => JSON.stringify(value);
  const configured = template
    .replace(/^BASE_URL = .*$/m, `BASE_URL = ${pyStr(base)}`)
    .replace(/^AGENT_KEY = .*$/m, `AGENT_KEY = ${pyStr(token)}`)
    .replace(
      /^CHROME_PROFILE = .*$/m,
      profile ? `CHROME_PROFILE = ${pyStr(profile)}` : 'CHROME_PROFILE = ""',
    );

  if (!/^[\x00-\x7F]*$/.test(configured) || !configured.includes(AGENT_MARKER)) {
    console.error("[agent/download] agent V4 invalide");
    return new Response("# Agent V4 invalide cote serveur.\n", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(configured, {
    headers: {
      "Content-Type": "text/x-python; charset=utf-8",
      "Content-Disposition": `attachment; filename="${AGENT_FILENAME}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

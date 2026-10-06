import { publicBaseUrl } from "@/lib/agent";
import { AGENT_FILENAME, buildConfiguredSource } from "@/lib/agent-source";

export const dynamic = "force-dynamic";

/** Téléchargement direct du moteur V5 (plan B / debug) — URL + token injectés. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = (
    url.searchParams.get("token") ??
    req.headers.get("x-agent-key") ??
    ""
  ).slice(0, 200);
  const profile = url.searchParams.get("profile") ?? "";

  if (!token) {
    return Response.json(
      { ok: false, error: "Token manquant. Regenere un launcher depuis la console." },
      { status: 400 },
    );
  }

  try {
    const source = await buildConfiguredSource(publicBaseUrl(req), token, profile);
    return new Response(source, {
      headers: {
        "Content-Type": "text/x-python; charset=utf-8",
        "Content-Disposition": `attachment; filename="${AGENT_FILENAME}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[agent/download]", e);
    return new Response("# Agent V5 introuvable sur le serveur.\n", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

import { readFile } from "fs/promises";
import path from "path";

export const AGENT_FILENAME = "sniperfc_agent_v5.py";
export const AGENT_MARKER = "SNIPERFC-AGENT-V5-OK";

const pyStr = (v: string) => JSON.stringify(v);

/**
 * Lit le gabarit V5 et y injecte URL + token : produit la source Python finale,
 * garantie ASCII et stampée du marqueur d'intégrité.
 */
export async function buildConfiguredSource(
  baseUrl: string,
  token: string,
  profile = "",
): Promise<string> {
  let template: string;
  try {
    template = await readFile(
      path.join(process.cwd(), "public", "agent", AGENT_FILENAME),
      "utf8",
    );
  } catch (e) {
    console.error("[agent-source] gabarit introuvable", e);
    throw new Error("Gabarit agent introuvable sur le serveur");
  }

  const configured = template
    .replace(/^BASE_URL = .*$/m, `BASE_URL = ${pyStr(baseUrl)}`)
    .replace(/^AGENT_KEY = .*$/m, `AGENT_KEY = ${pyStr(token)}`)
    .replace(
      /^CHROME_PROFILE = .*$/m,
      profile ? `CHROME_PROFILE = ${pyStr(profile)}` : 'CHROME_PROFILE = ""',
    );

  if (!/^[\x00-\x7F]*$/.test(configured) || !configured.includes(AGENT_MARKER)) {
    throw new Error("Gabarit agent invalide (ASCII ou marqueur manquant)");
  }
  return configured;
}

/** encode ASCII → base64 standard, découpé en lignes de 64 colonnes. */
export function toBase64Lines(buffer: Buffer): string[] {
  const b64 = buffer.toString("base64");
  const out: string[] = [];
  for (let i = 0; i < b64.length; i += 64) out.push(b64.slice(i, i + 64));
  return out;
}

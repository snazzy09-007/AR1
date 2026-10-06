import { publicBaseUrl } from "@/lib/agent";
import { buildConfiguredSource, toBase64Lines } from "@/lib/agent-source";

export const dynamic = "force-dynamic";

/**
 * Launcher AUTO-EXTRACTIBLE : la source complète de l'agent est embarquée
 * dans ce fichier (base64, à la toute fin). Zéro téléchargement réseau
 * côté machine — le navigateur est le seul point d'entrée.
 *
 * Le `.bat` s'auto-extrait avec `more +N "%~f0"` : on zap les N premières
 * lignes (le script), le reste = la charge Python. N est calculé et
 * injecté ici, au moment de la génération.
 */
async function buildWindowsLauncher(base: string, token: string) {
  const source = await buildConfiguredSource(base, token, "");
  const payload = toBase64Lines(Buffer.from(source, "ascii"));

  const pre: string[] = [
    "@echo off",
    "setlocal EnableExtensions",
    "chcp 65001 >nul",
    "title SNIPER FC",
    "",
    'set "SERVER=__BASE_URL__"',
    'set "TOKEN=__TOKEN__"',
    'set "FOLDER=%USERPROFILE%\\SNIPERFC_V5"',
    'set "AGENT=sniperfc_agent_v5.py"',
    "",
    'if not exist "%FOLDER%" mkdir "%FOLDER%"',
    'cd /d "%FOLDER%"',
    "",
    "echo.",
    "echo   SNIPER FC - tout-en-un",
    "echo   Ce fichier contient tout. Aucun autre telechargement.",
    "echo   Dossier : %FOLDER%",
    "echo.",
    "",
    "where python >nul 2>nul",
    "if errorlevel 1 goto no_python",
    "",
    "echo [1/3] Verification des dependances...",
    "python -m pip install --quiet --disable-pip-version-check selenium requests",
    "if errorlevel 1 goto pip_error",
    "",
    "echo [2/3] Extraction du moteur embarque...",
    'if exist "%AGENT%" del /f /q "%AGENT%"',
    'more +__SKIP__ "%~f0" > agent.b64',
    'python -c "import base64,pathlib;pathlib.Path(\'sniperfc_agent_v5.py\').write_bytes(base64.b64decode(pathlib.Path(\'agent.b64\').read_bytes()))"',
    "if errorlevel 1 goto extract_error",
    "del /f /q agent.b64 >nul 2>nul",
    'if not exist "%AGENT%" goto extract_error',
    'python -c "src=open(\'sniperfc_agent_v5.py\',\'rb\').read().decode(\'ascii\',\'strict\');assert \'SNIPERFC-AGENT-V5-OK\' in src;compile(src,\'agent\',\'exec\');print(\'  Moteur valide.\')"',
    "if errorlevel 1 goto corrupt_error",
    "",
    "echo [3/3] Lancement. Chrome va s'ouvrir tout seul.",
    "echo.",
    'python "%AGENT%"',
    "goto end",
    "",
    ":no_python",
    "echo.",
    "echo [ERREUR] Python n'est pas installe.",
    "echo Installe-le sur https://www.python.org/downloads/",
    'echo en cochant "Add python.exe to PATH".',
    "goto end",
    "",
    ":pip_error",
    "echo.",
    "echo [ERREUR] pip n'a pas pu installer selenium/requests.",
    "goto end",
    "",
    ":extract_error",
    "echo.",
    "echo [ERREUR] Extraction du moteur impossible.",
    "goto end",
    "",
    ":corrupt_error",
    "echo.",
    "echo [ERREUR] Le moteur extrait est invalide.",
    "goto end",
    "",
    ":end",
    "echo.",
    "echo Termine. Tu peux fermer cette fenetre.",
    "pause >nul",
    "exit /b",
  ];

  const skip = pre.length; // nombre de lignes de script AVANT la charge utile
  const header = pre
    .map((l) => l.replaceAll("__SKIP__", String(skip)))
    .join("\r\n");

  return header + "\r\n" + payload.join("\r\n");
}

async function buildUnixLauncher(base: string, token: string) {
  const source = await buildConfiguredSource(base, token, "");
  const payload = toBase64Lines(Buffer.from(source, "ascii"));

  const lines = [
    "#!/usr/bin/env bash",
    "set -e",
    'APP="$HOME/SNIPERFC_V5"',
    'AGENT="sniperfc_agent_v5.py"',
    'mkdir -p "$APP" && cd "$APP"',
    'PY=python3',
    'command -v "$PY" >/dev/null 2>&1 || PY=python',
    'command -v "$PY" >/dev/null 2>&1 || { echo "Python introuvable"; exit 1; }',
    'echo "[1/3] Verification des dependances..."',
    '"$PY" -m pip install --quiet --disable-pip-version-check selenium requests',
    'echo "[2/3] Extraction du moteur embarque..."',
    '"$PY" - <<\'PYEOF\'',
    "import base64, pathlib",
    "payload = \"\"\"__PAYLOAD__\"\"\"",
    'pathlib.Path("sniperfc_agent_v5.py").write_bytes(base64.b64decode(payload))',
    "PYEOF",
    '"$PY" -c "src=open(\'sniperfc_agent_v5.py\',\'rb\').read().decode(\'ascii\',\'strict\');assert \'SNIPERFC-AGENT-V5-OK\' in src;compile(src,\'agent\',\'exec\');print(\'  Moteur valide.\')"',
    'echo "[3/3] Lancement. Chrome va s\'ouvrir."',
    '"$PY" sniperfc_agent_v5.py',
  ];

  const body = lines.join("\n");
  return body.replace("__PAYLOAD__", payload.join("\n"));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token")?.slice(0, 200);
    const unix = url.searchParams.get("os") === "unix";

    if (!token) {
      return Response.json({ ok: false, error: "Token manquant" }, { status: 400 });
    }

    const base = publicBaseUrl(req);

    if (unix) {
      const sh = await buildUnixLauncher(base, token);
      return new Response(sh, {
        headers: {
          "Content-Type": "application/x-sh; charset=utf-8",
          "Content-Disposition": 'attachment; filename="SniperFC_V5.sh"',
          "Cache-Control": "no-store",
        },
      });
    }

    const bat = await buildWindowsLauncher(base, token);
    return new Response(bat, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": 'attachment; filename="SniperFC_V5.bat"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[agent/launcher]", e);
    return new Response("# Impossible de generer le launcher.\n", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

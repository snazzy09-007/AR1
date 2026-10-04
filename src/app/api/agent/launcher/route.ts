import { publicBaseUrl } from "@/lib/agent";

export const dynamic = "force-dynamic";

const WIN_BAT = `@echo off
setlocal EnableExtensions
chcp 65001 >nul
title SNIPER FC - Agent

REM -------------------------------------------------------------
REM Launcher auto-configure SNIPER FC - version avec controle
REM d'integrite : impossible d'executer un fichier corrompu.
REM -------------------------------------------------------------
set "BASE_URL=__BASE_URL__"
set "AGENT_KEY=__TOKEN__"
set "APP_DIR=%USERPROFILE%\\sniperfc"

if not exist "%APP_DIR%" mkdir "%APP_DIR%"
cd /d "%APP_DIR%"

echo.
echo   === SNIPER FC - connexion de l'agent ===
echo.
echo URL console : %BASE_URL%
echo Dossier     : %CD%
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Python n'est pas installe ou pas dans le PATH.
  echo Installe-le sur https://www.python.org/downloads/
  echo IMPORTANT : coche "Add python.exe to PATH" pendant l'installation.
  pause
  exit /b 1
)

echo [1/4] Installation des dependances Python...
python -m pip install --upgrade selenium requests
if errorlevel 1 (
  echo [ERREUR] pip a echoue.
  pause
  exit /b 1
)

echo [2/4] Telechargement de l'agent...
REM Supprime tout ancien fichier corrompu AVANT de telecharger
if exist fut_agent.py del /f /q fut_agent.py

if exist "%SystemRoot%\\System32\\curl.exe" (
  curl -fsSL "%BASE_URL%/api/agent/download" -H "x-agent-key: %AGENT_KEY%" -o fut_agent.py
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri '%BASE_URL%/api/agent/download' -Headers @{'x-agent-key'='%AGENT_KEY%'} -OutFile 'fut_agent.py'"
)
if errorlevel 1 goto download_failed
if not exist fut_agent.py goto download_failed

echo [3/4] Controle du fichier telecharge...
findstr /C:"SNIPERFC-AGENT-OK" fut_agent.py >nul 2>nul
if errorlevel 1 goto file_failed
python -m py_compile fut_agent.py >nul 2>nul
if errorlevel 1 goto file_failed
echo        Fichier valide.

echo [4/4] Lancement. Garde cette fenetre ouverte.
echo.
python fut_agent.py
echo.
echo Agent arrete.
pause
exit /b 0

:download_failed
echo.
echo [ERREUR] Telechargement impossible.
echo   1. Verifie ta connexion internet
echo   2. Regenere le launcher depuis la console, onglet Connexion
pause
exit /b 1

:file_failed
echo.
echo [ERREUR] Le fichier telecharge est invalide ou corrompu.
echo Solutions :
echo   1. Supprime le dossier %APP_DIR% puis relance ce fichier
echo   2. Si tu as deja un fut_agent.py ailleurs ^(Bureau, Downloads, racine du profil^), supprime-le
echo   3. Regenere le launcher depuis la console
pause
exit /b 1
`;

const UNIX_SH = `#!/usr/bin/env bash
# -------------------------------------------------------------
# Launcher auto-configure SNIPER FC avec controle d'integrite
# -------------------------------------------------------------
set -euo pipefail

BASE_URL="__BASE_URL__"
AGENT_KEY="__TOKEN__"
APP_DIR="$HOME/sniperfc"

mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo ""
echo "=== SNIPER FC - connexion de l'agent ==="
echo ""
echo "URL console : $BASE_URL"

PY="python3"
command -v "$PY" >/dev/null 2>&1 || PY="python"
command -v "$PY" >/dev/null 2>&1 || { echo "[ERREUR] Python introuvable."; exit 1; }

echo "[1/4] Installation des dependances Python..."
"$PY" -m pip install --upgrade selenium requests

echo "[2/4] Telechargement de l'agent..."
rm -f fut_agent.py
curl -fsSL "$BASE_URL/api/agent/download" \\
  -H "x-agent-key: $AGENT_KEY" \\
  -o fut_agent.py

echo "[3/4] Controle du fichier telecharge..."
grep -q "SNIPERFC-AGENT-OK" fut_agent.py || { echo "[ERREUR] Fichier invalide - regenere le launcher."; exit 1; }
"$PY" -m py_compile fut_agent.py || { echo "[ERREUR] Fichier corrompu - supprime $APP_DIR et recommence."; exit 1; }
echo "       Fichier valide."

echo "[4/4] Lancement. Garde cette fenetre ouverte."
echo ""
"$PY" fut_agent.py
`;

function respond(body: string, filename: string, contentType: string) {
  return new Response(body, {
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.slice(0, 200);
  const os = url.searchParams.get("os") === "unix" ? "unix" : "win";
  const base = publicBaseUrl(req);

  if (!token) {
    return Response.json(
      { ok: false, error: "Token manquant — régénère le launcher depuis l'onglet Connexion." },
      { status: 400 },
    );
  }

  const body = (os === "unix" ? UNIX_SH : WIN_BAT)
    .replaceAll("__BASE_URL__", base)
    .replaceAll("__TOKEN__", token);

  if (os === "unix") return respond(body, "SniperFC.sh", "application/x-sh");
  return respond(body, "SniperFC.bat", "application/octet-stream");
}

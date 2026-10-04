import { publicBaseUrl } from "@/lib/agent";

export const dynamic = "force-dynamic";

const WINDOWS_LAUNCHER = `@echo off
setlocal
chcp 65001 >nul
title SNIPER FC V4

set "SERVER=__BASE_URL__"
set "TOKEN=__TOKEN__"
set "FOLDER=%USERPROFILE%\\SNIPERFC_V4"
set "AGENT=sniperfc_agent_v4.py"

if not exist "%FOLDER%" mkdir "%FOLDER%"
cd /d "%FOLDER%"

echo.
echo SNIPER FC V4
echo Dossier neuf : %FOLDER%
echo.

where python >nul 2>nul
if errorlevel 1 goto no_python

echo [1/3] Installation de Selenium...
python -m pip install selenium requests
if errorlevel 1 goto pip_error

echo [2/3] Telechargement du nouvel agent V4...
if exist "%AGENT%" del /f /q "%AGENT%"
curl.exe -f -L -sS "%SERVER%/api/agent/download?token=%TOKEN%" -o "%AGENT%"
if errorlevel 1 goto download_error
if not exist "%AGENT%" goto download_error

echo [3/3] Verification puis lancement...
findstr /C:"SNIPERFC-AGENT-V4-OK" "%AGENT%" >nul
if errorlevel 1 goto corrupt_error
python -m py_compile "%AGENT%"
if errorlevel 1 goto corrupt_error

echo Agent V4 valide. Demarrage...
echo.
python "%AGENT%"
goto end

:no_python
echo ERREUR : Python est absent du PATH.
echo Installe Python depuis python.org et coche Add Python to PATH.
goto end

:pip_error
echo ERREUR : installation de Selenium impossible.
goto end

:download_error
echo ERREUR : telechargement impossible.
echo Regenere SniperFC_V4.bat depuis le site.
goto end

:corrupt_error
echo ERREUR : le NOUVEL agent V4 est invalide.
echo Supprime le dossier %FOLDER% puis regenere le launcher.
goto end

:end
echo.
echo Agent V4 arrete.
pause
`;

const UNIX_LAUNCHER = `#!/usr/bin/env bash
set -e

SERVER="__BASE_URL__"
TOKEN="__TOKEN__"
FOLDER="$HOME/SNIPERFC_V4"
AGENT="sniperfc_agent_v4.py"

mkdir -p "$FOLDER"
cd "$FOLDER"

PY=python3
command -v "$PY" >/dev/null 2>&1 || PY=python
command -v "$PY" >/dev/null 2>&1 || { echo "Python introuvable"; exit 1; }

"$PY" -m pip install selenium requests
rm -f "$AGENT"
curl -fLsS "$SERVER/api/agent/download?token=$TOKEN" -o "$AGENT"
grep -q "SNIPERFC-AGENT-V4-OK" "$AGENT"
"$PY" -m py_compile "$AGENT"
echo "Agent V4 valide. Demarrage..."
"$PY" "$AGENT"
`;

function download(body: string, filename: string, type: string) {
  return new Response(body, {
    headers: {
      "Content-Type": `${type}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.slice(0, 200);
  const unix = url.searchParams.get("os") === "unix";

  if (!token) {
    return Response.json({ ok: false, error: "Token manquant" }, { status: 400 });
  }

  const body = (unix ? UNIX_LAUNCHER : WINDOWS_LAUNCHER)
    .replaceAll("__BASE_URL__", publicBaseUrl(req))
    .replaceAll("__TOKEN__", token);

  return unix
    ? download(body, "SniperFC_V4.sh", "application/x-sh")
    : download(body, "SniperFC_V4.bat", "application/octet-stream");
}

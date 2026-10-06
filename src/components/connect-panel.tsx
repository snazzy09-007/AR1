"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Apple,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  MonitorSmartphone,
  Plug,
  PlayCircle,
  ShieldAlert,
  Terminal,
  Trash2,
} from "lucide-react";
import type { AgentInfo } from "@/lib/types";
import { cls, timeAgo } from "@/lib/format";
import { SectionHead } from "./ui";

type OS = "win" | "unix";

export function ConnectPanel({
  agents,
  agentOnline,
  demoMode,
  onStartDemo,
  onRefresh,
}: {
  agents: AgentInfo[];
  agentOnline: boolean;
  demoMode: boolean;
  onStartDemo: () => void;
  onRefresh: () => void;
}) {
  const [os, setOs] = useState<OS>("win");
  const [token, setToken] = useState<string | null>(null);
  const [pairing, setPairing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("mac") || ua.includes("linux") || ua.includes("x11")) setOs("unix");
  }, []);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* noop */
    }
  };

  // 1 clic : crée un token d'appairage puis télécharge le launcher pré-configuré
  const oneClick = async () => {
    setPairing(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: os === "win" ? "PC Windows" : "Mac / Linux" }),
      });
      const json = await res.json();
      if (json?.ok) {
        const t = json.agent.token as string;
        setToken(t);
        const url = `/api/agent/launcher?os=${os}&token=${encodeURIComponent(t)}`;
        const a = document.createElement("a");
        a.href = url;
        a.download = os === "win" ? "SniperFC_V5.bat" : "SniperFC_V5.sh";
        document.body.appendChild(a);
        a.click();
        a.remove();
        onRefresh();
      }
    } finally {
      setPairing(false);
    }
  };

  const oneLiner =
    os === "win"
      ? `powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr -UseBasicParsing '${origin}/api/agent/launcher?os=win&token=${token ?? "TON_TOKEN"}' -OutFile 'SniperFC_V5.bat'; .\\SniperFC_V5.bat"`
      : `curl -fsSL "${origin}/api/agent/launcher?os=unix&token=${token ?? "TON_TOKEN"}" -o SniperFC_V5.sh && bash SniperFC_V5.sh`;

  return (
    <div className="space-y-4">
      {/* HÉROS : démarrage en 1 clic */}
      <section className="glass scanline relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_20%_0%,rgba(184,244,77,0.1),transparent_70%)]" />
        <div className="relative">
          <SectionHead icon={Plug} title="Démarrer en un clic" tone="lime" />

          <div className="mt-5 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Ton moteur de trading,{" "}
                <span className="text-lime">prêt en 30 secondes</span>
              </h2>
              <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-mist">
                Un seul fichier, tout embarqué dedans. Ton navigateur le télécharge,
                tu double-cliques : il vérifie Python, dépose le moteur et ouvre Chrome.
                <span className="text-snow/80"> Rien à éditer, rien à copier.</span>
              </p>

              {/* Choix OS */}
              <div className="mt-5 inline-flex rounded-xl border border-white/10 bg-black/30 p-1">
                {([
                  { k: "win" as OS, label: "Windows", icon: MonitorSmartphone },
                  { k: "unix" as OS, label: "macOS / Linux", icon: Apple },
                ]).map(({ k, label, icon: Icon }) => (
                  <button
                    key={k}
                    onClick={() => setOs(k)}
                    className={cls(
                      "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold transition-all",
                      os === k ? "bg-lime text-black" : "text-mist hover:text-snow",
                    )}
                  >
                    <Icon className="size-3.5" /> {label}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  onClick={oneClick}
                  disabled={pairing}
                  className="group inline-flex h-12 items-center gap-2.5 rounded-xl bg-lime px-6 text-[13px] font-bold tracking-[0.06em] text-black uppercase transition-all hover:shadow-[0_0_40px_rgba(184,244,77,0.45)] disabled:opacity-60"
                >
                  {pairing ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  Télécharger mon launcher
                </button>
                <button
                  onClick={onStartDemo}
                  disabled={demoMode}
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-violet/40 bg-violet/[0.08] px-5 text-[12px] font-semibold tracking-[0.04em] text-violet uppercase transition-all hover:bg-violet/15 disabled:opacity-50"
                >
                  <PlayCircle className="size-4" />
                  {demoMode ? "Démo en cours" : "Essayer en démo"}
                </button>
              </div>

              <AnimatePresence>
                {token && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 rounded-xl border border-lime/30 bg-lime/[0.07] p-4"
                  >
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-lime">
                      <CheckCircle2 className="size-4" /> Launcher généré et téléchargé !
                    </div>
                    <ol className="mt-2.5 space-y-1 text-[12px] leading-relaxed text-snow/80">
                      <li>
                        1. Ouvre ton dossier <span className="font-mono text-lime">Téléchargements</span>
                      </li>
                      <li>
                        2. Double-clique{" "}
                        <span className="font-mono text-lime">
                          {os === "win" ? "SniperFC_V5.bat" : "SniperFC_V5.sh"}
                        </span>
                        {os === "unix" && (
                          <span className="text-mist"> (ou : bash SniperFC_V5.sh)</span>
                        )}
                      </li>
                      <li>3. Reviens ici : le badge passe au vert 🟢 automatiquement</li>
                    </ol>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Statut live */}
            <div className="rounded-2xl border border-white/[0.08] bg-black/35 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] font-semibold tracking-[0.2em] text-mist uppercase">
                  Statut de connexion
                </span>
                <span
                  className={cls(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] tracking-[0.14em]",
                    agentOnline
                      ? "border-lime/40 bg-lime/10 text-lime"
                      : "border-white/15 text-mist",
                  )}
                >
                  <span className={cls("size-1.5 rounded-full", agentOnline ? "bg-lime pulse-dot" : "bg-mist/50")} />
                  {agentOnline ? "CONNECTÉ" : "EN ATTENTE"}
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  { n: 1, label: "Console en ligne", done: true },
                  { n: 2, label: "Launcher généré", done: token != null || agents.length > 0 },
                  { n: 3, label: "Agent connecté", done: agentOnline },
                ].map((s) => (
                  <div key={s.n} className="flex items-center gap-3">
                    <span
                      className={cls(
                        "grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[10px] font-bold transition-colors",
                        s.done ? "border-lime/50 bg-lime/15 text-lime" : "border-white/15 text-mist",
                      )}
                    >
                      {s.done ? <Check className="size-3" /> : s.n}
                    </span>
                    <span className={cls("text-[13px]", s.done ? "text-snow/90" : "text-mist")}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {!agentOnline && (
                <p className="mt-4 border-t border-white/[0.07] pt-3 text-[11px] leading-relaxed text-mist">
                  Pas envie d&apos;installer maintenant ? Le{" "}
                  <span className="text-violet">mode démo</span> te fait découvrir toute la
                  console avec un marché simulé.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Alternative terminal */}
      <section className="glass rounded-2xl p-5">
        <SectionHead icon={Terminal} title="Alternative : ligne de commande" tone="frost" />
        <p className="mt-3 text-[12px] text-mist">
          {token
            ? "Colle cette commande dans un terminal — elle fait tout automatiquement."
            : "Génère d'abord ton launcher ci-dessus pour obtenir la commande avec ta clé."}
        </p>
        <div className="mt-3 flex items-stretch gap-2">
          <pre className="flex-1 overflow-x-auto rounded-lg border border-white/10 bg-black/50 px-3.5 py-3 font-mono text-[11px] text-frost">
            {oneLiner}
          </pre>
          <button
            onClick={() => copy(oneLiner, "cmd")}
            className="shrink-0 rounded-lg border border-white/15 px-3.5 text-mist transition-colors hover:border-lime/50 hover:text-lime"
          >
            {copied === "cmd" ? <Check className="size-4 text-lime" /> : <Copy className="size-4" />}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`/api/agent/download?token=${token ?? ""}`}
            download="sniperfc_agent_v5.py"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3.5 text-[11px] font-semibold text-snow/85 transition-colors hover:border-frost/50 hover:text-frost"
          >
            <Download className="size-3.5" /> sniperfc_agent_v5.py seul
          </a>
          {token && (
            <button
              onClick={() => copy(token, "token")}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3.5 font-mono text-[11px] text-mist transition-colors hover:border-white/30 hover:text-snow"
            >
              {copied === "token" ? <Check className="size-3.5 text-lime" /> : <Copy className="size-3.5" />}
              Copier ma clé
            </button>
          )}
        </div>
      </section>

      {/* Machines appairées */}
      <section className="glass rounded-2xl p-5">
        <SectionHead icon={MonitorSmartphone} title="Machines appairées" tone="violet" />
        {agents.length === 0 ? (
          <p className="mt-4 font-mono text-[11px] tracking-[0.1em] text-mist/70 uppercase">
            Aucune machine appairée pour l&apos;instant.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {agents.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/25 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cls("size-2 shrink-0 rounded-full", a.online ? "bg-lime pulse-dot" : "bg-mist/40")} />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold">{a.name}</div>
                    <div className="truncate font-mono text-[10px] text-mist">
                      {a.platform ?? "—"} · {a.tokenPreview} · {timeAgo(a.lastSeenAt)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await fetch(`/api/agents?id=${a.id}`, { method: "DELETE" });
                    onRefresh();
                  }}
                  title="Révoquer"
                  className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 text-mist transition-colors hover:border-danger/40 hover:text-danger"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex gap-3 rounded-xl border border-gold/25 bg-gold/[0.06] p-4">
        <ShieldAlert className="size-5 shrink-0 text-gold" />
        <p className="text-[12px] leading-relaxed text-gold/85">
          L&apos;agent a besoin de <strong>Chrome</strong> et de <strong>Python 3</strong>. Ferme Chrome
          avant le premier lancement. L&apos;automatisation de la Web App EA comporte un risque de
          bannissement : garde un délai de boucle ≥ 350 ms et ne laisse pas tourner 24h/24.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CloudOff, RefreshCw, Rocket, X } from "lucide-react";
import type { DashboardData, Strategy } from "@/lib/types";
import { Header, type TabKey } from "./header";
import { Ticker } from "./ticker";
import { StatCards } from "./stat-cards";
import { ControlsPanel } from "./controls-panel";
import { EnginePanel } from "./engine-panel";
import { StrategyBoard } from "./strategy-board";
import { AnalyticsPanel } from "./analytics-panel";
import { ConnectPanel } from "./connect-panel";
import { LogConsole } from "./log-console";
import { PurchasesTable } from "./purchases-table";
import { ProfitChart } from "./profit-chart";

export function Dashboard({ initial }: { initial: DashboardData | null }) {
  const [data, setData] = useState<DashboardData | null>(initial);
  const [tab, setTab] = useState<TabKey>("pilotage");
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  /* --------------------------- chargement live --------------------------- */
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      const json = await res.json();
      if (json?.ok) {
        setData(json.data);
        setOffline(false);
      } else setOffline(true);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [load]);

  // Accueil : proposé une seule fois si aucun agent n'a jamais été connecté
  useEffect(() => {
    if (!data) return;
    const seen = localStorage.getItem("sniperfc.welcomed");
    if (!seen && !data.agentOnline && !data.engine.demoMode && data.purchases.length === 0) {
      setShowWelcome(true);
    }
  }, [data]);

  const dismissWelcome = () => {
    localStorage.setItem("sniperfc.welcomed", "1");
    setShowWelcome(false);
  };

  /* ------------------------------- actions ------------------------------- */
  const post = useCallback(
    async (url: string, body: Record<string, unknown>, key: string): Promise<boolean> => {
      setBusy(key);
      let ok = false;
      try {
        const res = await fetch(url, {
          method: (body.__method as string) ?? "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        ok = res.ok && json?.ok !== false;
      } catch {
        ok = false;
      } finally {
        await load();
        setBusy(null);
      }
      return ok;
    },
    [load],
  );

  const control = useCallback(
    (action: string, extra: Record<string, unknown> = {}) =>
      post("/api/control", { action, ...extra }, action),
    [post],
  );

  const saveStrategy = useCallback(
    async (s: Strategy) => {
      setBusy("strategy");
      let ok = false;
      try {
        const res = await fetch("/api/strategies", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        });
        ok = res.ok;
      } finally {
        await load();
        setBusy(null);
      }
      return ok;
    },
    [load],
  );

  const createStrategy = useCallback(
    async (s: Strategy) => {
      setBusy("strategy");
      let ok = false;
      try {
        const res = await fetch("/api/strategies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        });
        ok = res.ok;
      } finally {
        await load();
        setBusy(null);
      }
      return ok;
    },
    [load],
  );

  const duplicateStrategy = useCallback(
    async (id: number) => {
      await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: id }),
      });
      await load();
    },
    [load],
  );

  const deleteStrategy = useCallback(
    async (id: number) => {
      if (!confirm("Archiver cette stratégie ? Ses statistiques sont conservées.")) return;
      await fetch(`/api/strategies?id=${id}`, { method: "DELETE" });
      await load();
    },
    [load],
  );

  /* -------------------------------- démo -------------------------------- */
  const demoMode = data?.engine.demoMode ?? false;

  const toggleDemo = useCallback(async () => {
    setDemoBusy(true);
    try {
      await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: demoMode ? "stop" : "start" }),
      });
      await load();
    } finally {
      setDemoBusy(false);
    }
  }, [demoMode, load]);

  // Boucle de simulation pilotée par le client tant que la démo tourne
  const ticking = useRef(false);
  useEffect(() => {
    if (!demoMode) return;
    const t = setInterval(async () => {
      if (ticking.current) return;
      ticking.current = true;
      try {
        await fetch("/api/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "tick" }),
        });
      } catch {
        /* noop */
      } finally {
        ticking.current = false;
      }
    }, 1800);
    return () => clearInterval(t);
  }, [demoMode]);

  /* ------------------------------- rendu -------------------------------- */
  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="bg-grid fixed inset-0" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass relative max-w-md rounded-2xl p-8 text-center"
        >
          <CloudOff className="mx-auto size-10 text-gold" />
          <h1 className="mt-4 text-lg font-bold">Console en cours de préparation…</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-mist">
            La base de données n&apos;est pas encore joignable. Patiente quelques secondes.
          </p>
          <button
            onClick={load}
            className="mx-auto mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-lime px-5 text-[12px] font-bold tracking-[0.08em] text-black uppercase"
          >
            <RefreshCw className="size-4" /> Réessayer
          </button>
        </motion.div>
      </div>
    );
  }

  const { engine, analytics } = data;

  return (
    <div className="relative min-h-screen">
      <div className="bg-grid fixed inset-0" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_60%_60%_at_50%_-10%,rgba(184,244,77,0.09),transparent_70%)]" />

      <Header
        status={engine.status}
        agentOnline={data.agentOnline}
        demoMode={demoMode}
        lastSeenAt={engine.lastSeenAt}
        tab={tab}
        onTab={setTab}
        onToggleDemo={toggleDemo}
        demoBusy={demoBusy}
      />
      <Ticker purchases={data.purchases} />

      <main className="relative mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 sm:px-6">
        {offline && (
          <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/[0.07] px-4 py-2.5 font-mono text-[11px] tracking-[0.08em] text-gold">
            <CloudOff className="size-3.5" /> CONSOLE INJOIGNABLE — NOUVELLE TENTATIVE…
          </div>
        )}

        <StatCards engine={engine} analytics={analytics} />

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-4"
          >
            {tab === "pilotage" && (
              <>
                <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
                  <div className="flex min-w-0 flex-col gap-4">
                    <ProfitChart purchases={data.purchases} />
                    <LogConsole logs={data.logs} />
                  </div>
                  <ControlsPanel
                    engine={engine}
                    strategy={data.activeStrategy}
                    busy={busy}
                    onAction={(a, extra) => void control(a, extra)}
                  />
                </div>
                <PurchasesTable purchases={data.purchases} />
              </>
            )}

            {tab === "strategies" && (
              <>
                <StrategyBoard
                  strategies={data.strategies}
                  analytics={analytics}
                  activeId={engine.activeStrategyId}
                  bestId={analytics.bestStrategyId}
                  busy={busy}
                  presets={data.presets}
                  onActivate={(id) => void control("activate_strategy", { strategyId: id })}
                  onSave={saveStrategy}
                  onCreate={createStrategy}
                  onDuplicate={duplicateStrategy}
                  onDelete={deleteStrategy}
                />
                <EnginePanel
                  engine={engine}
                  busy={busy === "update_engine"}
                  onSave={(config) => control("update_engine", { config })}
                />
              </>
            )}

            {tab === "analytics" && <AnalyticsPanel analytics={analytics} />}

            {tab === "connexion" && (
              <ConnectPanel
                agents={data.agents}
                agentOnline={data.agentOnline}
                demoMode={demoMode}
                onStartDemo={() => {
                  if (!demoMode) void toggleDemo();
                  setTab("pilotage");
                }}
                onRefresh={load}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <footer className="mt-4 border-t border-white/[0.05] pt-5 pb-8 text-center">
          <p className="font-mono text-[10px] leading-relaxed tracking-[0.12em] text-mist/60 uppercase">
            SNIPER FC · console de trading · l&apos;agent Selenium s&apos;exécute sur ta machine
            <br className="hidden sm:block" />
            L&apos;automatisation de la Web App EA peut entraîner un bannissement — trade responsable.
          </p>
        </footer>
      </main>

      {/* Accueil premier lancement */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissWelcome}
            className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 40, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="glass relative w-full max-w-lg overflow-hidden rounded-2xl bg-panel/95 p-7 text-center"
            >
              <button
                onClick={dismissWelcome}
                className="absolute top-4 right-4 grid size-8 place-items-center rounded-lg border border-white/10 text-mist hover:text-snow"
              >
                <X className="size-4" />
              </button>
              <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-lime/40 bg-lime/10 glow-lime">
                <Rocket className="size-7 text-lime" />
              </div>
              <h2 className="mt-4 text-2xl font-bold">Bienvenue sur SNIPER FC</h2>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-mist">
                Crée des stratégies, laisse l&apos;agent trader, et découvre{" "}
                <span className="text-snow/85">quels joueurs et quels filtres rapportent le plus</span>.
                Deux façons de commencer :
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => {
                    dismissWelcome();
                    void toggleDemo();
                  }}
                  className="rounded-xl border border-violet/40 bg-violet/[0.08] p-4 text-left transition-all hover:bg-violet/15"
                >
                  <div className="text-[13px] font-bold text-violet">🎬 Mode démo</div>
                  <div className="mt-1 text-[11px] leading-relaxed text-mist">
                    Marché simulé, aucune installation. Idéal pour explorer.
                  </div>
                </button>
                <button
                  onClick={() => {
                    dismissWelcome();
                    setTab("connexion");
                  }}
                  className="rounded-xl border border-lime/40 bg-lime/[0.08] p-4 text-left transition-all hover:bg-lime/15"
                >
                  <div className="text-[13px] font-bold text-lime">⚡ Agent réel</div>
                  <div className="mt-1 text-[11px] leading-relaxed text-mist">
                    Launcher auto-configuré : 1 téléchargement, 1 double-clic.
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

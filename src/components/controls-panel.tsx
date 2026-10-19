"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Coins,
  Gauge,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Target,
  Trash2,
  Zap,
} from "lucide-react";
import type { EngineState, Strategy } from "@/lib/types";
import { cls, fmtNum, fmtSigned } from "@/lib/format";
import { SectionHead, Spin } from "./ui";

/* ------------------------ VITESSE DE RECHERCHE ------------------------ */

const SPEED_PRESETS = [
  { label: "Turbo", ms: 150, tone: "border-danger/40 text-danger bg-danger/10" },
  { label: "Rapide", ms: 300, tone: "border-lime/40 text-lime bg-lime/10" },
  { label: "Prudent", ms: 600, tone: "border-frost/40 text-frost bg-frost/10" },
];

const VIEW_PRESETS = [
  { label: "Bref", ms: 400, tone: "border-frost/35 text-frost bg-frost/10" },
  { label: "Normal", ms: 900, tone: "border-lime/35 text-lime bg-lime/10" },
  { label: "Long", ms: 1800, tone: "border-gold/35 text-gold bg-gold/10" },
];

const clampLoop = (v: number) => Math.min(20000, Math.max(50, Math.round(v)));
const clampView = (v: number) => Math.min(10000, Math.max(100, Math.round(v)));

export function SpeedControl({
  engine,
  busy,
  onAction,
}: {
  engine: EngineState;
  busy: boolean;
  onAction: (action: string, extra?: Record<string, unknown>) => void;
}) {
  const [loop, setLoop] = useState(engine.loopDelayMs);
  const [view, setView] = useState(engine.resultViewMs);
  const [saved, setSaved] = useState<"loop" | "view" | null>(null);

  // Sync depuis l'agent tant que l'utilisateur n'est pas en train d'éditer
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) {
      setLoop(engine.loopDelayMs);
      setView(engine.resultViewMs);
    }
  }, [engine.loopDelayMs, engine.resultViewMs, editing]);

  const flash = (k: "loop" | "view") => {
    setSaved(k);
    setTimeout(() => setSaved(null), 1400);
  };

  // Application automatique debouncée : plus de bouton à cliquer
  const commit = (key: "loopDelayMs" | "resultViewMs", value: number) => {
    const clean = key === "loopDelayMs" ? clampLoop(value) : clampView(value);
    onAction("update_engine", { config: { [key]: clean } });
    flash(key === "loopDelayMs" ? "loop" : "view");
    setEditing(false);
  };

  // Debounce sur le champ libre / slider
  useEffect(() => {
    if (!editing) return;
    const t = setTimeout(() => commit("loopDelayMs", loop), 550);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop, editing]);

  useEffect(() => {
    if (!editing) return;
    const t = setTimeout(() => commit("resultViewMs", view), 550);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, editing]);

  // Temps effectif réel : la boucle ne peut pas être plus courte que le
  // temps passé sur les résultats + le travail Selenium.
  const effective = Math.max(loop, view);
  const perMin = Math.round(60000 / Math.max(1, effective));
  const measured = engine.lastLoopMs;

  const loopTone =
    loop <= 150 ? "text-danger" : loop <= 400 ? "text-lime" : "text-frost";
  const viewTone =
    view >= 1500 ? "text-gold" : view >= 700 ? "text-lime" : "text-frost";

  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4">
      {/* -- En-tête : temps réel mesuré -- */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className={cls("size-3.5", loopTone)} />
          <span className="text-[10px] font-semibold tracking-[0.16em] text-mist uppercase">
            Vitesse
          </span>
        </div>
        <span className="font-mono text-[11px] font-bold tabular-nums text-snow/90">
          ~{perMin}/min
        </span>
      </div>

      {/* -- Temps réel mesuré par l'agent -- */}
      {measured != null && measured > 0 && (
        <div
          className={cls(
            "mb-3 flex items-center justify-between rounded-lg border px-2.5 py-1.5",
            Math.abs(measured - effective) <= 150
              ? "border-lime/25 bg-lime/[0.06]"
              : "border-gold/25 bg-gold/[0.06]",
          )}
        >
          <span className="text-[9px] font-semibold tracking-[0.12em] text-mist uppercase">
            Mesuré par l&apos;agent
          </span>
          <span
            className={cls(
              "font-mono text-[11px] font-bold tabular-nums",
              Math.abs(measured - effective) <= 150 ? "text-lime" : "text-gold",
            )}
          >
            {measured} ms
            {Math.abs(measured - effective) > 150 && (
              <span className="ml-1 text-[9px] font-normal text-gold/70">
                (cible {effective})
              </span>
            )}
          </span>
        </div>
      )}

      {/* -- Boucle complète -- */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-[0.14em] text-mist uppercase">
          Temps d&apos;une boucle
        </span>
        <span className={cls("font-mono text-[11px] font-bold tabular-nums", loopTone)}>
          {loop} ms
        </span>
      </div>

      <input
        type="range"
        min={50}
        max={2000}
        step={10}
        value={Math.min(2000, loop)}
        onChange={(e) => {
          setEditing(true);
          setLoop(Number(e.target.value));
        }}
        onPointerUp={() => commit("loopDelayMs", loop)}
        onKeyUp={() => commit("loopDelayMs", loop)}
        className="slider w-full"
      />
      <div className="mt-1 flex justify-between font-mono text-[8px] text-mist/50">
        <span>50</span>
        <span>1000</span>
        <span>2000</span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <input
            className="input w-[104px] !py-1.5 text-center !text-[13px]"
            type="text"
            inputMode="numeric"
            value={String(loop)}
            onChange={(e) => {
              setEditing(true);
              setLoop(Number(e.target.value.replace(/[^\d]/g, "")) || 0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit("loopDelayMs", loop);
            }}
            onBlur={() => loop >= 50 && commit("loopDelayMs", loop)}
          />
          <span className="absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-[10px] text-mist">
            ms
          </span>
        </div>
        {SPEED_PRESETS.map((p) => (
          <button
            key={p.ms}
            type="button"
            onClick={() => {
              setLoop(p.ms);
              commit("loopDelayMs", p.ms);
            }}
            className={cls(
              "rounded-lg border px-2.5 py-1.5 font-mono text-[10px] transition-all",
              loop === p.ms
                ? p.tone
                : "border-white/10 text-mist hover:border-white/25 hover:text-snow",
            )}
          >
            {p.label}
          </button>
        ))}
        {saved === "loop" && (
          <span className="font-mono text-[9px] tracking-[0.1em] text-lime uppercase">
            ✓ appliqué
          </span>
        )}
      </div>

      {/* -- Délai Search → Retour -- */}
      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-[0.14em] text-mist uppercase">
            Délai Search → Retour
          </span>
          <span className={cls("font-mono text-[11px] font-bold tabular-nums", viewTone)}>
            {view} ms
          </span>
        </div>

        <input
          type="range"
          min={100}
          max={3000}
          step={50}
          value={Math.min(3000, view)}
          onChange={(e) => {
            setEditing(true);
            setView(Number(e.target.value));
          }}
          onPointerUp={() => commit("resultViewMs", view)}
          onKeyUp={() => commit("resultViewMs", view)}
          className="slider w-full"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              className="input w-[104px] !py-1.5 text-center !text-[13px]"
              type="text"
              inputMode="numeric"
              value={String(view)}
              onChange={(e) => {
                setEditing(true);
                setView(Number(e.target.value.replace(/[^\d]/g, "")) || 0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit("resultViewMs", view);
              }}
              onBlur={() => view >= 100 && commit("resultViewMs", view)}
            />
            <span className="absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-[10px] text-mist">
              ms
            </span>
          </div>
          {VIEW_PRESETS.map((p) => (
            <button
              key={p.ms}
              type="button"
              onClick={() => {
                setView(p.ms);
                commit("resultViewMs", p.ms);
              }}
              className={cls(
                "rounded-lg border px-2.5 py-1.5 font-mono text-[10px] transition-all",
                view === p.ms
                  ? p.tone
                  : "border-white/10 text-mist hover:border-white/25 hover:text-snow",
              )}
            >
              {p.label}
            </button>
          ))}
          {saved === "view" && (
            <span className="font-mono text-[9px] tracking-[0.1em] text-lime uppercase">
              ✓ appliqué
            </span>
          )}
        </div>

        <p className="mt-2 text-[9px] leading-relaxed text-mist/60">
          Temps max pour chercher un joueur avant de revenir. <br />
          <span className="text-snow/75">Aucun joueur</span> : retour après ce délai.{" "}
          <span className="text-lime/80">Joueur détecté</span> : achat + relist
          immédiats, aucune attente.
        </p>
      </div>

      {loop < 150 && (
        <p className="mt-2 text-[10px] text-danger/80">
          En dessous de 150 ms, risque de détection accru par EA.
        </p>
      )}
    </div>
  );
}

const ACCENT_TEXT: Record<string, string> = {
  lime: "text-lime",
  gold: "text-gold",
  frost: "text-frost",
  violet: "text-violet",
  danger: "text-danger",
};

// Traduction lisible des états remontés par l'agent Python
const AGENT_STATUS_LABEL: Record<string, string> = {
  offline: "hors ligne",
  starting: "démarrage…",
  browser_ready: "Chrome ouvert",
  waiting_login: "attente login EA",
  running: "en chasse",
  paused: "en pause",
  stopped: "arrêté",
  demo: "démo",
};

function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-2 last:border-0">
      <span className="text-[9px] font-medium tracking-[0.16em] text-mist uppercase">{label}</span>
      <span className={cls("truncate font-mono text-[12px] font-semibold", tone ?? "text-snow/90")}>
        {value}
      </span>
    </div>
  );
}

export function ControlsPanel({
  engine,
  strategy,
  busy,
  onAction,
}: {
  engine: EngineState;
  strategy: Strategy | null;
  busy: string | null;
  onAction: (action: string, extra?: Record<string, unknown>) => void;
}) {
  const running = engine.status === "running";
  const paused = engine.status === "paused";
  const stopped = engine.status === "stopped";
  const accent = ACCENT_TEXT[strategy?.accent ?? "lime"] ?? "text-lime";

  const margin = strategy ? Math.round(strategy.sellMax * 0.95) - strategy.buyPrice : 0;
  const incPct =
    engine.maxIncrement > 0
      ? Math.min(100, (engine.incrementValue / engine.maxIncrement) * 100)
      : 0;

  return (
    <motion.aside
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="glass flex flex-col gap-4 rounded-2xl p-5"
    >
      <SectionHead
        icon={Gauge}
        title="Contrôles"
        right={
          <span className="font-mono text-[9px] tracking-[0.16em] text-mist uppercase">~1 s</span>
        }
      />

      <button
        onClick={() => onAction(running ? "pause" : "resume")}
        disabled={stopped || busy === "pause" || busy === "resume"}
        className={cls(
          "flex h-14 items-center justify-center gap-3 rounded-xl text-sm font-bold tracking-[0.12em] uppercase transition-all duration-300",
          running && "border border-gold/40 bg-gold/10 text-gold hover:bg-gold/20",
          paused && "border border-lime/50 bg-lime text-black hover:shadow-[0_0_36px_rgba(184,244,77,0.45)]",
          stopped && "cursor-not-allowed border border-white/10 bg-white/[0.03] text-mist",
        )}
      >
        {busy === "pause" || busy === "resume" ? (
          <Spin />
        ) : running ? (
          <Pause className="size-5" />
        ) : (
          <Play className="size-5" />
        )}
        {running ? "Mettre en pause" : paused ? "Reprendre" : "Agent arrêté"}
      </button>

      {/* Vitesse de recherche : champ libre + slider + presets */}
      <SpeedControl engine={engine} busy={busy === "update_engine"} onAction={onAction} />

      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => onAction("refresh_now")}
          disabled={stopped || busy === "refresh_now"}
          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-frost/35 bg-frost/[0.08] text-[11px] font-semibold tracking-[0.08em] text-frost uppercase transition-all hover:bg-frost/15 disabled:opacity-40"
        >
          {busy === "refresh_now" ? <Spin className="size-3.5" /> : <RefreshCw className="size-3.5" />}
          Refresh
        </button>
        <button
          onClick={() => onAction("restart_driver")}
          disabled={busy === "restart_driver"}
          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-violet/35 bg-violet/[0.08] text-[11px] font-semibold tracking-[0.08em] text-violet uppercase transition-all hover:bg-violet/15 disabled:opacity-40"
        >
          {busy === "restart_driver" ? <Spin className="size-3.5" /> : <RotateCcw className="size-3.5" />}
          Driver
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => onAction("mark_sold", { count: 1 })}
          disabled={busy === "mark_sold"}
          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-gold/35 bg-gold/[0.07] text-[11px] font-semibold tracking-[0.08em] text-gold uppercase transition-all hover:bg-gold/15 disabled:opacity-40"
        >
          {busy === "mark_sold" ? <Spin className="size-3.5" /> : <Coins className="size-3.5" />}
          Vendu +1
        </button>
        <button
          onClick={() => onAction("stop")}
          disabled={busy === "stop"}
          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-danger/45 bg-danger/[0.08] text-[11px] font-bold tracking-[0.08em] text-danger uppercase transition-all hover:bg-danger/15 disabled:opacity-50"
        >
          {busy === "stop" ? <Spin className="size-3.5" /> : <Square className="size-3.5" />}
          Veille
        </button>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Target className={cls("size-3.5", accent)} />
          <span className="truncate text-[10px] font-semibold tracking-[0.18em] text-mist uppercase">
            {strategy?.name ?? "Aucune stratégie"}
          </span>
        </div>
        <Row
          label="Cible"
          value={strategy ? (strategy.playerEnabled && strategy.playerName ? strategy.playerName : "Marché global") : "—"}
          tone={accent}
        />
        <Row label="Achat max" value={`${fmtNum(strategy?.buyPrice ?? 0)} cr`} tone="text-gold" />
        <Row
          label="Marge / flip"
          value={`${fmtSigned(margin)} cr`}
          tone={margin >= 0 ? "text-lime" : "text-danger"}
        />
        <Row
          label="Rotation A/B"
          value={engine.rotateEnabled ? `toutes les ${engine.rotateEveryMin} min` : "désactivée"}
          tone={engine.rotateEnabled ? "text-frost" : "text-mist"}
        />
        <Row
          label="Agent"
          value={AGENT_STATUS_LABEL[engine.agentStatus] ?? engine.agentStatus}
          tone={
            engine.agentStatus === "running"
              ? "text-lime"
              : engine.agentStatus === "offline"
                ? "text-mist"
                : "text-gold"
          }
        />
        <Row label="Boucles" value={fmtNum(engine.loops)} />

        <div className="pt-2.5">
          <div className="mb-1.5 flex justify-between font-mono text-[9px] tracking-[0.12em] text-mist uppercase">
            <span>Incrément</span>
            <span>
              {engine.incrementValue}/{engine.maxIncrement}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-limed to-lime"
              animate={{ width: `${incPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => onAction("reset_stats")}
          disabled={busy === "reset_stats"}
          className="inline-flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] text-mist uppercase hover:text-gold disabled:opacity-50"
        >
          {busy === "reset_stats" ? <Spin className="size-3" /> : <Trash2 className="size-3" />}
          Reset session
        </button>
        <button
          onClick={() => {
            if (confirm("Effacer TOUT l'historique et les analytics ? Action irréversible.")) {
              onAction("reset_stats", { hard: true });
            }
          }}
          className="font-mono text-[9px] tracking-[0.16em] text-mist uppercase hover:text-danger"
        >
          Effacer l&apos;historique
        </button>
      </div>
    </motion.aside>
  );
}

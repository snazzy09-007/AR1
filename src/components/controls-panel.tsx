"use client";

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
} from "lucide-react";
import type { EngineState, Strategy } from "@/lib/types";
import { cls, fmtNum, fmtSigned } from "@/lib/format";
import { SectionHead, Spin } from "./ui";

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
          Stop
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

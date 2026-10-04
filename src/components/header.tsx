"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Gauge,
  Layers,
  Plug,
  Play,
  Satellite,
  Square,
  Zap,
} from "lucide-react";
import type { BotStatus } from "@/lib/types";
import { cls, timeAgo } from "@/lib/format";

export type TabKey = "pilotage" | "strategies" | "analytics" | "connexion";

export const TABS: Array<{ key: TabKey; label: string; icon: typeof Gauge }> = [
  { key: "pilotage", label: "Pilotage", icon: Gauge },
  { key: "strategies", label: "Stratégies", icon: Layers },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "connexion", label: "Connexion", icon: Plug },
];

const STATUS_META: Record<BotStatus, { label: string; classes: string; dot: string }> = {
  running: { label: "EN CHASSE", classes: "border-lime/40 bg-lime/10 text-lime", dot: "bg-lime pulse-dot" },
  paused: { label: "EN PAUSE", classes: "border-gold/40 bg-gold/10 text-gold", dot: "bg-gold" },
  stopped: { label: "ARRÊTÉ", classes: "border-danger/40 bg-danger/10 text-danger", dot: "bg-danger" },
};

export function Header({
  status,
  agentOnline,
  demoMode,
  lastSeenAt,
  tab,
  onTab,
  onToggleDemo,
  demoBusy,
}: {
  status: BotStatus;
  agentOnline: boolean;
  demoMode: boolean;
  lastSeenAt: string | null;
  tab: TabKey;
  onTab: (t: TabKey) => void;
  onToggleDemo: () => void;
  demoBusy: boolean;
}) {
  const meta = STATUS_META[status] ?? STATUS_META.stopped;

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 border-b border-white/[0.06] bg-abyss/85 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-2.5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl border border-lime/40 bg-lime/10 glow-lime">
              <Zap className="size-5 text-lime" strokeWidth={2.4} />
            </div>
            <div className="leading-none">
              <div className="text-lg font-bold tracking-[0.08em]">
                SNIPER<span className="text-lime">FC</span>
              </div>
              <div className="mt-1 font-mono text-[9px] tracking-[0.28em] text-mist uppercase">
                Trade Intelligence · v3
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {demoMode && (
              <span className="hidden items-center gap-1.5 rounded-full border border-violet/40 bg-violet/10 px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] text-violet sm:inline-flex">
                <span className="size-1.5 rounded-full bg-violet pulse-dot" /> DÉMO
              </span>
            )}
            <span
              title={`Dernier signal : ${timeAgo(lastSeenAt)}`}
              className={cls(
                "hidden items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] md:inline-flex",
                agentOnline
                  ? "border-frost/40 bg-frost/10 text-frost"
                  : "border-white/15 bg-white/[0.04] text-mist",
              )}
            >
              <span className={cls("size-1.5 rounded-full", agentOnline ? "bg-frost pulse-dot" : "bg-mist/50")} />
              <Satellite className="size-3" />
              {agentOnline ? "AGENT EN LIGNE" : "HORS LIGNE"}
            </span>
            <span
              className={cls(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-[0.16em]",
                meta.classes,
              )}
            >
              <span className={cls("size-1.5 rounded-full", meta.dot)} />
              {meta.label}
            </span>
            <button
              onClick={onToggleDemo}
              disabled={demoBusy}
              className={cls(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold transition-all disabled:opacity-50",
                demoMode
                  ? "border-violet/50 bg-violet/15 text-violet hover:bg-violet/25"
                  : "border-white/15 bg-white/[0.04] text-snow/85 hover:border-violet/50 hover:text-violet",
              )}
            >
              {demoMode ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
              <span className="hidden sm:inline">{demoMode ? "Stopper la démo" : "Démo 1 clic"}</span>
              <span className="sm:hidden">Démo</span>
            </button>
          </div>
        </div>

        {/* Onglets */}
        <nav className="-mx-1 flex gap-1 overflow-x-auto pb-0.5">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => onTab(key)}
                className={cls(
                  "relative shrink-0 rounded-lg px-3.5 py-2 text-[12px] font-semibold tracking-[0.06em] transition-colors",
                  active ? "text-lime" : "text-mist hover:text-snow",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-lg border border-lime/30 bg-lime/10"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <Icon className="size-3.5" />
                  {label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </motion.header>
  );
}

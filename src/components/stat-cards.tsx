"use client";

import { motion } from "framer-motion";
import {
  Coins,
  Percent,
  ShoppingBag,
  Timer,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { AnalyticsData, EngineState } from "@/lib/types";
import { cls, fmtNum, fmtSigned } from "@/lib/format";

function Card({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  delay,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  tone: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="glass card-hover relative overflow-hidden rounded-2xl p-4 sm:p-5"
    >
      <Icon className="absolute -right-3 -bottom-4 size-20 -rotate-12 opacity-[0.05]" />
      <div className="flex items-center gap-2">
        <Icon className={cls("size-3.5", tone)} />
        <span className="text-[9px] font-semibold tracking-[0.22em] text-mist uppercase">{label}</span>
      </div>
      <motion.div
        key={value}
        initial={{ y: 8, opacity: 0, filter: "blur(4px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.3 }}
        className={cls("mt-2.5 font-mono text-2xl font-bold tracking-tight tabular-nums sm:text-3xl", tone)}
      >
        {value}
      </motion.div>
      <div className="mt-1.5 font-mono text-[9px] tracking-[0.06em] text-mist/80">{hint}</div>
    </motion.div>
  );
}

export function StatCards({
  engine,
  analytics,
}: {
  engine: EngineState;
  analytics: AnalyticsData;
}) {
  const best = analytics.strategies[0];
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Card
        icon={Coins}
        label="Crédits"
        value={fmtNum(engine.credits)}
        hint={engine.demoMode ? "solde simulé (démo)" : "solde live de l'agent"}
        tone="text-gold"
        delay={0.04}
      />
      <Card
        icon={TrendingUp}
        label="Profit total"
        value={fmtSigned(engine.totalProfit)}
        hint="taxe EA 5% déduite"
        tone="text-lime"
        delay={0.09}
      />
      <Card
        icon={Timer}
        label="Profit / heure"
        value={fmtSigned(analytics.totals.profitPerHour)}
        hint={best ? `top : ${best.name}` : "en attente de données"}
        tone="text-frost"
        delay={0.14}
      />
      <Card
        icon={ShoppingBag}
        label="Flips"
        value={fmtNum(analytics.totals.flips)}
        hint={`${fmtNum(analytics.totals.sold)} revendu(s)`}
        tone="text-violet"
        delay={0.19}
      />
      <Card
        icon={Percent}
        label="ROI"
        value={`${analytics.totals.roi > 0 ? "+" : ""}${analytics.totals.roi}%`}
        hint={`marge moy. ${fmtSigned(analytics.totals.avgProfit)} cr`}
        tone={analytics.totals.roi >= 0 ? "text-lime" : "text-danger"}
        delay={0.24}
      />
    </section>
  );
}

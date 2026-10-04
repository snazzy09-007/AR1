"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import type { PurchaseRow } from "@/lib/types";
import { fmtSigned } from "@/lib/format";

export function Ticker({ purchases }: { purchases: PurchaseRow[] }) {
  const items =
    purchases.length > 0
      ? purchases.slice(0, 12)
      : null;

  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] bg-panel/60 py-2.5">
      <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap pr-10">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex items-center gap-10" aria-hidden={dup === 1}>
            {items
              ? items.map((p, i) => (
                  <span
                    key={`${dup}-${p.id}-${i}`}
                    className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-mist uppercase"
                  >
                    <span className="text-snow/80">{p.player}</span>
                    {p.profit >= 0 ? (
                      <TrendingUp className="size-3 text-lime" />
                    ) : (
                      <TrendingDown className="size-3 text-danger" />
                    )}
                    <span className={p.profit >= 0 ? "text-lime" : "text-danger"}>
                      {fmtSigned(p.profit)}
                    </span>
                    <span className="text-white/20">✦</span>
                  </span>
                ))
              : [
                  "Console prête",
                  "En attente de connexion de l'agent",
                  "Même moteur · zéro Discord",
                  "Configuration 100% live",
                ].map((t, i) => (
                  <span
                    key={`${dup}-ph-${i}`}
                    className="font-mono text-[11px] tracking-[0.18em] text-mist/70 uppercase"
                  >
                    {t} <span className="ml-6 text-lime/50">✦</span>
                  </span>
                ))}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-abyss to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-abyss to-transparent" />
    </div>
  );
}

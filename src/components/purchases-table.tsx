"use client";

import { Ghost, History } from "lucide-react";
import type { PurchaseRow } from "@/lib/types";
import { clock, cls, fmtNum, fmtSigned } from "@/lib/format";
import { SectionHead } from "./ui";

export function PurchasesTable({ purchases }: { purchases: PurchaseRow[] }) {
  const total = purchases.reduce((s, p) => s + (p.realProfit ?? p.profit), 0);

  return (
    <section className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
        <SectionHead
          icon={History}
          title="Historique des flips"
          tone="frost"
          right={
            purchases.length > 0 ? (
              <span className={cls("font-mono text-[11px] font-bold", total >= 0 ? "text-lime" : "text-danger")}>
                {fmtSigned(total)} cr
              </span>
            ) : undefined
          }
        />
      </div>

      {purchases.length === 0 ? (
        <div className="flex h-[180px] flex-col items-center justify-center gap-2.5 text-mist/60">
          <Ghost className="size-7" />
          <p className="font-mono text-[11px] tracking-[0.12em] uppercase">
            Aucun flip — lance la démo ou ton agent
          </p>
        </div>
      ) : (
        <div className="max-h-[360px] overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="sticky top-0 z-10 bg-panel/95 backdrop-blur">
              <tr className="border-b border-white/[0.06] text-[9px] tracking-[0.18em] text-mist uppercase">
                <th className="px-5 py-2.5">Heure</th>
                <th className="px-3 py-2.5">Joueur</th>
                <th className="px-3 py-2.5">Stratégie</th>
                <th className="px-3 py-2.5 text-right">Achat</th>
                <th className="px-3 py-2.5 text-right">Concurrence</th>
                <th className="px-3 py-2.5 text-center">Statut</th>
                <th className="px-5 py-2.5 text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => {
                const profit = p.realProfit ?? p.profit;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.025]"
                  >
                    <td className="px-5 py-2.5 font-mono text-[11px] text-mist tabular-nums">
                      {clock(p.createdAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-medium text-snow/90">{p.player}</span>
                        {p.demo && (
                          <span className="rounded border border-violet/30 bg-violet/10 px-1 text-[8px] font-bold text-violet">
                            DÉMO
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[9px] text-mist">{p.filterSignature}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-mist">{p.strategyName}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px] text-gold tabular-nums">
                      {fmtNum(p.buyPrice)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[11px] text-mist tabular-nums">
                      {p.marketDepth != null ? `${p.marketDepth} cartes` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={cls(
                          "rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.08em] uppercase",
                          p.status === "sold"
                            ? "border-lime/30 bg-lime/10 text-lime"
                            : "border-white/12 bg-white/[0.04] text-mist",
                        )}
                      >
                        {p.status === "sold" ? "vendu" : "listé"}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span
                        className={cls(
                          "inline-block rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums",
                          profit >= 0
                            ? "border-lime/30 bg-lime/10 text-lime"
                            : "border-danger/30 bg-danger/10 text-danger",
                        )}
                      >
                        {fmtSigned(profit)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

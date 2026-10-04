"use client";

import { BarChart3, Clock, Crown, Filter, Sparkles, TrendingDown } from "lucide-react";
import type { AnalyticsData } from "@/lib/types";
import { cls, fmtNum, fmtSigned, timeAgo } from "@/lib/format";
import { SectionHead } from "./ui";

const ACCENT_BAR: Record<string, string> = {
  lime: "bg-lime",
  gold: "bg-gold",
  frost: "bg-frost",
  violet: "bg-violet",
  danger: "bg-danger",
  mist: "bg-mist",
};

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-[150px] flex-col items-center justify-center gap-2 text-mist/60">
      <Sparkles className="size-6" />
      <p className="max-w-[280px] text-center font-mono text-[10px] leading-relaxed tracking-[0.12em] uppercase">
        {text}
      </p>
    </div>
  );
}

export function AnalyticsPanel({ analytics }: { analytics: AnalyticsData }) {
  const { strategies, filters, hours, totals } = analytics;
  const hasData = totals.flips > 0;
  const maxHourProfit = Math.max(1, ...hours.map((h) => Math.abs(h.profit)));
  const worst = strategies.length > 1 ? strategies[strategies.length - 1] : null;

  return (
    <div className="space-y-4">
      {/* Verdict */}
      <section className="glass rounded-2xl p-5">
        <SectionHead icon={Crown} title="Le verdict" tone="gold" />
        {!hasData ? (
          <Empty text="Lance la démo ou ton agent : dès le premier flip, on te dit quelle stratégie rapporte le plus." />
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-lime/25 bg-lime/[0.06] p-4">
              <div className="text-[9px] font-semibold tracking-[0.2em] text-mist uppercase">
                🏆 Meilleure stratégie
              </div>
              <div className="mt-1 truncate text-[15px] font-bold text-lime">{strategies[0].name}</div>
              <div className="mt-1 font-mono text-[11px] text-mist">
                {fmtSigned(strategies[0].profitPerHour)} cr/h · {strategies[0].flips} flips ·{" "}
                {strategies[0].filters}
              </div>
            </div>
            <div className="rounded-xl border border-frost/25 bg-frost/[0.06] p-4">
              <div className="text-[9px] font-semibold tracking-[0.2em] text-mist uppercase">
                ⏰ Meilleur créneau
              </div>
              <div className="mt-1 text-[15px] font-bold text-frost">
                {totals.bestHour != null ? `${String(totals.bestHour).padStart(2, "0")}h — ${String((totals.bestHour + 1) % 24).padStart(2, "0")}h` : "—"}
              </div>
              <div className="mt-1 font-mono text-[11px] text-mist">
                créneau le plus rentable observé
              </div>
            </div>
            <div
              className={cls(
                "rounded-xl border p-4",
                worst && worst.profit < 0
                  ? "border-danger/25 bg-danger/[0.06]"
                  : "border-white/10 bg-white/[0.03]",
              )}
            >
              <div className="text-[9px] font-semibold tracking-[0.2em] text-mist uppercase">
                {worst && worst.profit < 0 ? "⚠️ À corriger" : "📊 Filtre gagnant"}
              </div>
              <div className="mt-1 truncate text-[15px] font-bold text-snow/90">
                {worst && worst.profit < 0 ? worst.name : (filters[0]?.signature ?? "—")}
              </div>
              <div className="mt-1 font-mono text-[11px] text-mist">
                {worst && worst.profit < 0
                  ? `${fmtSigned(worst.profit)} cr — envisage d'ajuster les prix`
                  : filters[0]
                    ? `${fmtSigned(filters[0].avgProfit)} cr/flip en moyenne`
                    : "—"}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Classement */}
      <section className="glass overflow-hidden rounded-2xl">
        <div className="border-b border-white/[0.06] px-5 py-3.5">
          <SectionHead icon={BarChart3} title="Classement des stratégies" tone="lime" />
        </div>
        {strategies.length === 0 ? (
          <Empty text="Aucune donnée de performance pour le moment." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-[9px] tracking-[0.18em] text-mist uppercase">
                  <th className="px-5 py-2.5">#</th>
                  <th className="px-3 py-2.5">Stratégie</th>
                  <th className="px-3 py-2.5">Filtres</th>
                  <th className="px-3 py-2.5 text-right">Flips</th>
                  <th className="px-3 py-2.5 text-right">Profit</th>
                  <th className="px-3 py-2.5 text-right">Moy./flip</th>
                  <th className="px-3 py-2.5 text-right">cr/h</th>
                  <th className="px-3 py-2.5 text-right">ROI</th>
                  <th className="px-3 py-2.5 text-right">Concurrence</th>
                  <th className="px-5 py-2.5 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {strategies.map((s, i) => (
                  <tr
                    key={`${s.strategyId}-${s.name}`}
                    className="border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.025]"
                  >
                    <td className="px-5 py-3 font-mono text-[11px] text-mist">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cls("size-2 rounded-full", ACCENT_BAR[s.accent] ?? "bg-mist")} />
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold">{s.name}</div>
                          <div className="truncate font-mono text-[10px] text-mist">
                            {s.player} · {s.lastFlipAt ? timeAgo(s.lastFlipAt) : "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-mist">
                        {s.filters}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[12px] tabular-nums">{s.flips}</td>
                    <td
                      className={cls(
                        "px-3 py-3 text-right font-mono text-[12px] font-bold tabular-nums",
                        s.profit >= 0 ? "text-lime" : "text-danger",
                      )}
                    >
                      {fmtSigned(s.profit)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[12px] text-snow/80 tabular-nums">
                      {fmtSigned(s.avgProfit)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[12px] text-frost tabular-nums">
                      {fmtSigned(s.profitPerHour)}
                    </td>
                    <td
                      className={cls(
                        "px-3 py-3 text-right font-mono text-[12px] tabular-nums",
                        s.roi >= 0 ? "text-lime/90" : "text-danger/90",
                      )}
                    >
                      {s.roi}%
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[11px] text-mist tabular-nums">
                      {s.avgDepth ? `${s.avgDepth} cartes` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.07]">
                          <div
                            className={cls("h-full rounded-full", ACCENT_BAR[s.accent] ?? "bg-mist")}
                            style={{ width: `${s.score}%` }}
                          />
                        </div>
                        <span className="w-6 text-right font-mono text-[11px] font-bold tabular-nums">
                          {s.score}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Filtres qui marchent */}
        <section className="glass rounded-2xl p-5">
          <SectionHead icon={Filter} title="Filtres les plus rentables" tone="violet" />
          {filters.length === 0 ? (
            <Empty text="Les combinaisons de filtres apparaîtront ici après quelques achats." />
          ) : (
            <div className="mt-4 space-y-2.5">
              {filters.map((f) => {
                const max = Math.max(1, ...filters.map((x) => Math.abs(x.profit)));
                return (
                  <div key={f.signature}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="truncate font-mono text-[11px] text-snow/85">{f.signature}</span>
                      <span
                        className={cls(
                          "shrink-0 font-mono text-[11px] font-bold tabular-nums",
                          f.profit >= 0 ? "text-lime" : "text-danger",
                        )}
                      >
                        {fmtSigned(f.profit)} · {f.flips} flips
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={cls(
                          "h-full rounded-full",
                          f.profit >= 0 ? "bg-gradient-to-r from-limed to-lime" : "bg-danger",
                        )}
                        style={{ width: `${(Math.abs(f.profit) / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Heures rentables */}
        <section className="glass rounded-2xl p-5">
          <SectionHead icon={Clock} title="Rentabilité par heure" tone="frost" />
          {hours.length === 0 ? (
            <Empty text="Le radar horaire se remplit au fil de tes sessions." />
          ) : (
            <div className="mt-5 flex h-[150px] items-end gap-1">
              {Array.from({ length: 24 }, (_, h) => {
                const found = hours.find((x) => x.hour === h);
                const p = found?.profit ?? 0;
                const height = p === 0 ? 3 : Math.max(6, (Math.abs(p) / maxHourProfit) * 100);
                return (
                  <div key={h} className="group relative flex flex-1 flex-col items-center gap-1">
                    <div
                      className={cls(
                        "w-full rounded-t transition-all",
                        p > 0 ? "bg-frost/70 group-hover:bg-frost" : p < 0 ? "bg-danger/60" : "bg-white/10",
                      )}
                      style={{ height: `${height}%` }}
                    />
                    {h % 6 === 0 && (
                      <span className="font-mono text-[8px] text-mist">{String(h).padStart(2, "0")}</span>
                    )}
                    {found && (
                      <span className="pointer-events-none absolute -top-7 z-10 hidden whitespace-nowrap rounded border border-white/15 bg-abyss px-1.5 py-0.5 font-mono text-[9px] text-snow group-hover:block">
                        {String(h).padStart(2, "0")}h · {fmtSigned(p)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Totaux */}
      <section className="glass grid grid-cols-2 gap-3 rounded-2xl p-5 sm:grid-cols-4">
        {[
          { label: "Investi", value: `${fmtNum(totals.spend)} cr`, tone: "text-gold" },
          { label: "Profit net", value: `${fmtSigned(totals.profit)} cr`, tone: totals.profit >= 0 ? "text-lime" : "text-danger" },
          { label: "Marge moyenne", value: `${fmtSigned(totals.avgProfit)} cr`, tone: "text-frost" },
          { label: "Revendus", value: `${fmtNum(totals.sold)} / ${fmtNum(totals.flips)}`, tone: "text-violet" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-black/25 p-3.5">
            <div className="text-[9px] font-semibold tracking-[0.18em] text-mist uppercase">{s.label}</div>
            <div className={cls("mt-1 font-mono text-lg font-bold tabular-nums", s.tone)}>{s.value}</div>
          </div>
        ))}
      </section>

      {totals.flips > 0 && totals.profit < 0 && (
        <div className="flex items-center gap-2.5 rounded-xl border border-danger/25 bg-danger/[0.06] px-4 py-3 text-[12px] text-danger/90">
          <TrendingDown className="size-4 shrink-0" />
          Session dans le rouge : baisse ton prix d&apos;achat max ou vise des cartes moins concurrentielles.
        </div>
      )}
    </div>
  );
}

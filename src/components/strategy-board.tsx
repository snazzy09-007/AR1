"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Copy,
  Crown,
  Layers,
  Pencil,
  Plus,
  Target,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import type { AnalyticsData, PresetRow, Strategy } from "@/lib/types";
import { cls, fmtNum, fmtSigned } from "@/lib/format";
import { Chip, Field, NumberInput, SectionHead, Spin, Toggle } from "./ui";

const ACCENTS: Record<string, { ring: string; text: string; bg: string; bar: string }> = {
  lime: { ring: "border-lime/45", text: "text-lime", bg: "bg-lime/10", bar: "bg-lime" },
  gold: { ring: "border-gold/45", text: "text-gold", bg: "bg-gold/10", bar: "bg-gold" },
  frost: { ring: "border-frost/45", text: "text-frost", bg: "bg-frost/10", bar: "bg-frost" },
  violet: { ring: "border-violet/45", text: "text-violet", bg: "bg-violet/10", bar: "bg-violet" },
  danger: { ring: "border-danger/45", text: "text-danger", bg: "bg-danger/10", bar: "bg-danger" },
};
const ACCENT_KEYS = Object.keys(ACCENTS);
const RARITIES = ["Team of the Week", "Rare", "Icon", "Heroes", "RTTK", "POTM"];
const QUALITIES = ["Gold", "Silver", "Bronze"];
const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST"];

const blank = (): Strategy => ({
  id: 0,
  name: "",
  accent: "lime",
  playerName: "",
  playerEnabled: true,
  buyPrice: 1000,
  sellMin: 1100,
  sellMax: 1200,
  rarity: "",
  rarityEnabled: false,
  quality: "Gold",
  qualityEnabled: false,
  position: "",
  positionEnabled: false,
  enabled: true,
  createdAt: new Date().toISOString(),
});

/* ------------------------------- ÉDITEUR -------------------------------- */

function Editor({
  value,
  presets,
  busy,
  onClose,
  onSubmit,
}: {
  value: Strategy;
  presets: PresetRow[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (s: Strategy) => Promise<boolean>;
}) {
  const [s, setS] = useState<Strategy>(value);
  const set = <K extends keyof Strategy>(k: K, v: Strategy[K]) => setS((p) => ({ ...p, [k]: v }));
  const margin = Math.round(s.sellMax * 0.95) - s.buyPrice;
  const a = ACCENTS[s.accent] ?? ACCENTS.lime;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center"
    >
      <motion.div
        initial={{ y: 50, scale: 0.97, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="glass max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-panel/95 p-5 sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={cls("grid size-9 place-items-center rounded-lg border", a.ring, a.bg)}>
              <Target className={cls("size-4", a.text)} />
            </span>
            <h2 className="text-lg font-bold">
              {s.id ? "Modifier la stratégie" : "Nouvelle stratégie"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-lg border border-white/10 text-mist hover:border-white/30 hover:text-snow"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <Field label="Nom de la stratégie">
              <input
                className="input"
                value={s.name}
                placeholder="Ex : TOTW sniper"
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>

            <div>
              <span className="mb-1.5 block text-[11px] font-medium tracking-[0.14em] text-mist uppercase">
                Couleur
              </span>
              <div className="flex gap-2">
                {ACCENT_KEYS.map((k) => (
                  <button
                    key={k}
                    onClick={() => set("accent", k)}
                    className={cls(
                      "size-7 rounded-full border-2 transition-all",
                      ACCENTS[k].bar,
                      s.accent === k ? "scale-110 border-white/80" : "border-transparent opacity-50",
                    )}
                  />
                ))}
              </div>
            </div>

            <Toggle
              checked={s.playerEnabled}
              onChange={(v) => set("playerEnabled", v)}
              label="Cibler un joueur précis"
              hint="désactivé = scanne tout le marché avec les filtres"
            />
            <Field label="Nom exact du joueur">
              <input
                className="input"
                value={s.playerName}
                disabled={!s.playerEnabled}
                placeholder="Ex : Micky van de Ven"
                onChange={(e) => set("playerName", e.target.value)}
              />
            </Field>
            <div className="flex max-h-[92px] flex-wrap gap-1.5 overflow-y-auto pr-1">
              {presets.map((p) => (
                <Chip
                  key={p.id}
                  disabled={!s.playerEnabled}
                  active={s.playerEnabled && s.playerName === p.name}
                  onClick={() => setS((prev) => ({ ...prev, playerName: p.name, playerEnabled: true }))}
                >
                  {p.name}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <Field label="Achat max">
                <NumberInput value={String(s.buyPrice)} onChange={(v) => set("buyPrice", Number(v) || 0)} />
              </Field>
              <Field label="Vente min">
                <NumberInput value={String(s.sellMin)} onChange={(v) => set("sellMin", Number(v) || 0)} />
              </Field>
              <Field label="Vente max">
                <NumberInput value={String(s.sellMax)} onChange={(v) => set("sellMax", Number(v) || 0)} />
              </Field>
            </div>

            <div
              className={cls(
                "rounded-lg border px-3.5 py-2.5",
                margin >= 0 ? "border-lime/25 bg-lime/[0.06]" : "border-danger/25 bg-danger/[0.06]",
              )}
            >
              <span className="text-[9px] font-semibold tracking-[0.18em] text-mist uppercase">
                Marge estimée / flip
              </span>
              <div
                className={cls(
                  "font-mono text-xl font-bold tabular-nums",
                  margin >= 0 ? "text-lime" : "text-danger",
                )}
              >
                {fmtSigned(margin)} <span className="text-[11px] text-mist">cr</span>
              </div>
            </div>

            {/* Filtres */}
            <div className="space-y-3 rounded-lg border border-white/[0.06] bg-black/25 p-3.5">
              <Toggle checked={s.rarityEnabled} onChange={(v) => set("rarityEnabled", v)} label="Rareté" />
              {s.rarityEnabled && (
                <>
                  <input
                    className="input"
                    value={s.rarity}
                    placeholder="Team of the Week"
                    onChange={(e) => set("rarity", e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {RARITIES.map((r) => (
                      <Chip key={r} active={s.rarity === r} onClick={() => set("rarity", r)}>
                        {r}
                      </Chip>
                    ))}
                  </div>
                </>
              )}

              <Toggle checked={s.qualityEnabled} onChange={(v) => set("qualityEnabled", v)} label="Qualité" />
              {s.qualityEnabled && (
                <div className="flex flex-wrap gap-1.5">
                  {QUALITIES.map((q) => (
                    <Chip key={q} active={s.quality === q} onClick={() => set("quality", q)}>
                      {q}
                    </Chip>
                  ))}
                </div>
              )}

              <Toggle checked={s.positionEnabled} onChange={(v) => set("positionEnabled", v)} label="Position" />
              {s.positionEnabled && (
                <div className="flex flex-wrap gap-1.5">
                  {POSITIONS.map((p) => (
                    <Chip key={p} active={s.position === p} onClick={() => set("position", p)}>
                      {p}
                    </Chip>
                  ))}
                </div>
              )}
            </div>

            <Toggle
              checked={s.enabled}
              onChange={(v) => set("enabled", v)}
              label="Inclure dans la rotation A/B"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-10 rounded-xl border border-white/15 px-4 text-[12px] font-semibold text-mist uppercase hover:text-snow"
          >
            Annuler
          </button>
          <button
            onClick={async () => {
              if (await onSubmit(s)) onClose();
            }}
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-lime px-5 text-[12px] font-bold tracking-[0.06em] text-black uppercase transition-all hover:shadow-[0_0_26px_rgba(184,244,77,0.4)] disabled:opacity-60"
          >
            {busy ? <Spin className="size-4" /> : <Check className="size-4" />}
            {s.id ? "Enregistrer" : "Créer la stratégie"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------- BOARD --------------------------------- */

export function StrategyBoard({
  strategies,
  analytics,
  activeId,
  bestId,
  busy,
  presets,
  onActivate,
  onSave,
  onCreate,
  onDuplicate,
  onDelete,
}: {
  strategies: Strategy[];
  analytics: AnalyticsData;
  activeId: number | null;
  bestId: number | null;
  busy: string | null;
  presets: PresetRow[];
  onActivate: (id: number) => void;
  onSave: (s: Strategy) => Promise<boolean>;
  onCreate: (s: Strategy) => Promise<boolean>;
  onDuplicate: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState<Strategy | null>(null);
  const statOf = (id: number) => analytics.strategies.find((s) => s.strategyId === id);
  const maxProfit = Math.max(1, ...analytics.strategies.map((s) => Math.abs(s.profit)));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHead icon={Layers} title="Mes stratégies" tone="frost" />
        <button
          onClick={() => setEditing(blank())}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-lime px-4 text-[11px] font-bold tracking-[0.08em] text-black uppercase transition-all hover:shadow-[0_0_24px_rgba(184,244,77,0.4)]"
        >
          <Plus className="size-4" /> Nouvelle stratégie
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {strategies.map((s, i) => {
          const a = ACCENTS[s.accent] ?? ACCENTS.lime;
          const st = statOf(s.id);
          const isActive = s.id === activeId;
          const isBest = s.id === bestId && (st?.flips ?? 0) > 0;
          const margin = Math.round(s.sellMax * 0.95) - s.buyPrice;
          const filters = [
            s.rarityEnabled && s.rarity,
            s.qualityEnabled && s.quality,
            s.positionEnabled && s.position,
            !s.playerEnabled && "marché global",
          ].filter(Boolean) as string[];

          return (
            <motion.article
              key={s.id}
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.45, delay: i * 0.04 }}
              className={cls(
                "glass card-hover relative overflow-hidden rounded-2xl p-4",
                isActive && `${a.ring} ring-1 ring-inset ring-white/5`,
              )}
            >
              {isActive && <span className={cls("absolute inset-x-0 top-0 h-[3px]", a.bar)} />}

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[15px] font-bold">{s.name}</h3>
                    {isBest && (
                      <span
                        title="Meilleur rendement"
                        className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[9px] font-bold text-gold"
                      >
                        <Crown className="size-2.5" /> TOP
                      </span>
                    )}
                    {!s.enabled && (
                      <span className="rounded-full border border-white/15 px-1.5 py-0.5 text-[9px] text-mist">
                        hors rotation
                      </span>
                    )}
                  </div>
                  <p className={cls("mt-0.5 truncate font-mono text-[11px]", a.text)}>
                    {s.playerEnabled && s.playerName ? s.playerName : "Marché global"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setEditing(s)}
                    title="Modifier"
                    className="grid size-7 place-items-center rounded-lg border border-white/10 text-mist hover:border-white/30 hover:text-snow"
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    onClick={() => onDuplicate(s.id)}
                    title="Dupliquer"
                    className="grid size-7 place-items-center rounded-lg border border-white/10 text-mist hover:border-frost/40 hover:text-frost"
                  >
                    <Copy className="size-3" />
                  </button>
                  <button
                    onClick={() => onDelete(s.id)}
                    title="Archiver"
                    className="grid size-7 place-items-center rounded-lg border border-white/10 text-mist hover:border-danger/40 hover:text-danger"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>

              {filters.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {filters.map((f) => (
                    <span
                      key={f}
                      className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] text-mist"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-white/[0.06] bg-black/25 p-2.5 text-center">
                <div>
                  <div className="text-[8px] tracking-[0.14em] text-mist uppercase">Achat</div>
                  <div className="font-mono text-[12px] font-bold text-gold">{fmtNum(s.buyPrice)}</div>
                </div>
                <div>
                  <div className="text-[8px] tracking-[0.14em] text-mist uppercase">Vente</div>
                  <div className="font-mono text-[12px] font-bold text-snow/85">{fmtNum(s.sellMax)}</div>
                </div>
                <div>
                  <div className="text-[8px] tracking-[0.14em] text-mist uppercase">Marge</div>
                  <div
                    className={cls(
                      "font-mono text-[12px] font-bold",
                      margin >= 0 ? "text-lime" : "text-danger",
                    )}
                  >
                    {fmtSigned(margin)}
                  </div>
                </div>
              </div>

              {/* Performance réelle mesurée */}
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between font-mono text-[9px] tracking-[0.12em] text-mist uppercase">
                  <span>Performance réelle</span>
                  <span>{st ? `${st.flips} flips · score ${st.score}` : "aucune donnée"}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className={cls("h-full rounded-full", st && st.profit < 0 ? "bg-danger" : a.bar)}
                    animate={{ width: `${st ? Math.min(100, (Math.abs(st.profit) / maxProfit) * 100) : 0}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                {st && (
                  <div className="mt-1.5 flex justify-between font-mono text-[10px]">
                    <span className={st.profit >= 0 ? "text-lime" : "text-danger"}>
                      {fmtSigned(st.profit)} cr
                    </span>
                    <span className="text-mist">{fmtSigned(st.profitPerHour)} cr/h</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => onActivate(s.id)}
                disabled={isActive || busy === "activate_strategy"}
                className={cls(
                  "mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl text-[11px] font-bold tracking-[0.1em] uppercase transition-all",
                  isActive
                    ? cls("cursor-default border", a.ring, a.bg, a.text)
                    : "border border-white/12 text-mist hover:border-lime/50 hover:bg-lime/10 hover:text-lime",
                )}
              >
                {isActive ? <><Zap className="size-3.5" /> Active</> : "Activer"}
              </button>
            </motion.article>
          );
        })}
      </div>

      <AnimatePresence>
        {editing && (
          <Editor
            value={editing}
            presets={presets}
            busy={busy === "strategy"}
            onClose={() => setEditing(null)}
            onSubmit={(s) => (s.id ? onSave(s) : onCreate(s))}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

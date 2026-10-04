"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Cpu, Shuffle, Undo2 } from "lucide-react";
import type { EngineState } from "@/lib/types";
import { Field, NumberInput, SectionHead, Spin, Toggle } from "./ui";

type Draft = Record<string, string>;

const NUM_FIELDS: Array<[string, string, string]> = [
  ["loopDelayMs", "Délai boucle", "ms"],
  ["maxIncrement", "Incrément max", "clics"],
  ["refreshMinLoops", "Refresh min", "boucles"],
  ["refreshMaxLoops", "Refresh max", "boucles"],
  ["autoRefreshMin", "Auto-refresh", "min"],
  ["floodThreshold", "Seuil anti-dump", "cartes"],
  ["buyLimit", "Limite d'achats", "0 = ∞"],
  ["minCreditsFloor", "Plancher crédits", "cr"],
];

const toDraft = (e: EngineState): Draft =>
  Object.fromEntries(
    NUM_FIELDS.map(([k]) => [k, String((e as unknown as Record<string, number>)[k] ?? 0)]).concat([
      ["rotateEveryMin", String(e.rotateEveryMin)],
    ]),
  );

export function EnginePanel({
  engine,
  busy,
  onSave,
}: {
  engine: EngineState;
  busy: boolean;
  onSave: (config: Record<string, unknown>) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(engine));
  const [rotate, setRotate] = useState(engine.rotateEnabled);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!dirty) {
      setDraft(toDraft(engine));
      setRotate(engine.rotateEnabled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.updatedAt]);

  const set = (k: string, v: string) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setDirty(true);
  };

  const save = async () => {
    const payload: Record<string, unknown> = { rotateEnabled: rotate };
    for (const k of Object.keys(draft)) payload[k] = Number(draft[k]) || 0;
    const ok = await onSave(payload);
    if (ok) {
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SectionHead icon={Cpu} title="Réglages moteur" tone="violet" />
        <AnimatePresence mode="wait">
          {saved && (
            <motion.span
              key="ok"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-lime/40 bg-lime/10 px-3 py-1 font-mono text-[10px] tracking-[0.12em] text-lime uppercase"
            >
              <Check className="size-3" /> appliqué
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {NUM_FIELDS.map(([key, label, hint]) => (
          <Field key={key} label={label} hint={hint}>
            <NumberInput value={draft[key] ?? ""} onChange={(v) => set(key, v)} />
          </Field>
        ))}
      </div>

      <div className="mt-5 grid gap-4 rounded-xl border border-white/[0.06] bg-black/25 p-4 sm:grid-cols-[1fr_180px] sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Shuffle className="size-3.5 text-frost" />
            <span className="text-[10px] font-semibold tracking-[0.2em] text-mist uppercase">
              Rotation A/B des stratégies
            </span>
          </div>
          <Toggle
            checked={rotate}
            onChange={(v) => {
              setRotate(v);
              setDirty(true);
            }}
            label="Tester automatiquement chaque stratégie"
            hint="l'agent alterne les stratégies actives pour comparer leurs performances réelles"
          />
        </div>
        <Field label="Durée par stratégie" hint="minutes">
          <NumberInput
            value={draft.rotateEveryMin ?? ""}
            onChange={(v) => set("rotateEveryMin", v)}
            disabled={!rotate}
          />
        </Field>
      </div>

      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setDraft(toDraft(engine));
                  setRotate(engine.rotateEnabled);
                  setDirty(false);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-[11px] font-semibold tracking-[0.06em] text-mist uppercase hover:text-snow"
              >
                <Undo2 className="size-3.5" /> Annuler
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-lime px-4 text-[11px] font-bold tracking-[0.06em] text-black uppercase transition-all hover:shadow-[0_0_24px_rgba(184,244,77,0.4)] disabled:opacity-60"
              >
                {busy ? <Spin className="size-3.5" /> : <Check className="size-3.5" />} Appliquer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

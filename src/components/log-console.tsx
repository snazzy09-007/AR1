"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, Terminal } from "lucide-react";
import type { LogRow } from "@/lib/types";
import { clock, cls } from "@/lib/format";
import { SectionHead } from "./ui";

const LEVEL_STYLE: Record<string, { badge: string; text: string; label: string }> = {
  info: { badge: "border-white/15 bg-white/[0.06] text-mist", text: "text-snow/75", label: "INFO" },
  ok: { badge: "border-lime/40 bg-lime/10 text-lime", text: "text-lime/90", label: "OK" },
  warn: { badge: "border-gold/40 bg-gold/10 text-gold", text: "text-gold/90", label: "WARN" },
  error: { badge: "border-danger/40 bg-danger/10 text-danger", text: "text-danger/90", label: "ERR" },
  buy: { badge: "border-frost/40 bg-frost/10 text-frost", text: "text-frost", label: "BUY" },
};

export function LogConsole({ logs }: { logs: LogRow[] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [stick, setStick] = useState(true);

  useEffect(() => {
    if (stick && boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [logs, stick]);

  const onScroll = () => {
    const el = boxRef.current;
    if (!el) return;
    setStick(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
  };

  return (
    <section className="glass scanline relative flex flex-col overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
        <SectionHead
          icon={Terminal}
          title="Journal live"
          right={
            <span className="inline-flex items-center gap-1.5 font-mono text-[9px] tracking-[0.2em] text-lime uppercase">
              <span className="size-1.5 rounded-full bg-lime pulse-dot" /> LIVE · {logs.length}
            </span>
          }
        />
      </div>

      <div
        ref={boxRef}
        onScroll={onScroll}
        className="relative h-[340px] overflow-y-auto px-4 py-3 font-mono text-[12px] leading-[1.9]"
      >
        {logs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-mist/60">
            <Terminal className="size-6" />
            <p className="text-[11px] tracking-[0.14em] uppercase">
              En attente des premiers événements…
            </p>
          </div>
        ) : (
          logs.map((l) => {
            const style = LEVEL_STYLE[l.level] ?? LEVEL_STYLE.info;
            return (
              <div key={l.id} className="flex items-start gap-2.5 whitespace-pre-wrap break-words">
                <span className="shrink-0 tabular-nums text-mist/50">{clock(l.createdAt)}</span>
                <span
                  className={cls(
                    "mt-[5px] inline-flex h-[16px] shrink-0 items-center rounded border px-1.5 text-[8px] font-bold tracking-[0.14em]",
                    style.badge,
                  )}
                >
                  {style.label}
                </span>
                <span className={style.text}>{l.message}</span>
              </div>
            );
          })
        )}
      </div>

      {!stick && (
        <button
          onClick={() => {
            setStick(true);
            boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
          }}
          className="absolute right-4 bottom-4 inline-flex items-center gap-1.5 rounded-full border border-lime/40 bg-abyss/90 px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] text-lime uppercase shadow-lg backdrop-blur transition-colors hover:bg-lime/15"
        >
          <ArrowDown className="size-3" /> Suivre
        </button>
      )}
    </section>
  );
}

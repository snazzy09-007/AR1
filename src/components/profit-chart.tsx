"use client";

import { useMemo } from "react";
import { LineChart } from "lucide-react";
import type { PurchaseRow } from "@/lib/types";
import { fmtNum, fmtSigned } from "@/lib/format";
import { SectionHead } from "./ui";

const W = 640;
const H = 190;
const PAD_X = 14;
const PAD_T = 22;
const PAD_B = 16;

// Lissage Catmull-Rom -> Bézier pour une courbe douce
function smoothPath(points: Array<[number, number]>): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;
  }
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

export function ProfitChart({ purchases }: { purchases: PurchaseRow[] }) {
  const { path, area, last, cum, min, max } = useMemo(() => {
    const chrono = [...purchases].reverse();
    let acc = 0;
    const values = chrono.map((p) => (acc += p.profit));
    if (values.length === 0) {
      return { path: "", area: "", last: null as [number, number] | null, cum: 0, min: 0, max: 0 };
    }
    if (values.length === 1) {
      const v = values[0];
      values.unshift(0);
      if (v === 0) values[1] = 1;
    }
    const mn = Math.min(0, ...values);
    const mx = Math.max(0, ...values);
    const span = mx - mn || 1;
    const stepX = (W - PAD_X * 2) / Math.max(1, values.length - 1);
    const pts: Array<[number, number]> = values.map((v, i) => [
      PAD_X + i * stepX,
      PAD_T + (1 - (v - mn) / span) * (H - PAD_T - PAD_B),
    ]);
    const line = smoothPath(pts);
    const areaPath = `${line} L ${pts[pts.length - 1][0]} ${H - PAD_B} L ${pts[0][0]} ${H - PAD_B} Z`;
    return { path: line, area: areaPath, last: pts[pts.length - 1], cum: acc, min: mn, max: mx };
  }, [purchases]);

  return (
    <section className="glass relative overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
        <SectionHead
          icon={LineChart}
          title="Profit cumulé"
          right={
            purchases.length > 0 ? (
              <span
                className={`font-mono text-[13px] font-bold tabular-nums ${cum >= 0 ? "text-lime" : "text-danger"}`}
              >
                {fmtSigned(cum)} cr
              </span>
            ) : undefined
          }
        />
      </div>

      <div className="relative px-2 py-2">
        {purchases.length === 0 ? (
          <div className="flex h-[190px] flex-col items-center justify-center gap-2.5">
            <svg width="220" height="46" viewBox="0 0 220 46" fill="none" className="opacity-40">
              <path
                d="M4 38 C 40 10, 70 44, 108 22 S 180 6, 216 18"
                stroke="rgba(184,244,77,0.5)"
                strokeWidth="2"
                strokeDasharray="5 6"
                strokeLinecap="round"
              />
            </svg>
            <p className="font-mono text-[10px] tracking-[0.18em] text-mist/70 uppercase">
              La courbe se dessinera au premier flip
            </p>
          </div>
        ) : (
          <>
            <span className="absolute top-3 left-4 font-mono text-[9px] text-mist/60 tabular-nums">
              {fmtNum(max)}
            </span>
            <span className="absolute bottom-3 left-4 font-mono text-[9px] text-mist/60 tabular-nums">
              {fmtNum(min)}
            </span>
            <svg viewBox={`0 0 ${W} ${H}`} className="h-[190px] w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(184,244,77,0.28)" />
                  <stop offset="100%" stopColor="rgba(184,244,77,0)" />
                </linearGradient>
                <filter id="glowLine" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.2" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {[0.25, 0.5, 0.75].map((f) => (
                <line
                  key={f}
                  x1={PAD_X}
                  x2={W - PAD_X}
                  y1={PAD_T + f * (H - PAD_T - PAD_B)}
                  y2={PAD_T + f * (H - PAD_T - PAD_B)}
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="3 6"
                />
              ))}
              <path d={area} fill="url(#profitFill)" />
              <path
                d={path}
                fill="none"
                stroke="#b8f44d"
                strokeWidth="2.4"
                strokeLinecap="round"
                filter="url(#glowLine)"
              />
              {last && (
                <>
                  <circle cx={last[0]} cy={last[1]} r="4.5" fill="#b8f44d" filter="url(#glowLine)" />
                  <circle cx={last[0]} cy={last[1]} r="9" fill="none" stroke="rgba(184,244,77,0.35)" />
                </>
              )}
            </svg>
          </>
        )}
      </div>
    </section>
  );
}

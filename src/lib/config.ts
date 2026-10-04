import type { botState, strategies } from "@/db/schema";

/* ----------------------------- MOTEUR (global) ---------------------------- */

export const ENGINE_KEYS = [
  "maxIncrement",
  "refreshMinLoops",
  "refreshMaxLoops",
  "loopDelayMs",
  "buyLimit",
  "floodThreshold",
  "autoRefreshMin",
  "minCreditsFloor",
  "status",
  "rotateEnabled",
  "rotateEveryMin",
] as const;

type StateRow = typeof botState.$inferSelect;

const ENGINE_RANGES: Record<string, [number, number]> = {
  maxIncrement: [0, 60],
  refreshMinLoops: [10, 100_000],
  refreshMaxLoops: [10, 100_000],
  loopDelayMs: [100, 20_000],
  buyLimit: [0, 10_000],
  floodThreshold: [2, 50],
  autoRefreshMin: [1, 240],
  minCreditsFloor: [0, 15_000_000],
  rotateEveryMin: [1, 720],
};

const STATUS_VALUES = new Set(["running", "paused", "stopped"]);
const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));

export function pickEngineConfig(row: StateRow) {
  return {
    maxIncrement: row.maxIncrement,
    refreshMinLoops: row.refreshMinLoops,
    refreshMaxLoops: row.refreshMaxLoops,
    loopDelayMs: row.loopDelayMs,
    buyLimit: row.buyLimit,
    floodThreshold: row.floodThreshold,
    autoRefreshMin: row.autoRefreshMin,
    minCreditsFloor: row.minCreditsFloor,
    status: row.status,
  };
}

export function sanitizeEngine(input: Record<string, unknown>) {
  const out: Record<string, string | number | boolean> = {};
  for (const key of ENGINE_KEYS) {
    if (!(key in input)) continue;
    const raw = input[key];
    if (key === "status") {
      if (typeof raw === "string" && STATUS_VALUES.has(raw)) out[key] = raw;
    } else if (key === "rotateEnabled") {
      out[key] = raw === true || raw === "true";
    } else {
      const v = Math.round(Number(raw));
      if (Number.isFinite(v)) out[key] = clamp(v, ENGINE_RANGES[key]);
    }
  }
  if (
    typeof out.refreshMinLoops === "number" &&
    typeof out.refreshMaxLoops === "number" &&
    out.refreshMinLoops > out.refreshMaxLoops
  ) {
    [out.refreshMinLoops, out.refreshMaxLoops] = [out.refreshMaxLoops, out.refreshMinLoops];
  }
  return out;
}

/* ------------------------------- STRATÉGIES ------------------------------- */

export const ACCENTS = ["lime", "gold", "frost", "violet", "danger"] as const;
export const QUALITIES = ["Gold", "Silver", "Bronze"] as const;
export const POSITIONS = [
  "GK", "CB", "LB", "RB", "LWB", "RWB", "CDM", "CM", "CAM",
  "LM", "RM", "LW", "RW", "CF", "ST",
] as const;

type StrategyRow = typeof strategies.$inferSelect;

const PRICE_RANGE: [number, number] = [0, 15_000_000];

export function sanitizeStrategy(input: Record<string, unknown>, partial = false) {
  const out: Record<string, string | number | boolean> = {};
  const str = (k: string, max: number) => {
    const raw = input[k];
    if (typeof raw === "string") out[k] = raw.trim().slice(0, max);
  };
  const bool = (k: string) => {
    if (k in input) out[k] = input[k] === true || input[k] === "true";
  };
  const int = (k: string) => {
    if (!(k in input)) return;
    const v = Math.round(Number(input[k]));
    if (Number.isFinite(v)) out[k] = clamp(v, PRICE_RANGE);
  };

  str("name", 48);
  str("playerName", 80);
  str("rarity", 60);
  str("quality", 20);
  str("position", 8);
  bool("playerEnabled");
  bool("rarityEnabled");
  bool("qualityEnabled");
  bool("positionEnabled");
  bool("enabled");
  int("buyPrice");
  int("sellMin");
  int("sellMax");

  if (typeof input.accent === "string" && (ACCENTS as readonly string[]).includes(input.accent)) {
    out.accent = input.accent;
  }
  if (typeof out.quality === "string" && !(QUALITIES as readonly string[]).includes(out.quality)) {
    out.quality = "Gold";
  }
  if (!partial && (!out.name || String(out.name).length === 0)) {
    out.name = String(out.playerName || "Nouvelle stratégie").slice(0, 48);
  }
  return out;
}

export function strategyLabel(s: StrategyRow | null) {
  if (!s) return "—";
  return s.playerEnabled && s.playerName ? s.playerName : "Marché global";
}

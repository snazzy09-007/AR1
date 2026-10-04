export type BotStatus = "running" | "paused" | "stopped";

export interface EngineState {
  maxIncrement: number;
  refreshMinLoops: number;
  refreshMaxLoops: number;
  loopDelayMs: number;
  buyLimit: number;
  floodThreshold: number;
  autoRefreshMin: number;
  minCreditsFloor: number;
  status: BotStatus;
  activeStrategyId: number | null;
  rotateEnabled: boolean;
  rotateEveryMin: number;
  demoMode: boolean;
  // runtime
  agentStatus: string;
  credits: number | null;
  totalProfit: number;
  playersBought: number;
  loops: number;
  refreshCount: number;
  incrementValue: number;
  nextRefreshIn: number | null;
  lastSeenAt: string | null;
  sessionStartedAt: string | null;
  updatedAt: string;
}

export interface Strategy {
  id: number;
  name: string;
  accent: string;
  playerName: string;
  playerEnabled: boolean;
  buyPrice: number;
  sellMin: number;
  sellMax: number;
  rarity: string;
  rarityEnabled: boolean;
  quality: string;
  qualityEnabled: boolean;
  position: string;
  positionEnabled: boolean;
  enabled: boolean;
  createdAt: string;
}

export interface PurchaseRow {
  id: number;
  strategyId: number | null;
  strategyName: string;
  player: string;
  filterSignature: string;
  buyPrice: number;
  sellMin: number | null;
  sellMax: number | null;
  profit: number;
  status: string;
  soldPrice: number | null;
  realProfit: number | null;
  marketDepth: number | null;
  demo: boolean;
  createdAt: string;
}

export interface LogRow {
  id: number;
  level: "info" | "ok" | "warn" | "error" | "buy" | "sale";
  message: string;
  createdAt: string;
}

export interface PresetRow {
  id: number;
  name: string;
}

/* ------------------------------ analytics ------------------------------- */

export interface StrategyStat {
  strategyId: number | null;
  name: string;
  accent: string;
  player: string;
  filters: string;
  flips: number;
  sold: number;
  profit: number;
  spend: number;
  avgProfit: number;
  bestProfit: number;
  roi: number; // %
  profitPerHour: number;
  avgDepth: number;
  avgLowest: number | null;
  activeMinutes: number;
  lastFlipAt: string | null;
  score: number; // 0-100
}

export interface HourStat {
  hour: number;
  flips: number;
  profit: number;
}

export interface FilterStat {
  signature: string;
  flips: number;
  profit: number;
  avgProfit: number;
}

export interface AnalyticsData {
  strategies: StrategyStat[];
  hours: HourStat[];
  filters: FilterStat[];
  totals: {
    flips: number;
    profit: number;
    spend: number;
    sold: number;
    avgProfit: number;
    roi: number;
    profitPerHour: number;
    bestHour: number | null;
  };
  bestStrategyId: number | null;
}

export interface AgentInfo {
  id: number;
  name: string;
  platform: string | null;
  version: string | null;
  lastSeenAt: string | null;
  online: boolean;
  tokenPreview: string;
}

export interface DashboardData {
  engine: EngineState;
  strategies: Strategy[];
  activeStrategy: Strategy | null;
  agentOnline: boolean;
  agents: AgentInfo[];
  purchases: PurchaseRow[];
  logs: LogRow[];
  presets: PresetRow[];
  analytics: AnalyticsData;
}

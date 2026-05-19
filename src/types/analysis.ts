import type { ExportRange } from '@/services/export/types';

export type AnalysisScenarioId = 'hours_analysis' | 'narrative_summary';

export type HoursAnalysisVariant =
  | 'daily_overview'
  | 'task_breakdown'
  | 'health_check';

export type NarrativeVariant =
  | 'weekly'
  | 'monthly'
  | 'performance'
  | 'custom';

export type AnalysisVariant = HoursAnalysisVariant | NarrativeVariant;

export type PickerPreset = 'this_week' | 'last_week' | 'this_month' | 'custom';

export type PickerAdjust = PickerPreset;

export type ChartType = 'week_bar' | 'rank_bar' | 'none';

export interface TitleBreakdown {
  title: string;
  minutes: number;
  percent: number;
}

export interface DailyTotalPoint {
  date: string;
  minutes: number;
  weekday: string;
  isFuture?: boolean;
  isMissing?: boolean;
  isOvertime?: boolean;
}

export interface AnalysisSnapshot {
  range: ExportRange;
  scenario: AnalysisScenarioId;
  variant: AnalysisVariant;
  totalMinutes: number;
  entryCount: number;
  avgMinutesPerDay: number;
  peakDay?: { date: string; minutes: number };
  dailyTotals?: DailyTotalPoint[];
  byTitle?: TitleBreakdown[];
  pendingDates?: string[];
  overtimeDates?: { date: string; minutes: number }[];
  plainTextContext: string;
  chartType: ChartType;
  showCopyReport: boolean;
}

export interface IntentResult {
  scenario: AnalysisScenarioId;
  variant?: AnalysisVariant;
  pickerAdjust?: PickerAdjust | null;
  confidence: number;
  label: string;
  clarification?: {
    question: string;
    options: { id: AnalysisScenarioId; label: string }[];
  } | null;
}

export type AnalysisBlock =
  | { type: 'label'; text: string; subtext?: string }
  | { type: 'data'; snapshot: AnalysisSnapshot }
  | { type: 'chart'; snapshot: AnalysisSnapshot }
  | { type: 'summary'; content: string; streaming?: boolean }
  | { type: 'suggestions'; items: string[]; streaming?: boolean };

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  blocks?: AnalysisBlock[];
  status?: 'pending' | 'classifying' | 'building' | 'streaming' | 'done' | 'error';
  error?: string;
}

export type AnalysisPhase = 'idle' | 'classifying' | 'building' | 'streaming';

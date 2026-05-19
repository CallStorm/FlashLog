import type { WorkLogItem } from '@/types/workLog';
import type {
  AnalysisScenarioId,
  AnalysisSnapshot,
  AnalysisVariant,
  ChartType,
  DailyTotalPoint,
  HoursAnalysisVariant,
  TitleBreakdown,
} from '@/types/analysis';
import type { ExportRange } from '@/services/export/types';
import { buildWorklogPlainText, totalMinutes } from '@/services/export/formatters';
import { filterCnWorkdaysInRange } from '@/utils/cnWorkday';
import {
  addDays,
  daysBetweenInclusive,
  fillDailyTotalsForWeek,
  getTodayLocal,
  getWeekStartMonday,
  iterDatesInclusive,
} from '@/utils/date';
import { OVERTIME_THRESHOLD_MINUTES } from '@/constants/analysisDefaults';

function resolveChartType(
  scenario: AnalysisScenarioId,
  variant: AnalysisVariant,
  presetIsWeek: boolean,
): ChartType {
  if (scenario === 'narrative_summary') {
    return variant === 'monthly' ? 'rank_bar' : 'week_bar';
  }
  const v = variant as HoursAnalysisVariant;
  if (v === 'task_breakdown') return 'rank_bar';
  if (v === 'daily_overview' || v === 'health_check') {
    return presetIsWeek ? 'week_bar' : 'rank_bar';
  }
  return 'week_bar';
}

function buildByTitle(logs: WorkLogItem[]): TitleBreakdown[] {
  const map = new Map<string, number>();
  for (const log of logs) {
    map.set(log.title, (map.get(log.title) ?? 0) + log.durationMinutes);
  }
  const total = totalMinutes(logs);
  return [...map.entries()]
    .map(([title, minutes]) => ({
      title,
      minutes,
      percent: total > 0 ? Math.round((minutes / total) * 100) : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 8);
}

function buildDailyTotals(
  logs: WorkLogItem[],
  range: ExportRange,
  pendingSet: Set<string>,
): DailyTotalPoint[] {
  const today = getTodayLocal();
  const weekStart = getWeekStartMonday(range.start);
  const filled = fillDailyTotalsForWeek(logs, weekStart);
  return filled.map((d) => ({
    ...d,
    isFuture: d.date > today,
    isMissing: pendingSet.has(d.date),
    isOvertime: d.minutes >= OVERTIME_THRESHOLD_MINUTES,
  }));
}

function buildMonthDaily(logs: WorkLogItem[], range: ExportRange): DailyTotalPoint[] {
  const byDate = new Map<string, number>();
  for (const log of logs) {
    byDate.set(log.date, (byDate.get(log.date) ?? 0) + log.durationMinutes);
  }
  const today = getTodayLocal();
  return iterDatesInclusive(range.start, range.end).map((date) => ({
    date,
    minutes: byDate.get(date) ?? 0,
    weekday: '',
    isFuture: date > today,
    isOvertime: (byDate.get(date) ?? 0) >= OVERTIME_THRESHOLD_MINUTES,
  }));
}

export async function buildAnalysisSnapshot(
  logs: WorkLogItem[],
  range: ExportRange,
  scenario: AnalysisScenarioId,
  variant: AnalysisVariant,
  isWeekRange: boolean,
): Promise<AnalysisSnapshot> {
  const total = totalMinutes(logs);
  const dayCount = Math.max(1, daysBetweenInclusive(range.start, range.end));
  const avgMinutesPerDay = Math.round(total / dayCount);

  const workdays = await filterCnWorkdaysInRange(range.start, range.end);
  const loggedDates = new Set(logs.map((l) => l.date));
  const pendingDates = workdays.filter((d) => !loggedDates.has(d) && d <= getTodayLocal());

  const dailyMap = new Map<string, number>();
  for (const log of logs) {
    dailyMap.set(log.date, (dailyMap.get(log.date) ?? 0) + log.durationMinutes);
  }
  let peakDay: { date: string; minutes: number } | undefined;
  for (const [date, minutes] of dailyMap) {
    if (!peakDay || minutes > peakDay.minutes) peakDay = { date, minutes };
  }

  const overtimeDates = [...dailyMap.entries()]
    .filter(([, m]) => m >= OVERTIME_THRESHOLD_MINUTES)
    .map(([date, minutes]) => ({ date, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  const pendingSet = new Set(pendingDates);
  const chartType = resolveChartType(scenario, variant, isWeekRange);

  let dailyTotals: DailyTotalPoint[] | undefined;
  if (chartType === 'week_bar' && isWeekRange) {
    dailyTotals = buildDailyTotals(logs, range, pendingSet);
  } else if (scenario === 'hours_analysis' && !isWeekRange) {
    dailyTotals = buildMonthDaily(logs, range);
  }

  const plainTextContext = buildWorklogPlainText(logs, range) || '（该时间范围内无工时记录）';

  return {
    range,
    scenario,
    variant,
    totalMinutes: total,
    entryCount: logs.length,
    avgMinutesPerDay,
    peakDay,
    dailyTotals,
    byTitle: buildByTitle(logs),
    pendingDates: pendingDates.slice(0, 14),
    overtimeDates,
    plainTextContext,
    chartType,
    showCopyReport: scenario === 'narrative_summary',
  };
}

export function isWeekAlignedRange(range: ExportRange): boolean {
  const startMonday = getWeekStartMonday(range.start);
  const expectedEnd = addDays(startMonday, 6);
  return range.start === startMonday && range.end === expectedEnd;
}

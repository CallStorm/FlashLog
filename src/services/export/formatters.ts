import type { WorkLogItem } from '@/types/workLog';
import {
  formatDuration,
  formatDurationHours,
  groupByDate,
} from '@/utils/date';
import type { ExportRange } from './types';

export function sortLogsForExport(logs: WorkLogItem[]): WorkLogItem[] {
  return [...logs].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.createdAt - b.createdAt;
  });
}

export function totalMinutes(logs: WorkLogItem[]): number {
  return logs.reduce((s, i) => s + i.durationMinutes, 0);
}

function formatLine(item: WorkLogItem): string {
  const desc = item.description ? `：${item.description}` : '';
  return `- [${formatDurationHours(item.durationMinutes)}] ${item.title}${desc}`;
}

export function buildWorklogPlainText(
  logs: WorkLogItem[],
  range: ExportRange,
): string {
  const sorted = sortLogsForExport(logs);
  const totalMin = totalMinutes(sorted);
  const count = sorted.length;
  const isSingleDay = range.start === range.end;

  if (count === 0) return '';

  const grouped = groupByDate(sorted);
  const dates = [...grouped.keys()].sort();

  const lines: string[] = [];

  if (isSingleDay) {
    const date = range.start;
    lines.push(date);
    for (const item of grouped.get(date) ?? []) {
      lines.push(formatLine(item));
    }
    lines.push(`合计：${formatDuration(totalMin)}（${count} 条）`);
    return lines.join('\n');
  }

  lines.push('FlashLog 工时汇总');
  lines.push(`${range.start} ~ ${range.end}`);
  lines.push(`合计：${formatDuration(totalMin)}（${count} 条）`);
  lines.push('');

  for (const date of dates) {
    lines.push(date);
    for (const item of grouped.get(date) ?? []) {
      lines.push(formatLine(item));
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

export function previewPlainText(text: string, maxLines = 8): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  return `${lines.slice(0, maxLines).join('\n')}\n…`;
}

export function buildExportFilename(
  range: ExportRange,
  ext: string,
): string {
  const compact = (d: string) => d.replace(/-/g, '');
  const base =
    range.start === range.end
      ? `FlashLog_${compact(range.start)}`
      : `FlashLog_${compact(range.start)}-${compact(range.end)}`;
  return `${base}.${ext}`;
}

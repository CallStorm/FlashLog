import { toPng } from 'html-to-image';
import type { WorkLogItem } from '@/types/workLog';
import { formatDuration, formatDurationHours, groupByDate } from '@/utils/date';
import { sortLogsForExport, totalMinutes } from '../formatters';
import type { ExportRange } from '../types';

export async function captureElementAsPng(element: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#ffffff',
  });
  const res = await fetch(dataUrl);
  return res.blob();
}

export function buildImageSummaryData(logs: WorkLogItem[], range: ExportRange) {
  const sorted = sortLogsForExport(logs);
  const grouped = groupByDate(sorted);
  const dates = [...grouped.keys()].sort();
  const totalMin = totalMinutes(sorted);
  const isSingleDay = range.start === range.end;

  return {
    title: 'FlashLog 工时',
    subtitle: isSingleDay ? range.start : `${range.start} ~ ${range.end}`,
    summary: `合计 ${formatDuration(totalMin)} · ${sorted.length} 条`,
    dates: dates.map((date) => ({
      date,
      items: (grouped.get(date) ?? []).map((item) => ({
        id: item.id,
        duration: formatDurationHours(item.durationMinutes),
        title: item.title,
        description: item.description,
      })),
    })),
  };
}

export async function buildWorklogImageFromElement(
  element: HTMLElement,
): Promise<Blob> {
  return captureElementAsPng(element);
}

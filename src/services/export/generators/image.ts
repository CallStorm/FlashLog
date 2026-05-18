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
    skipFonts: true,
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

export function waitForCaptureLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** Capture visible preview: temporarily remove scale so html-to-image gets full 750px content. */
export async function capturePreviewForExport(
  scalerEl: HTMLElement,
): Promise<Blob> {
  const captureRoot =
    (scalerEl.querySelector('.share-preview-capture-root') as HTMLElement | null) ??
    (scalerEl.firstElementChild as HTMLElement | null);

  if (!captureRoot) {
    throw new Error('预览未就绪');
  }

  const prevTransform = scalerEl.style.transform;
  const prevOrigin = scalerEl.style.transformOrigin;
  scalerEl.style.transform = 'none';
  scalerEl.style.transformOrigin = 'top left';

  try {
    await waitForCaptureLayout();
    return captureElementAsPng(captureRoot);
  } finally {
    scalerEl.style.transform = prevTransform;
    scalerEl.style.transformOrigin = prevOrigin;
  }
}

export async function buildWorklogImageFromElement(
  element: HTMLElement,
): Promise<Blob> {
  await waitForCaptureLayout();
  return captureElementAsPng(element);
}

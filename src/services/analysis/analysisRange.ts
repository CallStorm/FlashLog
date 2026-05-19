import type { ExportRange } from '@/services/export/types';
import type { PickerPreset } from '@/types/analysis';
import {
  getLastWeekRangeMondaySunday,
  getThisMonthRange,
  getWeekRangeMondaySunday,
} from '@/utils/date';

export function rangeForPreset(preset: PickerPreset): ExportRange {
  switch (preset) {
    case 'this_week':
      return getWeekRangeMondaySunday();
    case 'last_week':
      return getLastWeekRangeMondaySunday();
    case 'this_month':
      return getThisMonthRange();
    case 'custom':
      return getWeekRangeMondaySunday();
  }
}

/** @deprecated use resolveActiveRange */
export function rangeForPicker(preset: PickerPreset): ExportRange {
  return rangeForPreset(preset);
}

export function resolveActiveRange(
  preset: PickerPreset,
  customRange: ExportRange,
): ExportRange {
  if (preset === 'custom') return customRange;
  return rangeForPreset(preset);
}

export function defaultCustomRange(): ExportRange {
  return getWeekRangeMondaySunday();
}

export const PICKER_OPTIONS: { id: PickerPreset; label: string }[] = [
  { id: 'this_week', label: '本周' },
  { id: 'last_week', label: '上周' },
  { id: 'this_month', label: '本月' },
  { id: 'custom', label: '自定义' },
];

export function rangesEqual(a: ExportRange, b: ExportRange): boolean {
  return a.start === b.start && a.end === b.end;
}

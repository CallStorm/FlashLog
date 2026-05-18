import * as XLSX from 'xlsx';
import type { WorkLogItem } from '@/types/workLog';
import { formatDuration, formatWeekday } from '@/utils/date';
import { sortLogsForExport, totalMinutes } from '../formatters';
import type { ExportRange } from '../types';

function hoursDecimal(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

function setSheetCellString(
  sheet: XLSX.WorkSheet,
  r: number,
  c: number,
  value: string,
): void {
  const ref = XLSX.utils.encode_cell({ r, c });
  sheet[ref] = { t: 's', v: value, w: value };
}

export function buildWorklogXlsx(logs: WorkLogItem[], range: ExportRange): Blob {
  const sorted = sortLogsForExport(logs);
  const header = ['日期', '星期', '任务', '工时(h)', '描述'];
  const rows: (string | number)[][] = [header];

  for (const item of sorted) {
    rows.push([
      item.date,
      formatWeekday(item.date),
      item.title,
      hoursDecimal(item.durationMinutes),
      item.description,
    ]);
  }

  const totalMin = totalMinutes(sorted);
  rows.push([]);
  rows.push([
    '合计',
    '',
    `${sorted.length} 条`,
    hoursDecimal(totalMin),
    formatDuration(totalMin),
  ]);
  const rangeRowIndex = rows.length;
  rows.push(['范围', '', `${range.start} ~ ${range.end}`, '', '']);

  const sheet = XLSX.utils.aoa_to_sheet(rows);

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]!;
    const row = i + 1;
    setSheetCellString(sheet, row, 0, item.date);
    setSheetCellString(sheet, row, 1, formatWeekday(item.date));
  }

  setSheetCellString(sheet, rangeRowIndex, 2, `${range.start} ~ ${range.end}`);

  sheet['!cols'] = [{ wch: 14 }, { wch: 6 }, { wch: 24 }, { wch: 10 }, { wch: 40 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, '工时');
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

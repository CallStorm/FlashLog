import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { WorkLogItem } from '@/types/workLog';
import { formatDuration, formatWeekday } from '@/utils/date';
import { sortLogsForExport, totalMinutes } from '../formatters';
import type { ExportRange } from '../types';

function hoursDecimal(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

function cell(text: string, bold = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold })],
      }),
    ],
  });
}

export async function buildWorklogDocx(
  logs: WorkLogItem[],
  range: ExportRange,
): Promise<Blob> {
  const sorted = sortLogsForExport(logs);
  const totalMin = totalMinutes(sorted);
  const isSingleDay = range.start === range.end;

  const headerRow = new TableRow({
    children: ['日期', '星期', '任务', '工时(h)', '描述'].map((h) => cell(h, true)),
  });

  const dataRows = sorted.map(
    (item) =>
      new TableRow({
        children: [
          cell(item.date),
          cell(formatWeekday(item.date)),
          cell(item.title),
          cell(String(hoursDecimal(item.durationMinutes))),
          cell(item.description),
        ],
      }),
  );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });

  const title =
    isSingleDay
      ? `FlashLog 工时 · ${range.start}`
      : 'FlashLog 工时汇总';

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: isSingleDay
                  ? `共 ${formatDuration(totalMin)}，${sorted.length} 条记录`
                  : `${range.start} ~ ${range.end} · 共 ${formatDuration(totalMin)}，${sorted.length} 条记录`,
              }),
            ],
          }),
          table,
          new Paragraph({
            children: [
              new TextRun({
                text: `合计：${formatDuration(totalMin)}（${sorted.length} 条）`,
                bold: true,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

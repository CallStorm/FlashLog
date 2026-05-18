import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { WorkLogItem } from '@/types/workLog';
import { formatDuration, formatDurationHours, formatWeekday, groupByDate } from '@/utils/date';
import { sortLogsForExport, totalMinutes } from '../formatters';
import type { ExportRange } from '../types';

const COLUMN_WIDTHS = [1200, 800, 3500, 1000, 4000] as const;
const BORDER_COLOR = 'CCCCCC';

function hoursDecimal(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

function cellBorders() {
  const edge = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
  return { top: edge, bottom: edge, left: edge, right: edge };
}

function cell(text: string, colIndex: number, bold = false): TableCell {
  const display = text.trim() ? text : '—';
  return new TableCell({
    width: { size: COLUMN_WIDTHS[colIndex], type: WidthType.DXA },
    borders: cellBorders(),
    children: [
      new Paragraph({
        children: [new TextRun({ text: display, bold })],
      }),
    ],
  });
}

function buildDetailParagraphs(logs: WorkLogItem[]): Paragraph[] {
  const sorted = sortLogsForExport(logs);
  const grouped = groupByDate(sorted);
  const dates = [...grouped.keys()].sort();
  const paragraphs: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: '明细（文本）', bold: true })],
      spacing: { before: 240, after: 120 },
    }),
  ];

  for (const date of dates) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: date, bold: true })],
        spacing: { before: 120 },
      }),
    );
    for (const item of grouped.get(date) ?? []) {
      const desc = item.description ? `：${item.description}` : '';
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `- [${formatDurationHours(item.durationMinutes)}] ${item.title}${desc}`,
            }),
          ],
        }),
      );
    }
  }

  return paragraphs;
}

export async function buildWorklogDocx(
  logs: WorkLogItem[],
  range: ExportRange,
): Promise<Blob> {
  const sorted = sortLogsForExport(logs);
  const totalMin = totalMinutes(sorted);
  const isSingleDay = range.start === range.end;

  const headerRow = new TableRow({
    tableHeader: true,
    children: ['日期', '星期', '任务', '工时(h)', '描述'].map((h, i) =>
      cell(h, i, true),
    ),
  });

  const dataRows = sorted.map(
    (item) =>
      new TableRow({
        children: [
          cell(item.date, 0),
          cell(formatWeekday(item.date), 1),
          cell(item.title, 2),
          cell(String(hoursDecimal(item.durationMinutes)), 3),
          cell(item.description, 4),
        ],
      }),
  );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    columnWidths: [...COLUMN_WIDTHS],
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
            spacing: { before: 120 },
          }),
          ...buildDetailParagraphs(logs),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

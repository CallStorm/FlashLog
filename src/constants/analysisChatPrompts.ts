import type { ExportRange } from '@/services/export/types';
import { formatRangeLabel } from '@/utils/date';

export function buildAnalysisChatSystemPrompt(
  workContext: string,
  range: ExportRange,
): string {
  const rangeLabel =
    range.start === range.end
      ? range.start
      : `${range.start} ~ ${range.end}`;

  return `你是 FlashLog 工时分析助手。根据用户的问题，结合下方提供的工时记录自由回答。

要求：
- 只能引用下方工时记录中的真实数据，禁止编造未出现的日期、工时或任务
- 按用户问题的意图回答（总结、分析趋势、写周报、给建议等均可）
- 使用自然、对话式的 Markdown，段落清晰即可
- 不要强制使用固定模板或固定标题结构
- 若该时段无记录，如实说明并建议用户补记

【分析时间范围】${rangeLabel}（${formatRangeLabel(range.start, range.end)}）

【工时记录】
${workContext || '（该时间范围内无工时记录）'}`;
}

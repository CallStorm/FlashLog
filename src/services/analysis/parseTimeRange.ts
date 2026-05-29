import { TIME_RANGE_SYSTEM_PROMPT } from '@/constants/analysisTimePrompt';
import type { ExportRange } from '@/services/export/types';
import { chatCompletion } from '@/services/analysis/llmChat';
import {
  addDays,
  getLastMonthRange,
  getLastWeekRangeMondaySunday,
  getThisMonthRange,
  getTodayLocal,
  getWeekRangeMondaySunday,
} from '@/utils/date';

export interface ParseTimeRangeOptions {
  text: string;
  baseUrl?: string;
  model?: string;
  lastResolvedRange?: ExportRange | null;
  signal?: AbortSignal;
}

export interface ParseTimeRangeResult {
  range: ExportRange | null;
  source: 'rules' | 'llm' | 'inherited' | null;
}

const FOLLOW_UP_RE =
  /再|详细|继续|还有|补充|展开|多说|具体|进一步|刚才|上面|之前/;

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

function parseRules(text: string): ExportRange | null {
  const t = text.trim();

  if (includesAny(t, ['上周', '上一周', '上星期'])) {
    return getLastWeekRangeMondaySunday();
  }
  if (includesAny(t, ['上个月', '上月', '上一月'])) {
    return getLastMonthRange();
  }
  if (includesAny(t, ['本月', '这个月', '当月'])) {
    return getThisMonthRange();
  }
  if (includesAny(t, ['本周', '这一周', '这周', '本星期'])) {
    return getWeekRangeMondaySunday();
  }

  const today = getTodayLocal();
  if (includesAny(t, ['今天', '今日'])) {
    return { start: today, end: today };
  }
  if (includesAny(t, ['昨天', '昨日'])) {
    const d = addDays(today, -1);
    return { start: d, end: d };
  }

  const recentDays = t.match(/最近\s*(\d+)\s*天/);
  if (recentDays) {
    const n = Math.min(Math.max(parseInt(recentDays[1], 10), 1), 90);
    return { start: addDays(today, -(n - 1)), end: today };
  }

  const isoRange = t.match(
    /(\d{4}-\d{2}-\d{2})\s*(?:到|至|~|～|-)\s*(\d{4}-\d{2}-\d{2})/,
  );
  if (isoRange) {
    return { start: isoRange[1], end: isoRange[2] };
  }

  const cnRange = t.match(
    /(\d{1,2})\s*月\s*(\d{1,2})\s*日?\s*(?:到|至|~|～|-)\s*(\d{1,2})\s*日?/,
  );
  if (cnRange) {
    const year = new Date().getFullYear();
    const m = String(parseInt(cnRange[1], 10)).padStart(2, '0');
    const d1 = String(parseInt(cnRange[2], 10)).padStart(2, '0');
    const d2 = String(parseInt(cnRange[3], 10)).padStart(2, '0');
    return { start: `${year}-${m}-${d1}`, end: `${year}-${m}-${d2}` };
  }

  const singleIso = t.match(/\d{4}-\d{2}-\d{2}/);
  if (singleIso) {
    return { start: singleIso[0], end: singleIso[0] };
  }

  return null;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('invalid json');
  }
}

function normalizeLlmRange(raw: unknown): ExportRange | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as { start?: string | null; end?: string | null };
  if (!o.start || !o.end) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.start)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.end)) return null;
  const start = o.start <= o.end ? o.start : o.end;
  const end = o.start <= o.end ? o.end : o.start;
  return { start, end };
}

async function parseWithLlm(
  text: string,
  baseUrl: string,
  model: string,
  signal?: AbortSignal,
): Promise<ExportRange | null> {
  const today = getTodayLocal();
  const userPayload = `当前日期：${today}\n\n用户问题：${text}`;

  try {
    const raw = await chatCompletion({
      baseUrl,
      model,
      messages: [
        { role: 'system', content: TIME_RANGE_SYSTEM_PROMPT },
        { role: 'user', content: userPayload },
      ],
      stream: false,
      maxTokens: 128,
      temperature: 0,
      signal,
    });
    return normalizeLlmRange(extractJson(raw));
  } catch {
    return null;
  }
}

function looksLikeFollowUp(text: string): boolean {
  return FOLLOW_UP_RE.test(text) && !parseRules(text);
}

export async function parseTimeRangeFromQuestion(
  options: ParseTimeRangeOptions,
): Promise<ParseTimeRangeResult> {
  const ruleRange = parseRules(options.text);
  if (ruleRange) {
    return { range: ruleRange, source: 'rules' };
  }

  if (options.lastResolvedRange && looksLikeFollowUp(options.text)) {
    return { range: options.lastResolvedRange, source: 'inherited' };
  }

  if (options.baseUrl && options.model?.trim()) {
    const llmRange = await parseWithLlm(
      options.text,
      options.baseUrl,
      options.model,
      options.signal,
    );
    if (llmRange) {
      return { range: llmRange, source: 'llm' };
    }
  }

  return { range: null, source: null };
}

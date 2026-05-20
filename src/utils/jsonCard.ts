import type { WorkLogCardDraft } from '@/types/workLog';
import type { WorkCategorySettings } from '@/types/settings';
import { inferCategoryFromText } from '@/utils/workCategory';

export interface ParsedCardResult {
  ok: true;
  card: WorkLogCardDraft;
}

export interface ParsedCardError {
  ok: false;
  raw: string;
  message: string;
}

export type ParseCardOutcome = ParsedCardResult | ParsedCardError;

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return null;
}

export interface ParseWorkLogCardOptions {
  allowedCategoryIds: string[];
  defaultCategoryId: string;
  sourceText?: string;
  workCategories?: WorkCategorySettings;
}

export function parseWorkLogCard(
  text: string,
  fallbackDate: string,
  categoryOptions?: ParseWorkLogCardOptions,
): ParseCardOutcome {
  const jsonStr = extractJsonObject(text);
  if (!jsonStr) {
    return { ok: false, raw: text, message: '未找到 JSON 对象' };
  }

  try {
    const data = JSON.parse(jsonStr) as Record<string, unknown>;
    const date =
      typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date)
        ? data.date
        : fallbackDate;
    const title = typeof data.title === 'string' ? data.title.trim() : '';
    const durationMinutes =
      typeof data.durationMinutes === 'number'
        ? Math.round(data.durationMinutes)
        : Number(data.durationMinutes) || 0;
    const description =
      typeof data.description === 'string' ? data.description.trim() : '';

    if (!title) {
      return { ok: false, raw: text, message: '缺少 title 字段' };
    }

    const defaultCat =
      categoryOptions?.defaultCategoryId ??
      categoryOptions?.allowedCategoryIds?.[0] ??
      '';
    let category =
      typeof data.category === 'string' ? data.category.trim() : '';
    if (
      categoryOptions &&
      (!category || !categoryOptions.allowedCategoryIds.includes(category))
    ) {
      category = defaultCat;
    }

    if (
      categoryOptions?.workCategories &&
      categoryOptions.sourceText &&
      category === categoryOptions.defaultCategoryId
    ) {
      const inferred = inferCategoryFromText(
        `${categoryOptions.sourceText} ${title} ${description}`,
        categoryOptions.workCategories,
      );
      if (
        inferred &&
        inferred !== categoryOptions.defaultCategoryId &&
        categoryOptions.allowedCategoryIds.includes(inferred)
      ) {
        category = inferred;
      }
    }

    return {
      ok: true,
      card: {
        date,
        title,
        category,
        durationMinutes: Math.max(1, durationMinutes),
        description,
      },
    };
  } catch {
    return { ok: false, raw: text, message: 'JSON 解析失败' };
  }
}

import type { WorkCategorySettings } from '@/types/settings';
import type { WorkLogItem } from '@/types/workLog';

export function buildCategoryClassificationBlock(
  workCategories: WorkCategorySettings,
): string {
  const lines = workCategories.categories.map((c) =>
    c.id === c.name ? `- ${c.id}` : `- ${c.id}（${c.name}）`,
  );
  return [
    '【工时大类 category — 分类指南】',
    '根据工作内容语义，从下列 id 中选一个写入 category；无法判断时使用默认 id。',
    ...lines,
    `默认 id：${workCategories.defaultCategoryId}`,
  ].join('\n');
}

export function categoryIdFromName(name: string): string {
  return name.trim();
}

export function normalizeWorkCategories(
  raw?: Partial<WorkCategorySettings> | null,
): WorkCategorySettings {
  if (!raw?.categories?.length) {
    return { categories: [], defaultCategoryId: '' };
  }

  const categories = raw.categories
    .filter((c) => c?.id && c?.name)
    .map((c) => ({ id: String(c.id), name: String(c.name).trim() }));

  if (categories.length === 0) {
    return { categories: [], defaultCategoryId: '' };
  }

  const defaultCategoryId = categories.some((c) => c.id === raw.defaultCategoryId)
    ? raw.defaultCategoryId!
    : categories[0].id;
 
  return { categories, defaultCategoryId };
}

export function categoryNameById(
  settings: WorkCategorySettings,
  id: string,
): string {
  const found = settings.categories.find((c) => c.id === id);
  if (found) return found.name;
  if (!id) return '未分类';
  return '已删除大类';
}

export function resolveLogCategory(
  log: WorkLogItem,
  defaultCategoryId: string,
): string {
  const c = log.category?.trim();
  return c || defaultCategoryId;
}

export function buildCategoryNamesMap(
  settings: WorkCategorySettings,
): Record<string, string> {
  return Object.fromEntries(settings.categories.map((c) => [c.id, c.name]));
}

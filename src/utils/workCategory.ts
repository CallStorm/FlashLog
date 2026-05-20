import type { WorkCategorySettings } from '@/types/settings';
import type { WorkLogItem } from '@/types/workLog';

export const DEFAULT_CATEGORY_SEMANTICS: Record<string, string> = {
  project: '客户项目、交付、实施、联调、验收、驻场',
  rnd: '产品研发、编码、技术方案、架构、自研工具、改 bug',
  biz: '商机、售前、商务、报价、投标、客户拓展',
  ops: '运营、活动、内容、数据报表、流程支持',
};

const CATEGORY_MATCH_KEYWORDS: Record<string, string[]> = {
  project: ['项目', '交付', '实施', '联调', '验收', '驻场', '客户'],
  rnd: ['研发', '编码', '开发', 'bug', '架构', '技术方案', '自研', '写代码'],
  biz: ['商机', '售前', '商务', '报价', '投标', '拓展', '方案'],
  ops: ['运营', '活动', '内容', '报表', '流程'],
};

export function buildCategoryClassificationBlock(
  workCategories: WorkCategorySettings,
): string {
  const lines = workCategories.categories.map((c) => {
    const sem =
      DEFAULT_CATEGORY_SEMANTICS[c.id] ??
      `与「${c.name}」相关的工作`;
    return `- ${c.id}（${c.name}）：${sem}`;
  });
  return [
    '【工时大类 category — 分类指南】',
    '你必须根据用户口述/输入的工作内容语义选择 category，禁止无依据一律使用默认 id。',
    '仅当内容与下列所有大类均明显无关时，才使用默认 id。',
    ...lines,
    '示例：写代码/改 bug → rnd；客户交付/联调 → project；售前方案 → biz；运营活动 → ops。',
    `默认 id（最后手段）：${workCategories.defaultCategoryId}`,
  ].join('\n');
}

export function inferCategoryFromText(
  text: string,
  workCategories: WorkCategorySettings,
): string | null {
  const lower = text.toLowerCase();
  let bestId: string | null = null;
  let bestScore = 0;

  for (const cat of workCategories.categories) {
    let score = 0;
    const keywords = [
      ...(CATEGORY_MATCH_KEYWORDS[cat.id] ?? []),
      cat.name,
    ];
    for (const kw of keywords) {
      if (kw && lower.includes(kw.toLowerCase())) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = cat.id;
    }
  }
  return bestScore >= 1 ? bestId : null;
}

export const DEFAULT_WORK_CATEGORIES: WorkCategorySettings = {
  defaultCategoryId: 'project',
  categories: [
    { id: 'project', name: '项目类' },
    { id: 'rnd', name: '产研类' },
    { id: 'biz', name: '商机类' },
    { id: 'ops', name: '运营类' },
  ],
};

export function slugifyCategoryName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'cat';
}

export function newCategoryId(name: string): string {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slugifyCategoryName(name)}-${suffix}`;
}

export function normalizeWorkCategories(
  raw?: Partial<WorkCategorySettings> | null,
): WorkCategorySettings {
  const defaults = structuredClone(DEFAULT_WORK_CATEGORIES);
  if (!raw?.categories?.length) return defaults;

  const categories = raw.categories
    .filter((c) => c?.id && c?.name)
    .map((c) => ({ id: String(c.id), name: String(c.name).trim() }));

  if (categories.length === 0) return defaults;

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

import type {
  AnalysisScenarioId,
  AnalysisVariant,
  HoursAnalysisVariant,
  IntentResult,
  NarrativeVariant,
} from '@/types/analysis';
const DEFAULT_HOURS_VARIANT: HoursAnalysisVariant = 'daily_overview';

const HOURS_VARIANTS: HoursAnalysisVariant[] = [
  'daily_overview',
  'task_breakdown',
  'health_check',
];

const NARRATIVE_VARIANTS: NarrativeVariant[] = [
  'weekly',
  'monthly',
  'performance',
  'custom',
];

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

export function resolveIntentRules(userText: string): IntentResult {
  const t = userText.trim().toLowerCase();

  let pickerAdjust: IntentResult['pickerAdjust'] = null;
  if (includesAny(t, ['上周', '上一周', '上星期'])) pickerAdjust = 'last_week';
  else if (includesAny(t, ['本月', '这个月', '当月'])) pickerAdjust = 'this_month';
  else if (includesAny(t, ['本周', '这一周', '这周'])) pickerAdjust = 'this_week';

  if (
    includesAny(t, ['周报', '月报', '绩效', '考核', '汇报', 'leader', '领导', '总结稿', '工作报告'])
  ) {
    let variant: NarrativeVariant = 'weekly';
    if (includesAny(t, ['月报', '本月', '这个月'])) variant = 'monthly';
    else if (includesAny(t, ['绩效', '考核'])) variant = 'performance';
    else if (includesAny(t, ['bullet', '三条', '格式'])) variant = 'custom';
    return {
      scenario: 'narrative_summary',
      variant,
      pickerAdjust,
      confidence: 0.75,
      label: variant === 'monthly' ? '总结-月报' : variant === 'performance' ? '总结-绩效' : '总结-周报',
    };
  }

  let hoursVariant: HoursAnalysisVariant = DEFAULT_HOURS_VARIANT;
  if (includesAny(t, ['花在哪', '任务', '项目', '分布', '占比', '做什么'])) {
    hoursVariant = 'task_breakdown';
  } else if (includesAny(t, ['漏记', '没记', '补记', '缺失', '加班', '超过', '10小时', '10 小时'])) {
    hoursVariant = 'health_check';
  }

  return {
    scenario: 'hours_analysis',
    variant: hoursVariant,
    pickerAdjust,
    confidence: 0.7,
    label: hoursVariant === 'task_breakdown' ? '工时分析-任务' : hoursVariant === 'health_check' ? '工时分析-检查' : '工时分析',
  };
}

export function normalizeIntentResult(raw: unknown): IntentResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const scenario = o.scenario as AnalysisScenarioId;
  if (scenario !== 'hours_analysis' && scenario !== 'narrative_summary') return null;

  let variant = o.variant as AnalysisVariant | undefined;
  if (scenario === 'hours_analysis') {
    if (!variant || !HOURS_VARIANTS.includes(variant as HoursAnalysisVariant)) {
      variant = DEFAULT_HOURS_VARIANT;
    }
  } else if (!variant || !NARRATIVE_VARIANTS.includes(variant as NarrativeVariant)) {
    variant = 'weekly';
  }

  const confidence = typeof o.confidence === 'number' ? o.confidence : 0.8;
  const label = typeof o.label === 'string' ? o.label : scenario === 'hours_analysis' ? '工时分析' : '总结';

  let pickerAdjust = o.pickerAdjust as IntentResult['pickerAdjust'];
  if (
    pickerAdjust !== 'this_week' &&
    pickerAdjust !== 'last_week' &&
    pickerAdjust !== 'this_month' &&
    pickerAdjust !== 'custom'
  ) {
    pickerAdjust = null;
  }

  return {
    scenario,
    variant,
    pickerAdjust,
    confidence,
    label,
    clarification: null,
  };
}

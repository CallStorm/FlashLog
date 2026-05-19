import type { ExportRange } from '@/services/export/types';
import type { AnalysisScenarioId, NarrativeVariant, PickerPreset } from '@/types/analysis';
import { daysBetweenInclusive } from '@/utils/date';

export interface ScenarioDef {
  id: AnalysisScenarioId;
  chipLabel: string;
  description: string;
  defaultUserMessage: string;
}

export const ANALYSIS_SCENARIOS: ScenarioDef[] = [
  {
    id: 'hours_analysis',
    chipLabel: '工时分析',
    description: '分析选定时间范围内的工时结构，给出总结与建议',
    defaultUserMessage: '分析当前时间范围内的工时情况，给出总结和建议',
  },
  {
    id: 'narrative_summary',
    chipLabel: '总结',
    description: '根据记录生成周报、月报或绩效等叙述文稿',
    defaultUserMessage: '根据当前时间范围内的记录写一份工作总结',
  },
];

export function defaultNarrativeVariant(
  picker: PickerPreset,
  activeRange?: ExportRange,
): NarrativeVariant {
  if (picker === 'this_month') return 'monthly';
  if (picker === 'custom' && activeRange) {
    return daysBetweenInclusive(activeRange.start, activeRange.end) > 20
      ? 'monthly'
      : 'weekly';
  }
  return 'weekly';
}

export function scenarioById(id: AnalysisScenarioId): ScenarioDef {
  const found = ANALYSIS_SCENARIOS.find((s) => s.id === id);
  if (!found) return ANALYSIS_SCENARIOS[0];
  return found;
}

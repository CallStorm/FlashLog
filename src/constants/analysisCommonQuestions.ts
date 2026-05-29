export interface CommonQuestion {
  id: string;
  label: string;
  prompt?: string;
}

export const ANALYSIS_COMMON_QUESTIONS: CommonQuestion[] = [
  { id: 'this_week', label: '总结这周的工作' },
  { id: 'last_month', label: '上个月我主要做了哪些工作' },
  { id: 'hours_overview', label: '分析一下这段时间的工时分布' },
];

import type { AnalysisSnapshot } from '@/types/analysis';

const OUTPUT_FORMAT = `必须严格按以下 Markdown 结构输出（不要省略标题）：

## 总结
（正文）

## 建议
- 建议条目一
- 建议条目二

不要输出图表或原始 JSON。`;

const SUMMARY_STRUCTURE_HOURS = `【总结正文格式 — 严格遵守，勿在 ## 总结 下再套 ##】

**整体情况**
（2~4 句：总工时、条数、高峰日或均衡度，只引用统计数据）

**任务与时间分布**
**项目类**（占总工时 xx%）
- Top任务名：xh（占区间 y%）
（按【按大类汇总】顺序，每个大类一行加粗标题 + 1~3 条列表；数字与统计一致）`;

const HOURS_BASE = `你是 FlashLog 工时分析助手。你只能根据用户提供的工时统计数据回答，禁止编造未出现的日期、工时或任务。

【总结要求】
${SUMMARY_STRUCTURE_HOURS}
- 段与段、节与节之间空一行
- **任务与时间分布**须按【按大类汇总】的大类顺序，不得打乱
- 只引用统计区间内的真实数字、日期、大类名称、任务名称

【建议要求】
- 输出 2~4 条，每条一行，以 - 开头
- 每条格式：- **改进方向**：（问题，引用具体任务名/日期） — **具体行动**：（下周可执行的一步）
- 须具指导意义，帮助后续改进工作：补记漏填、拆分杂项任务、均衡每日投入、补充过简描述、超长日适当放缓等（仅选与数据相关的）
- 禁止空话：「继续努力」「注意平衡」等无依据套话`;

const NARRATIVE_BASE = `你是 FlashLog 工时分析助手。你只能根据用户提供的工时统计数据撰写文稿，禁止编造。

【总结要求】
- 此处为可直接提交的工作总结正文（周报/月报/绩效话术）
- 多段落，段间空一行；语言职场化、精炼
- 鼓励用 **小节名** 分段（如 **本周工作**、**数据摘要**）；若有【按大类汇总】，任务分布按大类分段书写

【建议要求】
- 1~2 条后续工作可关注点
- 格式同：- **改进方向**：… — **具体行动**：…
- 不要重复总结正文，侧重下一步计划`;

function variantHint(snapshot: AnalysisSnapshot): string {
  if (snapshot.scenario === 'narrative_summary') {
    switch (snapshot.variant) {
      case 'monthly':
        return '总结请按月度工作汇报风格，可分「本月工作」「数据摘要」等小节。';
      case 'performance':
        return '总结请按绩效考核口径，突出成果与量化贡献。';
      case 'custom':
        return '按用户问题要求的格式撰写总结。';
      default:
        return '总结请按周报风格，适合发给 leader。';
    }
  }
  switch (snapshot.variant) {
    case 'task_breakdown':
      return '总结须按大类对比工时占比，并点出各类内 Top 任务是否过于分散；建议含任务合并或聚焦主线。';
    case 'health_check':
      return '总结须说明漏记工作日与超长工时日；建议含补记优先级。';
    case 'daily_overview':
    default:
      return '总结须点出高峰日、日均水平与周内是否均衡。';
  }
}

export function buildAnalysisAnswerSystemPrompt(snapshot: AnalysisSnapshot): string {
  const base =
    snapshot.scenario === 'narrative_summary' ? NARRATIVE_BASE : HOURS_BASE;
  return [
    base,
    variantHint(snapshot),
    OUTPUT_FORMAT,
    `当前场景：${snapshot.scenario}，子类型：${snapshot.variant}`,
    `统计区间：${snapshot.range.start} ~ ${snapshot.range.end}`,
    `统计数据：\n${snapshot.plainTextContext}`,
  ].join('\n\n');
}

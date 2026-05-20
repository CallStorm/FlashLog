import { Loader2 } from 'lucide-react';
import { AnalysisSection } from '@/components/analysis/AnalysisSection';
import { AnalysisSummaryActions } from '@/components/analysis/AnalysisSummaryActions';
import { AnalysisStatCards } from '@/components/analysis/AnalysisStatCards';
import { AnalysisBarChart } from '@/components/analysis/AnalysisBarChart';
import { AnalysisRankList } from '@/components/analysis/AnalysisRankList';
import { AnalysisCategoryTable } from '@/components/analysis/AnalysisCategoryTable';
import { AnalysisSuggestions } from '@/components/analysis/AnalysisSuggestions';
import { formatAnalysisText } from '@/components/analysis/formatAnalysisText';
import type { AnalysisBlock, ChatMessage } from '@/types/analysis';

function resolveRangeLabel(blocks: AnalysisBlock[] | undefined): string {
  const data = blocks?.find((b) => b.type === 'data');
  if (data?.type === 'data') {
    const { start, end } = data.snapshot.range;
    return start === end ? start : `${start} ~ ${end}`;
  }
  const label = blocks?.find((b) => b.type === 'label');
  if (label?.type === 'label' && label.subtext) {
    const m = label.subtext.match(/范围[：:]\s*(.+)/);
    if (m?.[1]) return m[1].trim();
  }
  return '';
}

function BlockView({
  block,
  messageBlocks,
}: {
  block: AnalysisBlock;
  messageBlocks?: AnalysisBlock[];
}) {
  switch (block.type) {
    case 'label':
      return (
        <p className="analysis-intent-label">
          <span className="font-medium">已理解：{block.text}</span>
          {block.subtext && <span className="analysis-intent-sub">{block.subtext}</span>}
        </p>
      );
    case 'data': {
      const s = block.snapshot;
      if (s.entryCount === 0) {
        return <p className="analysis-empty-data">该时间范围内暂无工时记录</p>;
      }
      return (
        <AnalysisSection title="数据">
          <AnalysisStatCards snapshot={s} />
          {s.pendingDates && s.pendingDates.length > 0 && (
            <p className="analysis-meta-line">
              待补记工作日：{s.pendingDates.slice(0, 5).join('、')}
              {s.pendingDates.length > 5 ? ` 等 ${s.pendingDates.length} 天` : ''}
            </p>
          )}
        </AnalysisSection>
      );
    }
    case 'chart': {
      const s = block.snapshot;
      if (s.entryCount === 0) return null;
      const hasCategory = Boolean(s.byCategory?.length);
      const showWeekBar =
        s.chartType === 'week_bar' && s.dailyTotals && s.dailyTotals.length > 0;
      const showRank =
        !hasCategory &&
        s.chartType === 'rank_bar' &&
        s.byTitle &&
        s.byTitle.length > 0;
      if (!showWeekBar && !hasCategory && !showRank && s.chartType === 'none') {
        return null;
      }
      return (
        <>
          {showWeekBar && (
            <AnalysisSection title="图表">
              <AnalysisBarChart days={s.dailyTotals!} />
            </AnalysisSection>
          )}
          {hasCategory && (
            <AnalysisSection title="任务分布">
              <AnalysisCategoryTable categories={s.byCategory!} />
            </AnalysisSection>
          )}
          {showRank && (
            <AnalysisSection title={showWeekBar ? '任务排行' : '图表'}>
              <AnalysisRankList items={s.byTitle!} />
            </AnalysisSection>
          )}
          {!hasCategory &&
            s.chartType === 'rank_bar' &&
            (!s.byTitle || s.byTitle.length === 0) && (
              <AnalysisSection title="图表">
                <p className="text-sm text-[var(--color-text-muted)]">
                  暂无任务数据
                </p>
              </AnalysisSection>
            )}
        </>
      );
    }
    case 'summary':
      return (
        <AnalysisSection title="总结">
          <div className="analysis-summary-body">
            {formatAnalysisText(block.content)}
            {block.streaming && (
              <span className="analysis-cursor" aria-hidden>
                ▍
              </span>
            )}
          </div>
          {block.content && !block.streaming && (
            <AnalysisSummaryActions
              content={block.content}
              rangeLabel={resolveRangeLabel(messageBlocks)}
            />
          )}
        </AnalysisSection>
      );
    case 'suggestions':
      return (
        <AnalysisSection title="建议">
          <AnalysisSuggestions items={block.items} streaming={block.streaming} />
        </AnalysisSection>
      );
    default:
      return null;
  }
}

export function AnalysisMessage({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="analysis-msg analysis-msg-user">
        <p>{message.content}</p>
      </div>
    );
  }

  const loading =
    message.status === 'classifying' ||
    message.status === 'building' ||
    message.status === 'streaming';

  return (
    <div className="analysis-msg analysis-msg-assistant">
      {message.status === 'classifying' && (
        <p className="analysis-loading">
          <Loader2 className="inline h-4 w-4 animate-spin" /> 正在理解问题…
        </p>
      )}
      {message.status === 'building' && !message.blocks?.length && (
        <p className="analysis-loading">
          <Loader2 className="inline h-4 w-4 animate-spin" /> 正在整理数据…
        </p>
      )}
      {message.blocks?.map((block, i) => (
        <BlockView key={i} block={block} messageBlocks={message.blocks} />
      ))}
      {message.status === 'streaming' && !message.blocks?.some((b) => b.type === 'summary') && (
        <p className="analysis-loading">
          <Loader2 className="inline h-4 w-4 animate-spin" /> 正在生成总结与建议…
        </p>
      )}
      {message.status === 'error' && (
        <p className="analysis-error">{message.error ?? '生成失败'}</p>
      )}
      {loading && message.status === 'streaming' && message.blocks?.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">处理中…</p>
      )}
    </div>
  );
}

export function buildAssistantBlocksFromSnapshot(
  snapshot: import('@/types/analysis').AnalysisSnapshot,
  label: string,
  subtext?: string,
): import('@/types/analysis').AnalysisBlock[] {
  const blocks: import('@/types/analysis').AnalysisBlock[] = [
    { type: 'label', text: label, subtext },
    { type: 'data', snapshot },
  ];
  if (
    snapshot.entryCount > 0 &&
    (snapshot.chartType !== 'none' || (snapshot.byCategory?.length ?? 0) > 0)
  ) {
    blocks.push({ type: 'chart', snapshot });
  }
  blocks.push(
    { type: 'summary', content: '', streaming: true },
    { type: 'suggestions', items: [], streaming: true },
  );
  return blocks;
}

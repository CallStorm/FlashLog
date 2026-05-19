import { useState } from 'react';
import { Clipboard, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Clipboard as CapClipboard } from '@capacitor/clipboard';
import { AnalysisSection } from '@/components/analysis/AnalysisSection';
import { AnalysisStatCards } from '@/components/analysis/AnalysisStatCards';
import { AnalysisBarChart } from '@/components/analysis/AnalysisBarChart';
import { AnalysisRankList } from '@/components/analysis/AnalysisRankList';
import type { AnalysisBlock, ChatMessage } from '@/types/analysis';
function BlockView({ block, showCopy }: { block: AnalysisBlock; showCopy?: boolean }) {
  const [copied, setCopied] = useState(false);

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
      if (s.entryCount === 0 || s.chartType === 'none') return null;
      return (
        <AnalysisSection title="图表">
          {s.chartType === 'week_bar' && s.dailyTotals && (
            <AnalysisBarChart days={s.dailyTotals} />
          )}
          {s.chartType === 'rank_bar' && s.byTitle && s.byTitle.length > 0 && (
            <AnalysisRankList items={s.byTitle} />
          )}
          {s.chartType === 'rank_bar' && (!s.byTitle || s.byTitle.length === 0) && (
            <p className="text-sm text-[var(--color-text-muted)]">暂无任务数据</p>
          )}
        </AnalysisSection>
      );
    }
    case 'summary':
      return (
        <AnalysisSection title="总结">
          <div className="analysis-prose">
            {block.content}
            {block.streaming && (
              <span className="analysis-cursor" aria-hidden>
                ▍
              </span>
            )}
          </div>
          {showCopy && block.content && !block.streaming && (
            <CopyReportButton
              text={block.content}
              copied={copied}
              onCopied={() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            />
          )}
        </AnalysisSection>
      );
    case 'suggestions':
      return (
        <AnalysisSection title="建议">
          <ul className="analysis-suggest-list">
            {block.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          {block.streaming && (
            <span className="analysis-cursor" aria-hidden>
              ▍
            </span>
          )}
        </AnalysisSection>
      );
    default:
      return null;
  }
}

function CopyReportButton({
  text,
  copied,
  onCopied,
}: {
  text: string;
  copied: boolean;
  onCopied: () => void;
}) {
  const copy = async () => {
    if (Capacitor.isNativePlatform()) {
      await CapClipboard.write({ string: text });
    } else {
      await navigator.clipboard.writeText(text);
    }
    onCopied();
  };
  return (
    <button type="button" className="btn-ghost mt-2 text-sm" onClick={() => void copy()}>
      <Clipboard className="mr-1 inline h-4 w-4" />
      {copied ? '已复制' : '复制全文'}
    </button>
  );
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
        <BlockView
          key={i}
          block={block}
          showCopy={
            block.type === 'summary' &&
            message.blocks?.some(
              (b) => b.type === 'data' && b.snapshot.showCopyReport,
            )
          }
        />
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
  if (snapshot.chartType !== 'none' && snapshot.entryCount > 0) {
    blocks.push({ type: 'chart', snapshot });
  }
  blocks.push(
    { type: 'summary', content: '', streaming: true },
    { type: 'suggestions', items: [], streaming: true },
  );
  return blocks;
}

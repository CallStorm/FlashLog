import { Loader2 } from 'lucide-react';
import { formatAnalysisText } from '@/components/analysis/formatAnalysisText';
import type { ChatMessage } from '@/types/analysis';

export function AnalysisMessage({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="analysis-msg analysis-msg-user">
        <p>{message.content}</p>
      </div>
    );
  }

  const loading =
    message.status === 'thinking' || message.status === 'streaming';

  return (
    <div className="analysis-msg analysis-msg-assistant">
      {message.rangeLabel && (
        <p className="analysis-range-hint-inline">{message.rangeLabel}</p>
      )}
      {message.status === 'thinking' && !message.content && (
        <p className="analysis-loading">
          <Loader2 className="inline h-4 w-4 animate-spin" /> 正在分析…
        </p>
      )}
      {message.content && (
        <div className="analysis-summary-body">
          {formatAnalysisText(message.content)}
          {message.status === 'streaming' && (
            <span className="analysis-cursor" aria-hidden>
              ▍
            </span>
          )}
        </div>
      )}
      {message.status === 'error' && (
        <p className="analysis-error">{message.error ?? '生成失败'}</p>
      )}
      {loading && message.status === 'streaming' && !message.content && (
        <p className="text-sm text-[var(--color-text-muted)]">处理中…</p>
      )}
    </div>
  );
}

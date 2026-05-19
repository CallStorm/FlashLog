import type { TitleBreakdown } from '@/types/analysis';
import { formatDuration } from '@/utils/date';

export function AnalysisRankList({ items }: { items: TitleBreakdown[] }) {
  const max = Math.max(...items.map((i) => i.minutes), 1);
  return (
    <ul className="analysis-rank-list">
      {items.map((item) => (
        <li key={item.title} className="analysis-rank-item">
          <div className="analysis-rank-head">
            <span className="analysis-rank-title">{item.title}</span>
            <span className="analysis-rank-meta">
              {formatDuration(item.minutes)} · {item.percent}%
            </span>
          </div>
          <div className="analysis-rank-track">
            <div
              className="analysis-rank-fill"
              style={{ width: `${(item.minutes / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

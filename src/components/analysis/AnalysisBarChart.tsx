import type { DailyTotalPoint } from '@/types/analysis';
import { formatDuration } from '@/utils/date';

export function AnalysisBarChart({ days }: { days: DailyTotalPoint[] }) {
  const max = Math.max(...days.map((d) => d.minutes), 1);

  return (
    <div className="analysis-bar-chart">
      <div className="analysis-bar-row">
        {days.map((d) => {
          const h = d.minutes > 0 ? Math.max(8, (d.minutes / max) * 100) : 4;
          const barClass = [
            'analysis-bar',
            d.isFuture ? 'analysis-bar-future' : '',
            d.isMissing ? 'analysis-bar-missing' : '',
            d.isOvertime ? 'analysis-bar-overtime' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div key={d.date} className="analysis-bar-col">
              <span className="analysis-bar-value" title={formatDuration(d.minutes)}>
                {d.minutes > 0 ? formatDuration(d.minutes) : ''}
              </span>
              <div className="analysis-bar-track">
                <div className={barClass} style={{ height: `${h}%` }} />
              </div>
              <span className="analysis-bar-label">{d.weekday || d.date.slice(8)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

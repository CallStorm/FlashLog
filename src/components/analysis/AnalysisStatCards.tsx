import type { AnalysisSnapshot } from '@/types/analysis';
import { formatDuration, formatDateLabel } from '@/utils/date';

export function AnalysisStatCards({ snapshot }: { snapshot: AnalysisSnapshot }) {
  const cards: { label: string; value: string }[] = [
    { label: '总工时', value: formatDuration(snapshot.totalMinutes) },
    { label: '记录条数', value: `${snapshot.entryCount} 条` },
    { label: '日均', value: formatDuration(snapshot.avgMinutesPerDay) },
  ];
  if (snapshot.peakDay) {
    cards.push({
      label: '高峰日',
      value: `${formatDateLabel(snapshot.peakDay.date)} ${formatDuration(snapshot.peakDay.minutes)}`,
    });
  }

  return (
    <div className="analysis-stat-grid">
      {cards.map((c) => (
        <div key={c.label} className="analysis-stat-card">
          <span className="analysis-stat-label">{c.label}</span>
          <span className="analysis-stat-value">{c.value}</span>
        </div>
      ))}
    </div>
  );
}

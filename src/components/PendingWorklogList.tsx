import { ChevronRight } from 'lucide-react';
import { formatDateLabel } from '@/utils/date';

export interface PendingWorklogListProps {
  dates: string[];
  onSelectDate: (date: string) => void;
}

function weekdayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const labels = ['日', '一', '二', '三', '四', '五', '六'] as const;
  return labels[new Date(y, m - 1, d).getDay()];
}

export function PendingWorklogList({
  dates,
  onSelectDate,
}: PendingWorklogListProps) {
  if (dates.length === 0) {
    return (
      <div className="card-surface px-4 py-10 text-center">
        <p className="text-sm text-secondary">暂无待办</p>
        <p className="mt-1 text-xs text-muted">
          自使用 App 起，每个中国工作日都应有一条工时记录
        </p>
      </div>
    );
  }

  return (
    <ul className="card-surface divide-y divide-[var(--color-border)] overflow-hidden">
      {dates.map((date) => (
        <li key={date}>
          <button
            type="button"
            onClick={() => onSelectDate(date)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left text-sm transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <span className="text-secondary">
              {formatDateLabel(date)}（周{weekdayLabel(date)}）· 未记录工时
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </button>
        </li>
      ))}
    </ul>
  );
}

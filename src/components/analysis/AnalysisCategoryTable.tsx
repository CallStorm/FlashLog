import type { CategoryBreakdown } from '@/types/analysis';
import { formatDuration } from '@/utils/date';

export function AnalysisCategoryTable({
  categories,
}: {
  categories: CategoryBreakdown[];
}) {
  if (categories.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">暂无大类分布数据</p>
    );
  }

  return (
    <div className="analysis-category-table" role="table">
      <div className="analysis-category-head" role="row">
        <span role="columnheader">大类</span>
        <span role="columnheader">工时</span>
        <span role="columnheader">占比</span>
      </div>
      {categories.map((cat) => (
        <div key={cat.categoryId} className="analysis-category-group">
          <div className="analysis-category-row" role="row">
            <span className="analysis-category-name" role="cell">
              {cat.categoryName}
            </span>
            <span className="analysis-category-mins" role="cell">
              {formatDuration(cat.minutes)}
            </span>
            <span className="analysis-category-pct" role="cell">
              {cat.percent}%
            </span>
          </div>
          {cat.tasks.map((task) => (
            <div
              key={`${cat.categoryId}-${task.title}`}
              className="analysis-category-task-row"
              role="row"
            >
              <span className="analysis-category-task-name" role="cell">
                {task.title}
              </span>
              <span className="analysis-category-mins" role="cell">
                {formatDuration(task.minutes)}
              </span>
              <span className="analysis-category-pct" role="cell">
                {task.percent}%
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

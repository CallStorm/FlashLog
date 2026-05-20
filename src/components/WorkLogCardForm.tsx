import type { WorkLogCardDraft } from '@/types/workLog';
import type { WorkCategory } from '@/types/settings';
import { formatDuration } from '@/utils/date';

interface WorkLogCardFormProps {
  card: WorkLogCardDraft;
  categories: WorkCategory[];
  onChange: (card: WorkLogCardDraft) => void;
}

export function WorkLogCardForm({ card, categories, onChange }: WorkLogCardFormProps) {
  return (
    <div className="card-accent space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-accent">工时卡片预览</h3>
        <span className="badge-duration-pill">{formatDuration(card.durationMinutes)}</span>
      </div>

      <label className="block space-y-1">
        <span className="label-field">归属日期</span>
        <input
          type="date"
          value={card.date}
          onChange={(e) => onChange({ ...card, date: e.target.value })}
          className="input-field"
        />
      </label>

      {categories.length > 0 && (
        <div className="block space-y-1">
          <span className="label-field">工时大类</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="工时大类">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onChange({ ...card, category: cat.id })}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  card.category === cat.id
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                    : 'border-[var(--color-border)] text-secondary hover:border-[var(--color-accent)]'
                }`}
              >
                {cat.name || cat.id}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="block space-y-1">
        <span className="label-field">任务名称</span>
        <input
          type="text"
          value={card.title}
          onChange={(e) => onChange({ ...card, title: e.target.value })}
          className="input-field"
          placeholder="任务或模块名"
        />
      </label>

      <label className="block space-y-1">
        <span className="label-field">预估工时（分钟）</span>
        <input
          type="number"
          min={1}
          max={480}
          value={card.durationMinutes}
          onChange={(e) =>
            onChange({
              ...card,
              durationMinutes: Math.max(1, Number(e.target.value) || 0),
            })
          }
          className="input-field"
        />
      </label>

      <label className="block space-y-1">
        <span className="label-field">描述</span>
        <textarea
          value={card.description}
          onChange={(e) => onChange({ ...card, description: e.target.value })}
          rows={4}
          className="input-field resize-none leading-relaxed"
          placeholder="精炼的工作内容描述"
        />
      </label>
    </div>
  );
}

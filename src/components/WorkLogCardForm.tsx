import type { WorkLogCardDraft } from '@/types/workLog';
import { formatDuration } from '@/utils/date';

interface WorkLogCardFormProps {
  card: WorkLogCardDraft;
  onChange: (card: WorkLogCardDraft) => void;
}

export function WorkLogCardForm({ card, onChange }: WorkLogCardFormProps) {
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

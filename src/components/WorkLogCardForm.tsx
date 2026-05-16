import type { WorkLogCardDraft } from '@/types/workLog';
import { formatDuration } from '@/utils/date';

interface WorkLogCardFormProps {
  card: WorkLogCardDraft;
  onChange: (card: WorkLogCardDraft) => void;
}

export function WorkLogCardForm({ card, onChange }: WorkLogCardFormProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-amber-500/25 bg-stone-900/80 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-amber-400">工时卡片预览</h3>
        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs text-amber-300">
          {formatDuration(card.durationMinutes)}
        </span>
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-stone-400">归属日期</span>
        <input
          type="date"
          value={card.date}
          onChange={(e) => onChange({ ...card, date: e.target.value })}
          className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm text-stone-100"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-stone-400">任务名称</span>
        <input
          type="text"
          value={card.title}
          onChange={(e) => onChange({ ...card, title: e.target.value })}
          className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm text-stone-100"
          placeholder="任务或模块名"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-stone-400">预估工时（分钟）</span>
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
          className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm text-stone-100"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-stone-400">描述</span>
        <textarea
          value={card.description}
          onChange={(e) => onChange({ ...card, description: e.target.value })}
          rows={4}
          className="w-full resize-none rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm leading-relaxed text-stone-100"
          placeholder="精炼的工作内容描述"
        />
      </label>
    </div>
  );
}

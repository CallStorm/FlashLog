import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, Copy, Pencil, Trash2 } from 'lucide-react';
import { Toast } from '@/components/Toast';
import { WorkLogCardForm } from '@/components/WorkLogCardForm';
import {
  deleteWorkLog,
  initWorkLogDb,
  listByDate,
  listWorkLogs,
  updateWorkLog,
} from '@/db/workLogRepository';
import type { WorkLogItem } from '@/types/workLog';
import {
  formatDateLabel,
  formatDuration,
  getTodayLocal,
  groupByDate,
  recentDates,
} from '@/utils/date';

export function History() {
  const [logs, setLogs] = useState<WorkLogItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<WorkLogItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    await initWorkLogDb();
    const items = await listWorkLogs(30);
    setLogs(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const grouped = groupByDate(logs);
  const datesWithLogs = recentDates(30).filter((d) => grouped.has(d));

  const dayItems = selectedDate
    ? (grouped.get(selectedDate) ?? []).sort((a, b) => a.createdAt - b.createdAt)
    : [];

  const handleCopyToday = async () => {
    const today = getTodayLocal();
    const items = await listByDate(today);
    if (items.length === 0) {
      setToast('今日暂无记录');
      return;
    }
    const lines = items.map(
      (i) =>
        `- [${formatDuration(i.durationMinutes)}] ${i.title}：${i.description}`,
    );
    const text = `${today}\n${lines.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      setToast('已复制今日工时');
    } catch {
      setToast('复制失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteId !== id) {
      setDeleteId(id);
      return;
    }
    await deleteWorkLog(id);
    setDeleteId(null);
    await refresh();
    setToast('已删除');
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    await updateWorkLog(editing.id, {
      date: editing.date,
      title: editing.title,
      durationMinutes: editing.durationMinutes,
      description: editing.description,
    });
    setEditing(null);
    await refresh();
    setToast('已更新');
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-stone-500">
        加载中…
      </div>
    );
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="flex items-center gap-1 text-sm text-stone-400"
        >
          <ChevronLeft className="h-4 w-4" />
          取消编辑
        </button>
        <WorkLogCardForm
          card={{
            date: editing.date,
            title: editing.title,
            durationMinutes: editing.durationMinutes,
            description: editing.description,
          }}
          onChange={(c) =>
            setEditing({
              ...editing,
              ...c,
            })
          }
        />
        <button type="button" onClick={() => void handleSaveEdit()} className="btn-primary w-full">
          保存修改
        </button>
      </div>
    );
  }

  if (selectedDate) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setSelectedDate(null)}
          className="flex items-center gap-1 text-sm text-stone-400"
        >
          <ChevronLeft className="h-4 w-4" />
          返回列表
        </button>
        <h2 className="text-lg font-medium text-stone-50">
          {formatDateLabel(selectedDate)}
          <span className="ml-2 text-sm font-normal text-stone-500">
            {selectedDate}
          </span>
        </h2>

        {dayItems.length === 0 ? (
          <p className="text-sm text-stone-500">该日无记录</p>
        ) : (
          <ul className="space-y-3">
            {dayItems.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-stone-100">{item.title}</h3>
                    <p className="mt-1 text-sm text-amber-400/90">
                      {formatDuration(item.durationMinutes)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      className="rounded-lg p-2 text-stone-400 hover:bg-stone-800 hover:text-amber-400"
                      aria-label="编辑"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      className={`rounded-lg p-2 ${
                        deleteId === item.id
                          ? 'bg-red-950 text-red-400'
                          : 'text-stone-400 hover:bg-stone-800 hover:text-red-400'
                      }`}
                      aria-label="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">
                  {item.description}
                </p>
                {deleteId === item.id && (
                  <p className="mt-2 text-xs text-red-400">再次点击确认删除</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-50">历史</h1>
          <p className="mt-1 text-sm text-stone-500">近 30 天，按日期倒序</p>
        </div>
        <button
          type="button"
          onClick={() => void handleCopyToday()}
          className="btn-secondary shrink-0"
        >
          <Copy className="h-4 w-4" />
          复制今日
        </button>
      </header>

      {datesWithLogs.length === 0 ? (
        <p className="py-12 text-center text-sm text-stone-500">暂无工时记录</p>
      ) : (
        <ul className="space-y-2">
          {datesWithLogs.map((date) => {
            const items = grouped.get(date) ?? [];
            const totalMin = items.reduce((s, i) => s + i.durationMinutes, 0);
            return (
              <li key={date}>
                <button
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className="flex w-full items-center justify-between rounded-2xl border border-stone-800 bg-stone-900/50 px-4 py-3.5 text-left transition-colors hover:border-amber-500/30"
                >
                  <div>
                    <p className="font-medium text-stone-100">
                      {formatDateLabel(date)}
                    </p>
                    <p className="text-xs text-stone-500">{date}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-amber-400">{formatDuration(totalMin)}</p>
                    <p className="text-xs text-stone-500">{items.length} 条</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {toast && (
        <Toast message={toast} variant="info" onClose={() => setToast(null)} />
      )}
    </div>
  );
}

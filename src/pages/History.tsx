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
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
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
          className="flex items-center gap-1 text-sm text-secondary"
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
          className="flex items-center gap-1 text-sm text-secondary"
        >
          <ChevronLeft className="h-4 w-4" />
          返回列表
        </button>
        <h2 className="text-lg font-medium text-primary">
          {formatDateLabel(selectedDate)}
          <span className="ml-2 text-sm font-normal text-muted">
            {selectedDate}
          </span>
        </h2>

        {dayItems.length === 0 ? (
          <p className="text-sm text-muted">该日无记录</p>
        ) : (
          <ul className="space-y-3">
            {dayItems.map((item) => (
              <li key={item.id} className="card-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-primary">{item.title}</h3>
                    <p className="mt-1 text-sm badge-duration">
                      {formatDuration(item.durationMinutes)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      className="icon-btn"
                      aria-label="编辑"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      className={`icon-btn icon-btn-danger ${
                        deleteId === item.id ? 'bg-[rgba(234,67,53,0.12)]' : ''
                      }`}
                      aria-label="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-secondary">
                  {item.description}
                </p>
                {deleteId === item.id && (
                  <p className="mt-2 text-xs text-[#ea4335]">再次点击确认删除</p>
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
          <h1 className="page-title">历史</h1>
          <p className="mt-1 text-sm text-muted">近 30 天，按日期倒序</p>
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
        <p className="py-12 text-center text-sm text-muted">暂无工时记录</p>
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
                  className="card-surface-interactive flex w-full items-center justify-between px-4 py-3.5 text-left"
                >
                  <div>
                    <p className="font-medium text-primary">
                      {formatDateLabel(date)}
                    </p>
                    <p className="text-xs text-muted">{date}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="badge-duration">{formatDuration(totalMin)}</p>
                    <p className="text-xs text-muted">{items.length} 条</p>
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

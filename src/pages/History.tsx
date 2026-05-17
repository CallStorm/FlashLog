import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Pencil, Share2, Trash2 } from 'lucide-react';
import { ShareWorklogSheet } from '@/components/ShareWorklogSheet';
import { HistoryCalendarView } from '@/components/HistoryCalendarView';
import { Toast } from '@/components/Toast';
import { WorkLogCardForm } from '@/components/WorkLogCardForm';
import {
  deleteWorkLog,
  initWorkLogDb,
  listWorkLogs,
  updateWorkLog,
} from '@/db/workLogRepository';
import type { WorkLogItem } from '@/types/workLog';
import {
  filterLogsByDateRange,
  formatDateLabel,
  formatDuration,
  getTodayLocal,
  getWeekStartMonday,
  groupByDate,
  recentDates,
  yearAgoFrom,
} from '@/utils/date';
import type { ExportRange } from '@/services/export/types';
import { refreshPendingWorklogs } from '@/utils/refreshPending';

type HistoryTab = 'list' | 'calendar';

export function History() {
  const [logs, setLogs] = useState<WorkLogItem[]>([]);
  const [tab, setTab] = useState<HistoryTab>('list');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<WorkLogItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareRange, setShareRange] = useState<ExportRange>(() => ({
    start: getWeekStartMonday(),
    end: getTodayLocal(),
  }));

  const openShare = (range: ExportRange) => {
    setShareRange(range);
    setShareOpen(true);
  };

  const refresh = useCallback(async () => {
    await initWorkLogDb();
    const today = getTodayLocal();
    const start = yearAgoFrom(today);
    const items = await listWorkLogs(365);
    setLogs(filterLogsByDateRange(items, start, today));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const grouped = groupByDate(logs);
  const datesWithLogs = useMemo(() => new Set(grouped.keys()), [grouped]);
  const datesWithLogsList = recentDates(30).filter((d) => grouped.has(d));

  const dayItems = selectedDate
    ? (grouped.get(selectedDate) ?? []).sort((a, b) => a.createdAt - b.createdAt)
    : [];

  const handleDelete = async (id: string) => {
    if (deleteId !== id) {
      setDeleteId(id);
      return;
    }
    await deleteWorkLog(id);
    setDeleteId(null);
    await refresh();
    await refreshPendingWorklogs();
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
    await refreshPendingWorklogs();
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

  const shareSheet = (
    <ShareWorklogSheet
      open={shareOpen}
      initialRange={shareRange}
      onClose={() => setShareOpen(false)}
      onToast={setToast}
    />
  );

  if (selectedDate) {
    return (
      <>
      <div className="mx-auto max-w-lg px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-start gap-1">
          <button
            type="button"
            onClick={() => setSelectedDate(null)}
            className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-[var(--color-icon-hover)]"
            aria-label="返回"
          >
            <ChevronLeft className="h-5 w-5 stroke-[2]" />
          </button>
          <div className="min-w-0 flex-1 pb-1 pt-1.5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <h1 className="text-2xl font-bold tracking-tight text-primary">
                {formatDateLabel(selectedDate)}
              </h1>
              <span className="text-sm text-muted">{selectedDate}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openShare({ start: selectedDate, end: selectedDate })}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-[var(--color-icon-hover)]"
            aria-label="分享"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </header>

        {dayItems.length === 0 ? (
          <p className="mt-8 text-sm text-muted">该日无记录</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {dayItems.map((item) => (
              <li key={item.id} className="work-log-list-card">
                <span className="work-log-duration-badge absolute right-4 top-4">
                  {formatDuration(item.durationMinutes)}
                </span>

                <div className="pr-14">
                  <h3 className="font-semibold text-primary">{item.title}</h3>
                  {item.description ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-secondary">
                      {item.description}
                    </p>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center justify-end gap-0.5">
                  <button
                    type="button"
                    onClick={() => setEditing(item)}
                    className="work-log-action-btn work-log-action-btn-edit"
                    aria-label="编辑"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    className={`work-log-action-btn work-log-action-btn-delete ${
                      deleteId === item.id ? 'work-log-action-btn-delete-active' : ''
                    }`}
                    aria-label="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {deleteId === item.id && (
                  <p className="mt-1.5 text-right text-xs text-[#ea4335]">
                    再次点击确认删除
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {toast && (
          <Toast message={toast} variant="info" onClose={() => setToast(null)} />
        )}
      </div>
      {shareSheet}
      </>
    );
  }

  return (
    <>
    <div className="mx-auto flex max-w-lg flex-col px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="shrink-0 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="page-title">历史</h1>
            <p className="mt-1 text-sm text-muted">
              {tab === 'list' ? '近 30 天，按日期倒序' : '近一年，有工时日期可点击查看'}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              openShare({
                start: getWeekStartMonday(),
                end: getTodayLocal(),
              })
            }
            className="btn-secondary shrink-0 px-3 py-2 text-sm"
          >
            导出
          </button>
        </div>

        <div className="history-segment" role="tablist" aria-label="历史视图">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'list'}
            onClick={() => setTab('list')}
            className={`history-segment-item ${tab === 'list' ? 'history-segment-item-active' : ''}`}
          >
            列表
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'calendar'}
            onClick={() => setTab('calendar')}
            className={`history-segment-item ${tab === 'calendar' ? 'history-segment-item-active' : ''}`}
          >
            日历
          </button>
        </div>
      </header>

      {tab === 'list' ? (
        <div className="mt-4 space-y-2">
          {datesWithLogsList.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">暂无工时记录</p>
          ) : (
            <ul className="space-y-2">
              {datesWithLogsList.map((date) => {
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
        </div>
      ) : (
        <HistoryCalendarView
          datesWithLogs={datesWithLogs}
          onSelectDate={setSelectedDate}
        />
      )}

      {toast && (
        <Toast message={toast} variant="info" onClose={() => setToast(null)} />
      )}
    </div>
    {shareSheet}
    </>
  );
}

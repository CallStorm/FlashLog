import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PendingWorklogList } from '@/components/PendingWorklogList';
import type { HomeNavigationState } from '@/components/ReminderHost';
import { usePendingStore } from '@/stores/pendingStore';
import { refreshPendingWorklogs } from '@/utils/refreshPending';

export function Messages() {
  const navigate = useNavigate();
  const { pendingDates, count, loading } = usePendingStore();

  useEffect(() => {
    void refreshPendingWorklogs();
  }, []);

  const handleSelectDate = (date: string) => {
    const state: HomeNavigationState = {
      referenceDate: date,
      focusInput: true,
    };
    navigate('/', { state });
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <header>
        <h1 className="page-title">消息</h1>
        <p className="mt-1 text-sm text-muted">
          {loading
            ? '加载中…'
            : count > 0
              ? `共 ${count} 个工作日尚未记录工时，点击前往补记`
              : '所有应记工时的工作日均已填写'}
        </p>
      </header>

      <PendingWorklogList dates={pendingDates} onSelectDate={handleSelectDate} />
    </div>
  );
}

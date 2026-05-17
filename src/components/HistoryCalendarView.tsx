import { useEffect, useRef } from 'react';
import {
  formatMonthTitle,
  getMonthGrid,
  getTodayLocal,
  recentMonths,
  toDateKey,
  WEEKDAY_LABELS,
} from '@/utils/date';

type HistoryCalendarViewProps = {
  datesWithLogs: Set<string>;
  onSelectDate: (date: string) => void;
};

export function HistoryCalendarView({
  datesWithLogs,
  onSelectDate,
}: HistoryCalendarViewProps) {
  const months = recentMonths(12);
  const currentMonthRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    currentMonthRef.current?.scrollIntoView({ block: 'start' });
  }, []);

  return (
    <div className="history-calendar-scroll">
      {months.map(({ year, month }, index) => {
        const weeks = getMonthGrid(year, month);
        const isCurrentMonth = index === 0;

        return (
          <section
            key={`${year}-${month}`}
            ref={isCurrentMonth ? currentMonthRef : undefined}
            className="history-calendar-month"
          >
            <h2 className="history-calendar-month-title">{formatMonthTitle(year, month)}</h2>
            <div className="history-calendar-weekdays">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label} className="history-calendar-weekday">
                  {label}
                </span>
              ))}
            </div>
            <div className="history-calendar-grid">
              {weeks.flat().map((day, cellIndex) => {
                if (day === null) {
                  return <span key={`e-${cellIndex}`} className="calendar-day calendar-day-empty" />;
                }

                const dateKey = toDateKey(year, month, day);
                const hasLog = datesWithLogs.has(dateKey);
                const isToday = dateKey === getTodayLocal();

                if (hasLog) {
                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => onSelectDate(dateKey)}
                      className={`calendar-day calendar-day-has-log ${isToday ? 'calendar-day-today' : ''}`}
                      aria-label={`${dateKey}，查看工时`}
                    >
                      <span className="calendar-day-marker">
                        <span className="calendar-day-num">{day}</span>
                      </span>
                    </button>
                  );
                }

                return (
                  <span
                    key={dateKey}
                    className={`calendar-day calendar-day-plain ${isToday ? 'calendar-day-today' : ''}`}
                  >
                    <span className="calendar-day-num">{day}</span>
                  </span>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
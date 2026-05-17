import { forwardRef } from 'react';
import type { WorkLogItem } from '@/types/workLog';
import { buildImageSummaryData } from '@/services/export/generators/image';
import type { ExportRange } from '@/services/export/types';

export type SharePreviewImageProps = {
  logs: WorkLogItem[];
  range: ExportRange;
  className?: string;
};

export const SharePreviewImage = forwardRef<HTMLDivElement, SharePreviewImageProps>(
  function SharePreviewImage({ logs, range, className }, ref) {
    const data = buildImageSummaryData(logs, range);

    return (
      <div
        ref={ref}
        className={className}
        style={{
          width: 750,
          background: '#ffffff',
          color: '#1a1a1a',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
          padding: 32,
          boxSizing: 'border-box',
        }}
      >
        <header style={{ borderBottom: '2px solid #e8eaed', paddingBottom: 16, marginBottom: 20 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#1a73e8' }}>{data.title}</h1>
          <p style={{ fontSize: 16, color: '#5f6368', margin: '6px 0 0' }}>{data.subtitle}</p>
          <p style={{ fontSize: 14, color: '#80868b', margin: '4px 0 0' }}>{data.summary}</p>
        </header>

        {data.dates.map((day) => (
          <section key={day.date} style={{ marginBottom: 20 }}>
            <h2
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#3c4043',
                margin: '0 0 10px',
              }}
            >
              {day.date}
            </h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {day.items.map((item) => (
                <li
                  key={item.id}
                  style={{
                    marginBottom: 12,
                    padding: '12px 14px',
                    background: '#f8f9fa',
                    borderRadius: 12,
                    border: '1px solid #e8eaed',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#1a73e8',
                        background: '#e8f0fe',
                        padding: '2px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {item.duration}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{item.title}</span>
                  </div>
                  {item.description ? (
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: '#5f6368',
                      }}
                    >
                      {item.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  },
);

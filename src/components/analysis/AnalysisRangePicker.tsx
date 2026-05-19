import { useEffect, useState } from 'react';
import { PICKER_OPTIONS, resolveActiveRange } from '@/services/analysis/analysisRange';
import type { ExportRange } from '@/services/export/types';
import type { PickerPreset } from '@/types/analysis';
import { formatRangeLabel } from '@/utils/date';

export function AnalysisRangePicker({
  preset,
  customRange,
  onRangeChange,
}: {
  preset: PickerPreset;
  customRange: ExportRange;
  onRangeChange: (preset: PickerPreset, customRange?: ExportRange) => void;
}) {
  const active = resolveActiveRange(preset, customRange);
  const [draftStart, setDraftStart] = useState(active.start);
  const [draftEnd, setDraftEnd] = useState(active.end);

  useEffect(() => {
    if (preset === 'custom') {
      setDraftStart(customRange.start);
      setDraftEnd(customRange.end);
    }
  }, [preset, customRange.start, customRange.end]);

  const applyCustomDates = (start: string, end: string) => {
    if (!start || !end) return;
    let s = start;
    let e = end;
    if (s > e) [s, e] = [e, s];
    onRangeChange('custom', { start: s, end: e });
  };

  return (
    <div className="analysis-range-picker">
      <div className="analysis-range-tabs">
        {PICKER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`analysis-range-tab ${preset === opt.id ? 'analysis-range-tab-active' : ''}`}
            onClick={() => {
              if (opt.id === 'custom') {
                onRangeChange('custom', { start: draftStart, end: draftEnd });
              } else {
                onRangeChange(opt.id);
              }
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {preset === 'custom' ? (
        <div className="analysis-custom-range">
          <label className="analysis-date-field">
            <span>开始</span>
            <input
              type="date"
              value={draftStart}
              onChange={(e) => {
                const v = e.target.value;
                setDraftStart(v);
                applyCustomDates(v, draftEnd);
              }}
            />
          </label>
          <label className="analysis-date-field">
            <span>结束</span>
            <input
              type="date"
              value={draftEnd}
              onChange={(e) => {
                const v = e.target.value;
                setDraftEnd(v);
                applyCustomDates(draftStart, v);
              }}
            />
          </label>
        </div>
      ) : null}

      <p className="analysis-range-hint">{formatRangeLabel(active.start, active.end)}</p>
    </div>
  );
}

import { ANALYSIS_SCENARIOS } from '@/constants/analysisScenarios';
import type { AnalysisScenarioId } from '@/types/analysis';

export function AnalysisQuickChips({
  disabled,
  onSelect,
}: {
  disabled?: boolean;
  onSelect: (scenario: AnalysisScenarioId) => void;
}) {
  return (
    <div className="analysis-chips">
      {ANALYSIS_SCENARIOS.map((s) => (
        <button
          key={s.id}
          type="button"
          className="analysis-chip"
          disabled={disabled}
          onClick={() => onSelect(s.id)}
        >
          {s.chipLabel}
        </button>
      ))}
    </div>
  );
}

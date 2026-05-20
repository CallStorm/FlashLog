import type { ParsedSuggestion } from '@/services/analysis/parseAnalysisAnswer';

export function AnalysisSuggestions({
  items,
  streaming,
}: {
  items: ParsedSuggestion[];
  streaming?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">正在生成建议…</p>
    );
  }

  return (
    <ul className="analysis-suggest-list">
      {items.map((item, i) => (
        <li key={i} className="analysis-suggest-item">
          {item.title ? (
            <p className="analysis-suggest-title">{item.title}</p>
          ) : null}
          <p className="analysis-suggest-body">{item.body}</p>
        </li>
      ))}
      {streaming && (
        <li className="analysis-suggest-item analysis-suggest-streaming" aria-hidden>
          <span className="analysis-cursor">▍</span>
        </li>
      )}
    </ul>
  );
}

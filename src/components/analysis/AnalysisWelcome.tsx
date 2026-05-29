import { Sparkles } from 'lucide-react';
import { ANALYSIS_COMMON_QUESTIONS } from '@/constants/analysisCommonQuestions';

interface AnalysisWelcomeProps {
  disabled?: boolean;
  onSelectQuestion: (text: string) => void;
}

export function AnalysisWelcome({ disabled, onSelectQuestion }: AnalysisWelcomeProps) {
  return (
    <div className="analysis-welcome">
      <div className="analysis-welcome-avatar" aria-hidden>
        <Sparkles className="h-6 w-6 text-[var(--color-accent)]" />
      </div>
      <div className="analysis-welcome-body">
        <p className="analysis-welcome-title">我是你的工时分析助手</p>
        <p className="analysis-welcome-sub">
          基于本机工时记录，告诉我时间段和你的问题即可
        </p>
        <div className="analysis-common-questions">
          {ANALYSIS_COMMON_QUESTIONS.map((q) => (
            <button
              key={q.id}
              type="button"
              className="analysis-common-question"
              disabled={disabled}
              onClick={() => onSelectQuestion(q.prompt ?? q.label)}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

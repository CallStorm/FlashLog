import type { ReactNode } from 'react';

export function AnalysisSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="analysis-section">
      <h4 className="analysis-section-title">{title}</h4>
      <div className="analysis-section-body">{children}</div>
    </section>
  );
}

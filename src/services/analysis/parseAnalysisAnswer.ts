export interface ParsedAnalysisAnswer {
  summary: string;
  suggestions: string[];
}

export function parseAnalysisAnswer(markdown: string): ParsedAnalysisAnswer {
  const summaryMatch = markdown.match(/##\s*总结\s*\n([\s\S]*?)(?=##\s*建议|$)/i);
  const suggestMatch = markdown.match(/##\s*建议\s*\n([\s\S]*?)$/i);

  const summary = (summaryMatch?.[1] ?? markdown).trim();
  const suggestBody = (suggestMatch?.[1] ?? '').trim();

  const suggestions = suggestBody
    .split('\n')
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);

  return {
    summary: summary || '（暂无总结）',
    suggestions: suggestions.length > 0 ? suggestions : ['暂无额外建议'],
  };
}

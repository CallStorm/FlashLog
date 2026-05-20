export interface ParsedSuggestion {
  title?: string;
  body: string;
}

export interface ParsedAnalysisAnswer {
  summary: string;
  suggestions: ParsedSuggestion[];
}

const LIST_PREFIX = /^[-*•]\s+|^\d+[.)]\s+/;

function parseSuggestionLine(raw: string): ParsedSuggestion {
  const text = raw.trim();
  const dirAction = text.match(
    /^\*\*([^*]+)\*\*[：:]\s*(.+?)(?:\s*[-—]\s*\*\*具体行动\*\*[：:]\s*(.+))?$/i,
  );
  if (dirAction) {
    const title = dirAction[1].trim();
    const body = (dirAction[3] ?? dirAction[2]).trim();
    return { title, body: body || dirAction[2].trim() };
  }
  const boldLead = text.match(/^\*\*([^*]+)\*\*[：:]\s*(.+)$/);
  if (boldLead) {
    return { title: boldLead[1].trim(), body: boldLead[2].trim() };
  }
  return { body: text };
}

function parseSuggestionsBody(body: string): ParsedSuggestion[] {
  const lines = body.split('\n');
  const items: string[] = [];
  let current = '';

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (LIST_PREFIX.test(t)) {
      if (current) items.push(current);
      current = t.replace(LIST_PREFIX, '').trim();
    } else if (current) {
      current += ` ${t}`;
    } else {
      current = t;
    }
  }
  if (current) items.push(current);

  return items
    .map(parseSuggestionLine)
    .filter((s) => s.body.length >= 4 || (s.title && s.title.length >= 2));
}

export function parseAnalysisAnswer(markdown: string): ParsedAnalysisAnswer {
  const summaryMatch = markdown.match(/##\s*总结\s*\n([\s\S]*?)(?=##\s*建议|$)/i);
  const suggestMatch = markdown.match(/##\s*建议\s*\n([\s\S]*?)$/i);

  const summary = (summaryMatch?.[1] ?? markdown).trim();
  const suggestBody = (suggestMatch?.[1] ?? '').trim();

  let suggestions = parseSuggestionsBody(suggestBody);
  if (suggestions.length === 0 && suggestBody) {
    suggestions = [{ body: suggestBody }];
  }
  if (suggestions.length === 0) {
    suggestions = [{ body: '结合上方数据，可在下一周期尝试更均衡的任务分配与及时补记。' }];
  }

  return {
    summary: summary || '（暂无总结）',
    suggestions,
  };
}

/** 流式阶段：过滤碎片建议项 */
export function filterStreamingSuggestions(
  items: ParsedSuggestion[],
): ParsedSuggestion[] {
  return items.filter(
    (s) =>
      (s.body && s.body.length >= 4) ||
      (s.title && s.title.length >= 2),
  );
}

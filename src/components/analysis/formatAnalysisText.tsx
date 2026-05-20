import type { ReactNode } from 'react';

const LIST_PREFIX = /^[-*•]\s+/;
const BOLD_ONLY = /^\*\*([^*]+)\*\*$/;
const CATEGORY_HEADER = /^\*\*([^*]+)\*\*(?:[（(][^）)]*[）)]|[：:]\s*)?/;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index));
    }
    parts.push(
      <strong key={`${keyPrefix}-b-${i++}`}>{m[1]}</strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : [text];
}

function renderLineContent(line: string, key: string): ReactNode {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const sub = trimmed.match(/^#{2,3}\s+(.+)$/);
  if (sub) {
    return (
      <p key={key} className="analysis-subheading">
        {renderInline(sub[1], key)}
      </p>
    );
  }
  const segments = trimmed.split('\n');
  if (segments.length === 1) {
    return <span key={key}>{renderInline(trimmed, key)}</span>;
  }
  return (
    <span key={key}>
      {segments.map((seg, idx) => (
        <span key={`${key}-ln-${idx}`}>
          {idx > 0 && <br />}
          {renderInline(seg, `${key}-ln-${idx}`)}
        </span>
      ))}
    </span>
  );
}

function isSectionLabel(line: string): boolean {
  return BOLD_ONLY.test(line.trim());
}

function isCategoryHeader(line: string): boolean {
  const t = line.trim();
  if (BOLD_ONLY.test(t)) return false;
  return CATEGORY_HEADER.test(t);
}

function renderStructuredLines(lines: string[], blockKey: string): ReactNode {
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) {
      i++;
      continue;
    }

    if (isSectionLabel(t)) {
      const m = t.match(BOLD_ONLY);
      nodes.push(
        <h5 key={`${blockKey}-lbl-${nodes.length}`} className="analysis-summary-label">
          {m?.[1] ?? t}
        </h5>,
      );
      i++;
      continue;
    }

    if (isCategoryHeader(t)) {
      const listItems: string[] = [];
      i++;
      while (i < lines.length) {
        const next = lines[i].trim();
        if (!next) {
          i++;
          continue;
        }
        if (isSectionLabel(next) || isCategoryHeader(next)) break;
        if (LIST_PREFIX.test(next)) {
          listItems.push(next.replace(LIST_PREFIX, '').trim());
          i++;
        } else {
          break;
        }
      }
      nodes.push(
        <div
          key={`${blockKey}-cat-${nodes.length}`}
          className="analysis-summary-category"
        >
          <p className="analysis-summary-category-title">
            {renderInline(t, `${blockKey}-ct`)}
          </p>
          {listItems.length > 0 && (
            <ul className="analysis-inline-list">
              {listItems.map((item, li) => (
                <li key={li}>{renderInline(item, `${blockKey}-cli-${li}`)}</li>
              ))}
            </ul>
          )}
        </div>,
      );
      continue;
    }

    if (LIST_PREFIX.test(t)) {
      const listItems: string[] = [];
      while (i < lines.length) {
        const row = lines[i].trim();
        if (!row || !LIST_PREFIX.test(row)) break;
        listItems.push(row.replace(LIST_PREFIX, '').trim());
        i++;
      }
      nodes.push(
        <ul key={`${blockKey}-ul-${nodes.length}`} className="analysis-inline-list">
          {listItems.map((item, li) => (
            <li key={li}>{renderInline(item, `${blockKey}-uli-${li}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    const paraBuf: string[] = [lines[i]];
    i++;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (
        !next ||
        LIST_PREFIX.test(next) ||
        isSectionLabel(next) ||
        isCategoryHeader(next) ||
        /^#{2,3}\s+/.test(next)
      ) {
        break;
      }
      paraBuf.push(lines[i]);
      i++;
    }
    const text = paraBuf.join('\n');
    if (/^#{2,3}\s+/.test(text.trim()) && !text.includes('\n')) {
      nodes.push(
        <p key={`${blockKey}-h-${nodes.length}`} className="analysis-subheading">
          {renderInline(text.trim().replace(/^#{2,3}\s+/, ''), `${blockKey}-hd`)}
        </p>,
      );
    } else {
      nodes.push(
        <p key={`${blockKey}-p-${nodes.length}`} className="analysis-paragraph">
          {renderLineContent(text, `${blockKey}-p`)}
        </p>,
      );
    }
  }

  if (nodes.length === 1) return nodes[0];
  return <div key={blockKey}>{nodes}</div>;
}

function renderBlock(block: string, blockKey: string): ReactNode {
  const lines = block.split('\n');
  const nonEmpty = lines.filter((l) => l.trim() !== '');
  if (nonEmpty.length === 0) return null;

  const hasStructure = nonEmpty.some(
    (l) => isSectionLabel(l.trim()) || isCategoryHeader(l.trim()),
  );
  if (hasStructure) {
    return renderStructuredLines(lines, blockKey);
  }

  const allList = nonEmpty.every((l) => LIST_PREFIX.test(l.trim()));
  if (allList) {
    return (
      <ul key={blockKey} className="analysis-inline-list">
        {nonEmpty.map((line, i) => (
          <li key={i}>
            {renderInline(line.replace(LIST_PREFIX, '').trim(), `${blockKey}-li-${i}`)}
          </li>
        ))}
      </ul>
    );
  }

  return renderStructuredLines(lines, blockKey);
}

/** 轻量排版：段落间距、加粗、列表、小标题、总结节/大类块 */
export function formatAnalysisText(content: string): ReactNode {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const blocks = trimmed.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) {
    return <p className="analysis-paragraph">{renderInline(trimmed, 'single')}</p>;
  }

  return (
    <>
      {blocks.map((block, i) => (
        <div key={`block-${i}`} className="analysis-summary-block">
          {renderBlock(block, `block-${i}`)}
        </div>
      ))}
    </>
  );
}

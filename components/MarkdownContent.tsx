import React from 'react';

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      nodes.push(<strong key={`${match.index}-strong`} style={{ color: '#f8fafc', fontWeight: 700 }}>{match[2]}</strong>);
    } else if (match[3]) {
      nodes.push(<em key={`${match.index}-em`} style={{ fontStyle: 'italic', color: '#e2e8f0' }}>{match[4]}</em>);
    } else if (match[5]) {
      nodes.push(
        <code
          key={`${match.index}-code`}
          style={{
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '6px',
            padding: '1px 6px',
            fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
            fontSize: '0.92em',
            color: '#bfdbfe',
          }}
        >
          {match[6]}
        </code>
      );
    } else if (match[7]) {
      nodes.push(
        <a
          key={`${match.index}-link`}
          href={match[9]}
          target="_blank"
          rel="noreferrer"
          style={{ color: '#60a5fa', textDecoration: 'underline' }}
        >
          {match[8]}
        </a>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function renderParagraph(text: string, key: string, compact = false) {
  return (
    <p key={key} style={{ margin: compact ? '0' : '0 0 12px', lineHeight: 1.75 }}>
      {parseInline(text)}
    </p>
  );
}

export function MarkdownContent({ content, compact = false }: { content: string; compact?: boolean }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length;
      const sizes = ['26px', '22px', '19px', '17px', '15px', '14px'];
      blocks.push(
        React.createElement(
          `h${Math.min(level, 6)}`,
          {
            key: `h-${i}`,
            style: {
              fontSize: compact ? '15px' : sizes[level - 1],
              lineHeight: 1.3,
              margin: compact ? '0 0 8px' : '16px 0 10px',
              color: '#f8fafc',
              fontWeight: 700,
            },
          },
          parseInline(heading[2])
        )
      );
      i += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push(
        <pre key={`pre-${i}`} style={{ margin: '0 0 12px', padding: '12px', background: '#020617', border: '1px solid #1e293b', borderRadius: '10px', overflowX: 'auto' }}>
          <code style={{ fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace", fontSize: '12px', color: '#cbd5e1' }}>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push(
        <blockquote key={`quote-${i}`} style={{ margin: '0 0 12px', padding: '4px 0 4px 12px', borderLeft: '3px solid #4f8ef7', color: '#cbd5e1' }}>
          {quoteLines.map((quoteLine, index) => renderParagraph(quoteLine, `quote-${i}-${index}`, true))}
        </blockquote>
      );
      continue;
    }

    const listMatch = /^([-*]|\d+\.)\s+/.exec(trimmed);
    if (listMatch) {
      const ordered = /\d+\./.test(listMatch[1]);
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        const currentMatch = /^([-*]|\d+\.)\s+(.*)$/.exec(current);
        if (!currentMatch) break;
        items.push(
          <li key={`li-${i}`} style={{ marginBottom: '6px' }}>
            {parseInline(currentMatch[2])}
          </li>
        );
        i += 1;
      }
      const ListTag = ordered ? 'ol' : 'ul';
      blocks.push(
        React.createElement(
          ListTag,
          {
            key: `list-${i}`,
            style: {
              margin: '0 0 12px',
              paddingLeft: ordered ? '22px' : '20px',
              lineHeight: 1.75,
            },
          },
          items
        )
      );
      continue;
    }

    const paragraphLines = [trimmed];
    i += 1;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s+/.test(lines[i].trim()) && !lines[i].trim().startsWith('```') && !lines[i].trim().startsWith('>') && !/^([-*]|\d+\.)\s+/.test(lines[i].trim())) {
      paragraphLines.push(lines[i].trim());
      i += 1;
    }
    blocks.push(renderParagraph(paragraphLines.join(' '), `p-${i}`, compact));
  }

  return <div>{blocks}</div>;
}

import React from 'react';

interface FormattedMarkdownProps {
  content: string;
  className?: string;
}

export default function FormattedMarkdown({ content, className = '' }: FormattedMarkdownProps) {
  const lines = content.split('\n');

  return (
    <div className={`space-y-1.5 ${className}`}>
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        return (
          <p key={lineIdx} className="leading-relaxed">
            {renderFormattedText(line)}
          </p>
        );
      })}
    </div>
  );
}

function renderFormattedText(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // 1. Bold: **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
    if (boldMatch) {
      tokens.push(
        <strong key={keyIdx++} className="font-extrabold text-white">
          {boldMatch[2]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 2. Quoted Italic: *"text"* or _"text"_
    const quoteItalicMatch = remaining.match(/^(\*|_)"([^"]+)"\1/);
    if (quoteItalicMatch) {
      tokens.push(
        <span key={keyIdx++} className="italic font-medium text-[#e5c178]">
          &quot;{quoteItalicMatch[2]}&quot;
        </span>
      );
      remaining = remaining.slice(quoteItalicMatch[0].length);
      continue;
    }

    // 3. Inline Code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push(
        <code key={keyIdx++} className="rounded bg-zinc-800/90 px-1.5 py-0.5 font-mono text-xs text-[#e5c178] border border-zinc-700/50">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // 4. Single Italic: *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
    if (italicMatch && italicMatch[2].length > 0) {
      tokens.push(
        <em key={keyIdx++} className="italic text-zinc-300">
          {italicMatch[2]}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // 5. Plain text until next special char (*, `, _)
    const nextSpecial = remaining.search(/[\*_`]/);
    if (nextSpecial === -1) {
      tokens.push(<span key={keyIdx++}>{remaining}</span>);
      break;
    } else if (nextSpecial === 0) {
      tokens.push(<span key={keyIdx++}>{remaining[0]}</span>);
      remaining = remaining.slice(1);
    } else {
      tokens.push(<span key={keyIdx++}>{remaining.slice(0, nextSpecial)}</span>);
      remaining = remaining.slice(nextSpecial);
    }
  }

  return tokens;
}

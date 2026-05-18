import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { ChatMessage as ChatMessageType } from '../../types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** Very lightweight Markdown: bold, italic, inline code, code blocks */
function renderMarkdown(text: string): JSX.Element[] {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockKey = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${codeBlockKey++}`}
            style={{
              background: 'var(--bg-input)',
              padding: '8px 10px',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: 'var(--font-sm)',
              fontFamily: 'var(--font-mono)',
              overflowX: 'auto',
              margin: '4px 0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {codeBlockContent.join('\n')}
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    elements.push(<span key={`line-${i}`}>{renderInline(line)}{i < lines.length - 1 ? <br /> : null}</span>);
  }

  // Unclosed code block
  if (inCodeBlock && codeBlockContent.length > 0) {
    elements.push(
      <pre
        key={`code-${codeBlockKey}`}
        style={{
          background: 'var(--bg-input)',
          padding: '8px 10px',
          borderRadius: 'var(--border-radius-sm)',
          fontSize: 'var(--font-sm)',
          fontFamily: 'var(--font-mono)',
          overflowX: 'auto',
          margin: '4px 0',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {codeBlockContent.join('\n')}
      </pre>
    );
  }

  return elements;
}

function renderInline(text: string): (string | JSX.Element)[] {
  const result: (string | JSX.Element)[] = [];
  // Match inline code, bold, italic
  const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    const m = match[0];
    if (m.startsWith('`')) {
      result.push(
        <code
          key={`ic-${key++}`}
          style={{
            background: 'var(--bg-input)',
            padding: '1px 4px',
            borderRadius: 3,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9em',
          }}
        >
          {m.slice(1, -1)}
        </code>
      );
    } else if (m.startsWith('**')) {
      result.push(<strong key={`b-${key++}`}>{m.slice(2, -2)}</strong>);
    } else if (m.startsWith('*')) {
      result.push(<em key={`i-${key++}`}>{m.slice(1, -1)}</em>);
    }

    lastIndex = match.index + m.length;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  const renderedContent = useMemo(() => {
    if (message.role === 'system') return null;
    return isUser ? [<span key="text">{message.content}</span>] : renderMarkdown(message.content);
  }, [message.content, message.role, isUser]);

  if (message.role === 'system') return null;

  const wrapperStyle: CSSProperties = {
    display: 'flex',
    justifyContent: isUser ? 'flex-end' : 'flex-start',
    padding: '2px 0',
  };

  const bubbleStyle: CSSProperties = {
    maxWidth: '85%',
    padding: '8px 12px',
    borderRadius: isUser
      ? 'var(--border-radius) var(--border-radius) 4px var(--border-radius)'
      : 'var(--border-radius) var(--border-radius) var(--border-radius) 4px',
    background: isUser ? 'var(--accent-primary)' : 'var(--bg-card)',
    color: isUser ? 'var(--text-inverse)' : 'var(--text-primary)',
    fontSize: 'var(--font-sm)',
    lineHeight: 1.5,
    wordBreak: 'break-word',
    border: isUser ? 'none' : '1px solid var(--border-color)',
    backdropFilter: isUser ? 'none' : 'var(--blur-sm)',
    WebkitBackdropFilter: isUser ? 'none' : 'var(--blur-sm)',
  };

  const timeStyle: CSSProperties = {
    fontSize: 'var(--font-xs)',
    color: 'var(--text-muted)',
    marginTop: 3,
    textAlign: isUser ? 'right' : 'left',
  };

  const streamingDotsStyle: CSSProperties = {
    display: 'inline-flex',
    gap: 3,
    marginLeft: 4,
  };

  const dotStyle = (delay: string): CSSProperties => ({
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: 'var(--text-muted)',
    animation: `typing 1.2s ease-in-out infinite`,
    animationDelay: delay,
  });

  return (
    <div style={wrapperStyle}>
      <div>
        <div style={bubbleStyle} className="allow-select">
          {renderedContent}
          {isStreaming && (
            <span style={streamingDotsStyle}>
              <span style={dotStyle('0s')} />
              <span style={dotStyle('0.2s')} />
              <span style={dotStyle('0.4s')} />
            </span>
          )}
        </div>
        <div style={timeStyle}>{formatTimestamp(message.timestamp)}</div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import type { ChatMessage as ChatMessageType, ChatProvider } from '../../types/chat';
import { useLocale } from '../../locales';
import { ChatMessage } from './ChatMessage';

interface ChatOverlayProps {
  open: boolean;
  messages: ChatMessageType[];
  isStreaming: boolean;
  currentProvider: ChatProvider;
  currentModel: string;
  onSend: (content: string) => void;
  onClose: () => void;
  onChangeModel: (provider: ChatProvider, model: string) => void;
}

const providerOptions: { value: ChatProvider; label: string }[] = [
  { value: 'ollama', label: 'Ollama' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google' },
  { value: 'custom', label: 'Custom' },
];

export function ChatOverlay({
  open,
  messages,
  isStreaming,
  currentProvider,
  currentModel,
  onSend,
  onClose,
  onChangeModel,
}: ChatOverlayProps) {
  const { t } = useLocale();
  const [inputValue, setInputValue] = useState('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
  }, [onClose]);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setInputValue('');
  }, [inputValue, isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      if (e.key === 'Escape') {
        handleClose();
      }
    },
    [handleSend, handleClose]
  );

  if (!open && !isClosing) return null;

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
    backdropFilter: 'var(--blur-lg)',
    WebkitBackdropFilter: 'var(--blur-lg)',
    animation: isClosing ? 'slideOutRight 0.25s ease forwards' : 'slideInRight 0.3s ease forwards',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color)',
    flexShrink: 0,
  };

  const headerTitleStyle: CSSProperties = {
    fontSize: 'var(--font-lg)',
    fontWeight: 700,
    color: 'var(--text-primary)',
  };

  const closeBtnStyle: CSSProperties = {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: 16,
    transition: 'all var(--transition-fast)',
  };

  const messagesStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const emptyStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 8,
    color: 'var(--text-muted)',
  };

  const inputAreaStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    borderTop: '1px solid var(--border-color)',
    flexShrink: 0,
  };

  const inputStyle: CSSProperties = {
    flex: 1,
    padding: '8px 12px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius)',
    color: 'var(--text-primary)',
    fontSize: 'var(--font-md)',
    outline: 'none',
    fontFamily: 'var(--font-body)',
  };

  const sendBtnStyle: CSSProperties = {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: isStreaming ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
    border: 'none',
    borderRadius: 'var(--border-radius-sm)',
    color: isStreaming ? 'var(--text-muted)' : 'var(--text-inverse)',
    cursor: isStreaming ? 'not-allowed' : 'pointer',
    fontSize: 16,
    transition: 'all var(--transition-fast)',
  };

  const modelPickerBtnStyle: CSSProperties = {
    padding: '4px 8px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-xs)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    position: 'relative',
  };

  const dropdownStyle: CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    boxShadow: 'var(--shadow-lg)',
    padding: '4px 0',
    minWidth: 140,
    zIndex: 10,
  };

  const dropdownItemStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '6px 12px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: 'var(--font-sm)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background var(--transition-fast)',
  };

  const nonUserMessages = messages.filter((m) => m.role !== 'system');

  return (
    <div style={overlayStyle}>
      <div style={headerStyle}>
        <span style={headerTitleStyle}>{t('chat.title')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <button
              style={modelPickerBtnStyle}
              onClick={() => setShowModelPicker(!showModelPicker)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
              }}
            >
              {currentProvider} / {currentModel || '...'}
            </button>
            {showModelPicker && (
              <div style={dropdownStyle}>
                {providerOptions.map((opt) => (
                  <button
                    key={opt.value}
                    style={{
                      ...dropdownItemStyle,
                      fontWeight: opt.value === currentProvider ? 700 : 400,
                      color:
                        opt.value === currentProvider
                          ? 'var(--accent-primary)'
                          : 'var(--text-primary)',
                    }}
                    onClick={() => {
                      onChangeModel(opt.value, currentModel);
                      setShowModelPicker(false);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            style={closeBtnStyle}
            onClick={handleClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {nonUserMessages.length === 0 ? (
        <div style={emptyStyle}>
          <span style={{ fontSize: 40 }}>💬</span>
          <span style={{ fontSize: 'var(--font-md)' }}>{t('chat.empty')}</span>
          <span style={{ fontSize: 'var(--font-xs)' }}>{t('chat.emptyHint')}</span>
        </div>
      ) : (
        <div style={messagesStyle}>
          {nonUserMessages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div style={inputAreaStyle}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.inputPlaceholder')}
          style={inputStyle}
          disabled={isStreaming}
          className="allow-select"
        />
        <button
          style={sendBtnStyle}
          onClick={handleSend}
          disabled={isStreaming}
          onMouseEnter={(e) => {
            if (!isStreaming) e.currentTarget.style.opacity = '0.85';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

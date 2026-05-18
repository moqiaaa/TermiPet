import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useLocale } from '../../locales';

interface ToolBarAction {
  id: string;
  icon: string;
  labelKey: string;
  onClick: () => void;
}

interface ToolBarProps {
  visible: boolean;
  onTerminal: () => void;
  onFolder: () => void;
  onChat: () => void;
  onAppearance: () => void;
  onPomodoro: () => void;
  onQuota: () => void;
  onCommand: () => void;
  onPreview: () => void;
  onSettings: () => void;
}

export function ToolBar({
  visible,
  onTerminal,
  onFolder,
  onChat,
  onAppearance,
  onPomodoro,
  onQuota,
  onCommand,
  onPreview,
  onSettings,
}: ToolBarProps) {
  const { t } = useLocale();

  const actions: ToolBarAction[] = useMemo(
    () => [
      { id: 'terminal', icon: '>', labelKey: 'toolbar.terminal', onClick: onTerminal },
      { id: 'folder', icon: '📁', labelKey: 'toolbar.folder', onClick: onFolder },
      { id: 'chat', icon: '💬', labelKey: 'toolbar.chat', onClick: onChat },
      { id: 'appearance', icon: '🎨', labelKey: 'toolbar.appearance', onClick: onAppearance },
      { id: 'pomodoro', icon: '🍅', labelKey: 'toolbar.pomodoro', onClick: onPomodoro },
      { id: 'quota', icon: '📊', labelKey: 'toolbar.quota', onClick: onQuota },
      { id: 'command', icon: '⚡', labelKey: 'toolbar.command', onClick: onCommand },
      { id: 'preview', icon: '👁', labelKey: 'toolbar.preview', onClick: onPreview },
      { id: 'settings', icon: '⚙️', labelKey: 'toolbar.settings', onClick: onSettings },
    ],
    [onTerminal, onFolder, onChat, onAppearance, onPomodoro, onQuota, onCommand, onPreview, onSettings]
  );

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    padding: '6px 8px',
    background: 'var(--bg-card)',
    backdropFilter: 'var(--blur-md)',
    WebkitBackdropFilter: 'var(--blur-md)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-lg)',
    boxShadow: 'var(--shadow-md)',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.95)',
    transition: `opacity var(--transition-normal), transform var(--transition-normal)`,
    pointerEvents: visible ? 'auto' : 'none',
    maxWidth: 220,
  };

  const buttonStyle: CSSProperties = {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 'var(--border-radius-sm)',
    cursor: 'pointer',
    fontSize: 16,
    transition: `all var(--transition-fast)`,
    color: 'var(--text-primary)',
    position: 'relative',
  };

  const tooltipStyle: CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: 'var(--font-xs)',
    padding: '3px 8px',
    borderRadius: 'var(--border-radius-sm)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 0.15s ease',
    marginBottom: 4,
    border: '1px solid var(--border-color)',
  };

  return (
    <div style={containerStyle} className="no-select">
      {actions.map((action) => (
        <button
          key={action.id}
          style={buttonStyle}
          onClick={action.onClick}
          title={t(action.labelKey)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
            const tooltip = e.currentTarget.querySelector('.toolbar-tooltip') as HTMLElement;
            if (tooltip) tooltip.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
            const tooltip = e.currentTarget.querySelector('.toolbar-tooltip') as HTMLElement;
            if (tooltip) tooltip.style.opacity = '0';
          }}
        >
          <span
            className="toolbar-tooltip"
            style={tooltipStyle}
          >
            {t(action.labelKey)}
          </span>
          <span>{action.icon}</span>
        </button>
      ))}
    </div>
  );
}

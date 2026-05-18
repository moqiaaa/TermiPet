import type { CSSProperties } from 'react';
import type { TerminalPreview, AgentState } from '../../types/settings';
import { useLocale } from '../../locales';
import { GlassCard } from '../common/GlassCard';

interface StickyPreviewProps {
  terminal: TerminalPreview | null;
  agentState: AgentState;
  visible: boolean;
}

const statusIcons: Record<string, string> = {
  idle: '⏸',
  running: '▶',
  error: '❌',
  warning: '⚠️',
  unavailable: '🔌',
};

const statusColors: Record<string, string> = {
  idle: 'var(--text-muted)',
  running: 'var(--accent-success)',
  error: 'var(--accent-danger)',
  warning: 'var(--accent-warning)',
  unavailable: 'var(--text-muted)',
};

const agentIcons: Record<AgentState, string> = {
  idle: '💤',
  working: '⚡',
  waiting: '⏳',
  compacting: '🔄',
  stopped: '⏹',
  error: '❌',
};

export function StickyPreview({ terminal, agentState, visible }: StickyPreviewProps) {
  const { t } = useLocale();

  if (!visible) return null;

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    width: '100%',
    animation: 'slideUp 0.25s ease forwards',
  };

  const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const iconStyle: CSSProperties = {
    fontSize: 14,
    flexShrink: 0,
  };

  const titleStyle: CSSProperties = {
    fontSize: 'var(--font-sm)',
    fontWeight: 600,
    color: 'var(--text-primary)',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const summaryStyle: CSSProperties = {
    fontSize: 'var(--font-xs)',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const statusDotStyle = (color: string): CSSProperties => ({
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  });

  return (
    <div style={containerStyle}>
      {/* Terminal status */}
      {terminal && (
        <GlassCard padding="8px 12px">
          <div style={rowStyle}>
            <span style={iconStyle}>{statusIcons[terminal.status] ?? '⏸'}</span>
            <div style={statusDotStyle(statusColors[terminal.status] ?? 'var(--text-muted)')} />
            <span style={titleStyle}>{terminal.title || terminal.appName}</span>
          </div>
          <div style={{ ...summaryStyle, marginTop: 4, paddingLeft: 28 }}>
            {terminal.summary}
          </div>
        </GlassCard>
      )}

      {/* Agent status */}
      <GlassCard padding="8px 12px">
        <div style={rowStyle}>
          <span style={iconStyle}>{agentIcons[agentState]}</span>
          <div
            style={statusDotStyle(
              agentState === 'working'
                ? 'var(--accent-success)'
                : agentState === 'error'
                  ? 'var(--accent-danger)'
                  : 'var(--text-muted)'
            )}
          />
          <span style={titleStyle}>{t('preview.agentTitle')}</span>
          <span style={{ ...summaryStyle, flex: 'none' }}>{t(`preview.agent.${agentState}`)}</span>
        </div>
      </GlassCard>
    </div>
  );
}

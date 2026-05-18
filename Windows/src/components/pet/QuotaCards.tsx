import type { CSSProperties } from 'react';
import type { UsageQuota } from '../../types/settings';
import { useLocale } from '../../locales';
import { GlassCard } from '../common/GlassCard';
import { ProgressBar } from '../common/ProgressBar';

interface QuotaCardsProps {
  quotas: UsageQuota[];
  visible: boolean;
}

const serviceIcons: Record<string, string> = {
  'claude-code': '🤖',
  codex: '📦',
  copilot: '✈️',
};

const serviceColors: Record<string, string> = {
  'claude-code': '#a78bfa',
  codex: '#34d399',
  copilot: '#60a5fa',
};

function getStatusLabel(status: string, t: (key: string) => string): string {
  switch (status) {
    case 'valid':
      return t('quota.statusValid');
    case 'expired':
      return t('quota.statusExpired');
    case 'not_found':
      return t('quota.statusNotFound');
    default:
      return '';
  }
}

export function QuotaCards({ quotas, visible }: QuotaCardsProps) {
  const { t } = useLocale();

  if (!visible || quotas.length === 0) return null;

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    width: '100%',
    animation: 'slideUp 0.25s ease forwards',
  };

  const cardContentStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const serviceNameStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 'var(--font-sm)',
    fontWeight: 600,
    color: 'var(--text-primary)',
  };

  const percentageStyle: CSSProperties = {
    fontSize: 'var(--font-sm)',
    fontWeight: 700,
  };

  const detailRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 'var(--font-xs)',
    color: 'var(--text-muted)',
  };

  return (
    <div style={containerStyle}>
      {quotas.map((quota) => {
        const icon = serviceIcons[quota.service] ?? '📊';
        const accentColor = serviceColors[quota.service] ?? 'var(--accent-primary)';
        const percentColor =
          quota.percentage < 50
            ? 'var(--accent-success)'
            : quota.percentage < 80
              ? 'var(--accent-warning)'
              : 'var(--accent-danger)';

        return (
          <GlassCard key={quota.service} padding="8px 12px">
            <div style={cardContentStyle}>
              <div style={headerStyle}>
                <span style={serviceNameStyle}>
                  <span>{icon}</span>
                  <span style={{ color: accentColor }}>{quota.label}</span>
                </span>
                <span style={{ ...percentageStyle, color: percentColor }}>
                  {Math.round(quota.percentage)}%
                </span>
              </div>

              <ProgressBar percentage={quota.percentage} height={5} />

              <div style={detailRowStyle}>
                <span>{quota.windowLabel}</span>
                <span>
                  {quota.status === 'valid'
                    ? `${t('quota.resetPrefix')} ${quota.resetDate}`
                    : getStatusLabel(quota.status, t)}
                </span>
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

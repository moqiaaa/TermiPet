import type { CSSProperties } from 'react';

interface ProgressBarProps {
  percentage: number;
  height?: number;
  showLabel?: boolean;
  style?: CSSProperties;
}

function getProgressColor(percentage: number): string {
  if (percentage < 50) return 'var(--accent-success)';
  if (percentage < 80) return 'var(--accent-warning)';
  return 'var(--accent-danger)';
}

export function ProgressBar({
  percentage,
  height = 6,
  showLabel = false,
  style,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const color = getProgressColor(clamped);

  const containerStyle: CSSProperties = {
    width: '100%',
    height,
    background: 'var(--bg-input)',
    borderRadius: height / 2,
    overflow: 'hidden',
    position: 'relative',
    ...style,
  };

  const fillStyle: CSSProperties = {
    width: `${clamped}%`,
    height: '100%',
    background: `linear-gradient(90deg, ${color}, ${color}dd)`,
    borderRadius: height / 2,
    transition: 'width 0.4s ease, background 0.4s ease',
  };

  const labelStyle: CSSProperties = {
    position: 'absolute',
    right: 4,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 'var(--font-xs)',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    lineHeight: 1,
  };

  return (
    <div style={containerStyle}>
      <div style={fillStyle} />
      {showLabel && height >= 14 && (
        <span style={labelStyle}>{Math.round(clamped)}%</span>
      )}
    </div>
  );
}

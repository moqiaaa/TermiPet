import type { CSSProperties, ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
  padding?: string;
  interactive?: boolean;
}

export function GlassCard({
  children,
  style,
  className,
  onClick,
  padding = '12px 16px',
  interactive = false,
}: GlassCardProps) {
  const baseStyle: CSSProperties = {
    background: 'var(--bg-card)',
    backdropFilter: 'var(--blur-md)',
    WebkitBackdropFilter: 'var(--blur-md)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius)',
    padding,
    boxShadow: 'var(--shadow-sm)',
    transition: `all var(--transition-normal)`,
    cursor: interactive ? 'pointer' : undefined,
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (interactive) {
      e.currentTarget.style.background = 'var(--bg-hover)';
      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (interactive) {
      e.currentTarget.style.background = 'var(--bg-card)';
      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
    }
  };

  return (
    <div
      className={className}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {children}
    </div>
  );
}

import type { AppSkin } from '../types/settings';

export interface Theme {
  skin: AppSkin;
  bg: {
    primary: string;
    secondary: string;
    tertiary: string;
    overlay: string;
    card: string;
    input: string;
    hover: string;
    active: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    accent: string;
    inverse: string;
  };
  accent: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
  };
  border: {
    color: string;
    radius: string;
    radiusSm: string;
    radiusLg: string;
    radiusXl: string;
  };
  shadow: {
    sm: string;
    md: string;
    lg: string;
    glow: string;
  };
  blur: {
    sm: string;
    md: string;
    lg: string;
  };
  font: {
    body: string;
    mono: string;
    size: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
  };
  transition: {
    fast: string;
    normal: string;
    slow: string;
  };
}

export const glassTheme: Theme = {
  skin: 'glass',
  bg: {
    primary: 'rgba(255, 255, 255, 0.12)',
    secondary: 'rgba(255, 255, 255, 0.08)',
    tertiary: 'rgba(255, 255, 255, 0.04)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    card: 'rgba(255, 255, 255, 0.15)',
    input: 'rgba(255, 255, 255, 0.1)',
    hover: 'rgba(255, 255, 255, 0.2)',
    active: 'rgba(255, 255, 255, 0.25)',
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.8)',
    muted: 'rgba(255, 255, 255, 0.5)',
    accent: '#7dd3fc',
    inverse: '#1a1a2e',
  },
  accent: {
    primary: '#7dd3fc',
    secondary: '#a78bfa',
    success: '#4ade80',
    warning: '#fbbf24',
    danger: '#f87171',
  },
  border: {
    color: 'rgba(255, 255, 255, 0.18)',
    radius: '12px',
    radiusSm: '8px',
    radiusLg: '16px',
    radiusXl: '20px',
  },
  shadow: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.15)',
    md: '0 4px 16px rgba(0, 0, 0, 0.2)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.3)',
    glow: '0 0 20px rgba(125, 211, 252, 0.3)',
  },
  blur: {
    sm: 'blur(8px)',
    md: 'blur(16px)',
    lg: 'blur(24px)',
  },
  font: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
    size: { xs: '10px', sm: '12px', md: '14px', lg: '16px', xl: '20px' },
  },
  transition: {
    fast: '0.15s ease',
    normal: '0.25s ease',
    slow: '0.4s ease',
  },
};

export const darkTheme: Theme = {
  skin: 'dark',
  bg: {
    primary: '#1a1b2e',
    secondary: '#232440',
    tertiary: '#2a2c4a',
    overlay: 'rgba(0, 0, 0, 0.7)',
    card: '#272847',
    input: '#2e2f52',
    hover: '#33345c',
    active: '#3a3b66',
  },
  text: {
    primary: '#e8e8f0',
    secondary: '#b0b0c8',
    muted: '#6e6e8a',
    accent: '#818cf8',
    inverse: '#1a1b2e',
  },
  accent: {
    primary: '#818cf8',
    secondary: '#c084fc',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#fb7185',
  },
  border: {
    color: 'rgba(255, 255, 255, 0.08)',
    radius: '10px',
    radiusSm: '6px',
    radiusLg: '14px',
    radiusXl: '18px',
  },
  shadow: {
    sm: '0 2px 6px rgba(0, 0, 0, 0.3)',
    md: '0 4px 12px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
    glow: '0 0 16px rgba(129, 140, 248, 0.25)',
  },
  blur: {
    sm: 'blur(0px)',
    md: 'blur(0px)',
    lg: 'blur(0px)',
  },
  font: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
    size: { xs: '10px', sm: '12px', md: '14px', lg: '16px', xl: '20px' },
  },
  transition: {
    fast: '0.12s ease',
    normal: '0.2s ease',
    slow: '0.35s ease',
  },
};

export const pixelTheme: Theme = {
  skin: 'pixel',
  bg: {
    primary: '#0f0f23',
    secondary: '#1a1a35',
    tertiary: '#252547',
    overlay: 'rgba(0, 0, 0, 0.85)',
    card: '#1e1e3a',
    input: '#15152d',
    hover: '#2a2a50',
    active: '#333365',
  },
  text: {
    primary: '#ccccff',
    secondary: '#9999cc',
    muted: '#666699',
    accent: '#00ff88',
    inverse: '#0f0f23',
  },
  accent: {
    primary: '#00ff88',
    secondary: '#ff6b9d',
    success: '#00ff88',
    warning: '#ffcc00',
    danger: '#ff4444',
  },
  border: {
    color: '#333366',
    radius: '0px',
    radiusSm: '0px',
    radiusLg: '0px',
    radiusXl: '0px',
  },
  shadow: {
    sm: '2px 2px 0px #000000',
    md: '3px 3px 0px #000000',
    lg: '4px 4px 0px #000000',
    glow: '0 0 8px #00ff88',
  },
  blur: {
    sm: 'blur(0px)',
    md: 'blur(0px)',
    lg: 'blur(0px)',
  },
  font: {
    body: '"Press Start 2P", "Courier New", "Consolas", monospace',
    mono: '"Press Start 2P", "Courier New", "Consolas", monospace',
    size: { xs: '8px', sm: '9px', md: '10px', lg: '12px', xl: '14px' },
  },
  transition: {
    fast: '0s',
    normal: '0s',
    slow: '0s',
  },
};

export const themes: Record<AppSkin, Theme> = {
  glass: glassTheme,
  dark: darkTheme,
  pixel: pixelTheme,
};

export function getTheme(skin: AppSkin): Theme {
  return themes[skin];
}

export function applyThemeCSSVars(theme: Theme): void {
  const root = document.documentElement;
  root.style.setProperty('--bg-primary', theme.bg.primary);
  root.style.setProperty('--bg-secondary', theme.bg.secondary);
  root.style.setProperty('--bg-tertiary', theme.bg.tertiary);
  root.style.setProperty('--bg-overlay', theme.bg.overlay);
  root.style.setProperty('--bg-card', theme.bg.card);
  root.style.setProperty('--bg-input', theme.bg.input);
  root.style.setProperty('--bg-hover', theme.bg.hover);
  root.style.setProperty('--bg-active', theme.bg.active);
  root.style.setProperty('--text-primary', theme.text.primary);
  root.style.setProperty('--text-secondary', theme.text.secondary);
  root.style.setProperty('--text-muted', theme.text.muted);
  root.style.setProperty('--text-accent', theme.text.accent);
  root.style.setProperty('--text-inverse', theme.text.inverse);
  root.style.setProperty('--accent-primary', theme.accent.primary);
  root.style.setProperty('--accent-secondary', theme.accent.secondary);
  root.style.setProperty('--accent-success', theme.accent.success);
  root.style.setProperty('--accent-warning', theme.accent.warning);
  root.style.setProperty('--accent-danger', theme.accent.danger);
  root.style.setProperty('--border-color', theme.border.color);
  root.style.setProperty('--border-radius', theme.border.radius);
  root.style.setProperty('--border-radius-sm', theme.border.radiusSm);
  root.style.setProperty('--border-radius-lg', theme.border.radiusLg);
  root.style.setProperty('--border-radius-xl', theme.border.radiusXl);
  root.style.setProperty('--shadow-sm', theme.shadow.sm);
  root.style.setProperty('--shadow-md', theme.shadow.md);
  root.style.setProperty('--shadow-lg', theme.shadow.lg);
  root.style.setProperty('--shadow-glow', theme.shadow.glow);
  root.style.setProperty('--blur-sm', theme.blur.sm);
  root.style.setProperty('--blur-md', theme.blur.md);
  root.style.setProperty('--blur-lg', theme.blur.lg);
  root.style.setProperty('--font-body', theme.font.body);
  root.style.setProperty('--font-mono', theme.font.mono);
  root.style.setProperty('--font-xs', theme.font.size.xs);
  root.style.setProperty('--font-sm', theme.font.size.sm);
  root.style.setProperty('--font-md', theme.font.size.md);
  root.style.setProperty('--font-lg', theme.font.size.lg);
  root.style.setProperty('--font-xl', theme.font.size.xl);
  root.style.setProperty('--transition-fast', theme.transition.fast);
  root.style.setProperty('--transition-normal', theme.transition.normal);
  root.style.setProperty('--transition-slow', theme.transition.slow);
}

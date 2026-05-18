import { useCallback, useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { usePetAnimation } from '../../hooks/usePetAnimation';
import { PetAction } from '../../types/pet';
import type { PetSpritesheetGrid } from '../../types/pet';
import { useLocale } from '../../locales';

interface PetSpriteProps {
  spritesheetUrl: string;
  grid: PetSpritesheetGrid;
  action: PetAction;
  size?: number;
  onContextMenu?: (position: { x: number; y: number }) => void;
  onClick?: () => void;
}

interface ContextMenuItem {
  label: string;
  action: () => void;
  icon?: string;
}

export function PetSprite({
  spritesheetUrl,
  grid,
  action,
  size = 112,
  onContextMenu,
  onClick,
}: PetSpriteProps) {
  const { t } = useLocale();
  const { canvasRef, isLoaded } = usePetAnimation({
    spritesheetUrl,
    grid,
    action,
    canvasWidth: size,
    canvasHeight: size,
  });

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (onContextMenu) {
        onContextMenu({ x: e.clientX, y: e.clientY });
        return;
      }

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          { label: t('contextMenu.changePet'), action: () => setContextMenu(null), icon: '🐾' },
          { label: t('contextMenu.settings'), action: () => setContextMenu(null), icon: '⚙️' },
        ],
      });
    },
    [onContextMenu, t]
  );

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenu]);

  const containerStyle: CSSProperties = {
    width: size,
    height: size,
    position: 'relative',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const canvasStyle: CSSProperties = {
    width: size,
    height: size,
    imageRendering: 'pixelated',
  };

  const placeholderStyle: CSSProperties = {
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 48,
    opacity: 0.6,
    animation: 'pulse 1.5s ease-in-out infinite',
  };

  const contextMenuStyle: CSSProperties = {
    position: 'fixed',
    left: contextMenu?.x ?? 0,
    top: contextMenu?.y ?? 0,
    background: 'var(--bg-card)',
    backdropFilter: 'var(--blur-md)',
    WebkitBackdropFilter: 'var(--blur-md)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    boxShadow: 'var(--shadow-lg)',
    padding: '4px 0',
    minWidth: 160,
    zIndex: 9999,
    animation: 'scaleIn 0.15s ease forwards',
  };

  const menuItemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    cursor: 'pointer',
    fontSize: 'var(--font-sm)',
    color: 'var(--text-primary)',
    border: 'none',
    background: 'transparent',
    width: '100%',
    textAlign: 'left',
    transition: 'background var(--transition-fast)',
  };

  return (
    <div style={containerStyle} onContextMenu={handleContextMenu} onClick={onClick}>
      {isLoaded ? (
        <canvas ref={canvasRef} width={size} height={size} style={canvasStyle} />
      ) : (
        <div style={placeholderStyle}>🐱</div>
      )}

      {contextMenu && (
        <div ref={menuRef} style={contextMenuStyle}>
          {contextMenu.items.map((item, i) => (
            <button
              key={i}
              style={menuItemStyle}
              onClick={item.action}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {item.icon && <span>{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { FloatingCommand } from '../../types/command';
import { useLocale } from '../../locales';
import { GlassCard } from '../common/GlassCard';

interface CommandPanelProps {
  commands: FloatingCommand[];
  pinnedIds: string[];
  visible: boolean;
  onExecute: (command: FloatingCommand) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onAdd: () => void;
  onReorder: (commandIds: string[]) => void;
}

export function CommandPanel({
  commands,
  pinnedIds,
  visible,
  onExecute,
  onPin,
  onUnpin,
  onAdd,
  onReorder: _onReorder,
}: CommandPanelProps) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const pinnedCommands = useMemo(
    () => commands.filter((c) => pinnedIds.includes(c.id)),
    [commands, pinnedIds]
  );

  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return commands;
    const q = searchQuery.toLowerCase();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.text.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q)
    );
  }, [commands, searchQuery]);

  const handleExecute = useCallback(
    (cmd: FloatingCommand) => {
      onExecute(cmd);
      invoke('execute_command', { command: cmd.text }).catch(() => {
        // Command execution handled by Tauri backend
      });
    },
    [onExecute]
  );

  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!draggedId || draggedId === targetId) return;

      const newOrder = commands.map((c) => c.id);
      const dragIdx = newOrder.indexOf(draggedId);
      const targetIdx = newOrder.indexOf(targetId);
      if (dragIdx === -1 || targetIdx === -1) return;

      newOrder.splice(dragIdx, 1);
      newOrder.splice(targetIdx, 0, draggedId);
      _onReorder(newOrder);
    },
    [draggedId, commands, _onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
  }, []);

  if (!visible) return null;

  const containerStyle: CSSProperties = {
    width: '100%',
    maxHeight: expanded ? 320 : 160,
    overflow: 'hidden',
    transition: 'max-height var(--transition-normal)',
    animation: 'slideUp 0.25s ease forwards',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  };

  const titleStyle: CSSProperties = {
    fontSize: 'var(--font-sm)',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const searchStyle: CSSProperties = {
    width: '100%',
    padding: '6px 10px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-primary)',
    fontSize: 'var(--font-sm)',
    outline: 'none',
    marginBottom: 8,
  };

  const commandItemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 'var(--border-radius-sm)',
    cursor: 'pointer',
    transition: 'background var(--transition-fast)',
    fontSize: 'var(--font-sm)',
  };

  const listStyle: CSSProperties = {
    maxHeight: expanded ? 200 : 100,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  };

  const btnStyle: CSSProperties = {
    padding: '4px 8px',
    background: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-xs)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  };

  const pinBtnStyle: CSSProperties = {
    padding: '2px 6px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    opacity: 0.6,
    transition: 'opacity var(--transition-fast)',
  };

  return (
    <GlassCard style={containerStyle} padding="10px 12px">
      <div style={headerStyle}>
        <span style={titleStyle}>{t('commandPanel.title')}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            style={btnStyle}
            onClick={() => setExpanded(!expanded)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {expanded ? '▲' : '▼'}
          </button>
          <button
            style={btnStyle}
            onClick={onAdd}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            +
          </button>
        </div>
      </div>

      {expanded && (
        <input
          type="text"
          placeholder={t('commandPanel.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={searchStyle}
          className="allow-select"
        />
      )}

      {/* Pinned commands */}
      {pinnedCommands.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          {pinnedCommands.map((cmd) => (
            <div
              key={`pin-${cmd.id}`}
              style={{
                ...commandItemStyle,
                background: 'var(--bg-tertiary)',
              }}
              onClick={() => handleExecute(cmd)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
              }}
            >
              <span style={{ fontSize: 10, color: 'var(--accent-warning)' }}>📌</span>
              <span style={{ flex: 1, color: 'var(--text-primary)' }}>{cmd.title}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>
                {cmd.summary}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* All commands */}
      <div style={listStyle}>
        {filteredCommands.map((cmd) => {
          const isPinned = pinnedIds.includes(cmd.id);
          return (
            <div
              key={cmd.id}
              style={{
                ...commandItemStyle,
                opacity: draggedId === cmd.id ? 0.5 : 1,
              }}
              draggable
              onDragStart={() => handleDragStart(cmd.id)}
              onDragOver={(e) => handleDragOver(e, cmd.id)}
              onDragEnd={handleDragEnd}
              onClick={() => handleExecute(cmd)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ color: 'var(--text-muted)', cursor: 'grab', fontSize: 10 }}>⋮⋮</span>
              <span style={{ flex: 1, color: 'var(--text-primary)' }}>{cmd.title}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>
                {cmd.summary}
              </span>
              <button
                style={pinBtnStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  isPinned ? onUnpin(cmd.id) : onPin(cmd.id);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.6';
                }}
              >
                {isPinned ? '📌' : '📍'}
              </button>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

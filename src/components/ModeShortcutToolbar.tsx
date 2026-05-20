import { useState, useRef, useEffect } from 'react'
import type { ModeShortcutConfig, ModeShortcut, ShortcutModeId } from '../types/pet'

interface ModeShortcutToolbarProps {
  config: ModeShortcutConfig
  activeModeId: ShortcutModeId
  onModeChange: (modeId: ShortcutModeId) => void
  onShortcutClick: (shortcut: ModeShortcut) => void
  onOpenSettings: () => void
}

const MAX_VISIBLE_SHORTCUTS = 4

export function ModeShortcutToolbar({
  config,
  activeModeId,
  onModeChange,
  onShortcutClick,
  onOpenSettings,
}: ModeShortcutToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  const activeMode = config.modes.find((m) => m.id === activeModeId && m.enabled)
    || config.modes.find((m) => m.enabled)

  const modeShortcuts = config.shortcuts
    .filter((s) => s.modeId === activeModeId && s.enabled)
    .sort((a, b) => a.order - b.order)

  const visibleShortcuts = modeShortcuts.slice(0, MAX_VISIBLE_SHORTCUTS)
  const overflowShortcuts = modeShortcuts.slice(MAX_VISIBLE_SHORTCUTS)

  const enabledModes = config.modes
    .filter((m) => m.enabled)
    .sort((a, b) => a.order - b.order)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (moreOpen && moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen, moreOpen])

  return (
    <div className="mode-shortcut-toolbar">
      <div className="mode-selector-wrapper" ref={menuRef}>
        <button
          className="mode-selector"
          style={{
            borderColor: activeMode?.color || '#7c6ef0',
            color: activeMode?.color || '#7c6ef0',
          }}
          onClick={() => { setMenuOpen((v) => !v); setMoreOpen(false) }}
          title="切换板块"
        >
          <span className="mode-selector-icon">{activeMode?.icon || '📌'}</span>
          <span className="mode-selector-name">{activeMode?.name || '板块'}</span>
          <span className="mode-selector-arrow">▾</span>
        </button>

        {menuOpen && (
          <div className="mode-menu">
            {enabledModes.map((mode) => (
              <button
                key={mode.id}
                className={`mode-menu-item ${mode.id === activeModeId ? 'active' : ''}`}
                onClick={() => {
                  onModeChange(mode.id)
                  setMenuOpen(false)
                }}
              >
                <span className="mode-menu-icon">{mode.icon}</span>
                <span className="mode-menu-name">{mode.name}</span>
                {mode.id === activeModeId && <span className="mode-menu-check">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="shortcut-list">
        {visibleShortcuts.map((s) => (
          <button
            key={s.id}
            className="shortcut-btn"
            onClick={() => onShortcutClick(s)}
            title={s.label}
          >
            {s.icon || s.label.slice(0, 2)}
          </button>
        ))}

        {overflowShortcuts.length > 0 && (
          <div className="shortcut-more-wrapper" ref={moreRef}>
            <button
              className="shortcut-btn shortcut-more-btn"
              onClick={() => { setMoreOpen((v) => !v); setMenuOpen(false) }}
              title="更多"
            >
              ···
            </button>
            {moreOpen && (
              <div className="shortcut-more-menu">
                {overflowShortcuts.map((s) => (
                  <button
                    key={s.id}
                    className="mode-menu-item"
                    onClick={() => {
                      onShortcutClick(s)
                      setMoreOpen(false)
                    }}
                  >
                    <span className="mode-menu-icon">{s.icon}</span>
                    <span className="mode-menu-name">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <button
        className="shortcut-btn shortcut-settings-btn"
        onClick={onOpenSettings}
        title="设置"
      >
        ⚙️
      </button>
    </div>
  )
}

import { useState, useEffect } from 'react'
import type { ModeShortcutConfig, ShortcutMode, ModeShortcut, ShortcutActionType, ShortcutModeId } from '../types/pet'

const ACTION_TYPES: { value: ShortcutActionType; label: string; needsParam: boolean }[] = [
  { value: 'toggleChat', label: '打开/关闭聊天', needsParam: false },
  { value: 'toggleCommands', label: '打开/关闭命令面板', needsParam: false },
  { value: 'openTodoWindow', label: '打开待办窗口', needsParam: false },
  { value: 'addTodo', label: '新增待办', needsParam: false },
  { value: 'voiceTodo', label: '语音录入待办', needsParam: false },
  { value: 'openDiaryWindow', label: '打开日记窗口', needsParam: false },
  { value: 'openStockWindow', label: '打开股票窗口', needsParam: false },
  { value: 'openSettingsWindow', label: '打开设置窗口', needsParam: false },
  { value: 'openRecordingWindow', label: '开始/停止录音', needsParam: false },
  { value: 'openRecordingPanel', label: '打开录音面板', needsParam: false },
  { value: 'executeCommand', label: '执行命令', needsParam: true },
  { value: 'quit', label: '退出应用', needsParam: false },
]

export function ModeShortcutSettings() {
  const [config, setConfig] = useState<ModeShortcutConfig | null>(null)
  const [selectedModeId, setSelectedModeId] = useState<ShortcutModeId>('')
  const [editingShortcut, setEditingShortcut] = useState<ModeShortcut | null>(null)
  const [saveStatus, setSaveStatus] = useState<string>('')

  useEffect(() => {
    window.electronAPI?.getModeShortcutConfig?.().then((c) => {
      if (c) {
        setConfig(c)
        const firstEnabled = c.modes.find((m) => m.enabled)
        if (firstEnabled) setSelectedModeId(firstEnabled.id)
      }
    })
  }, [])

  if (!config) return <div className="settings-empty">加载中…</div>

  const selectedMode = config.modes.find((m) => m.id === selectedModeId)
  const modeShortcuts = config.shortcuts
    .filter((s) => s.modeId === selectedModeId)
    .sort((a, b) => a.order - b.order)

  function showSaved() {
    setSaveStatus('已保存')
    setTimeout(() => setSaveStatus(''), 1500)
  }

  function handleToggleMode(mode: ShortcutMode) {
    const updated = { ...mode, enabled: !mode.enabled }
    setConfig({
      ...config!,
      modes: config!.modes.map((m) => m.id === mode.id ? updated : m),
    })
    window.electronAPI?.saveShortcutMode?.(updated)
    showSaved()
  }

  function handleAddShortcut() {
    if (!selectedModeId) return
    const maxOrder = modeShortcuts.length > 0
      ? Math.max(...modeShortcuts.map((s) => s.order))
      : -1
    const newShortcut: ModeShortcut = {
      id: `${selectedModeId}-${Date.now()}`,
      modeId: selectedModeId,
      label: '新快捷键',
      icon: '🔧',
      actionType: 'toggleChat',
      order: maxOrder + 1,
      enabled: true,
    }
    setConfig({
      ...config!,
      shortcuts: [...config!.shortcuts, newShortcut],
    })
    window.electronAPI?.saveShortcutItem?.(newShortcut)
    setEditingShortcut(newShortcut)
    showSaved()
  }

  function handleDeleteShortcut(id: string) {
    setConfig({
      ...config!,
      shortcuts: config!.shortcuts.filter((s) => s.id !== id),
    })
    window.electronAPI?.deleteShortcutItem?.(id)
    if (editingShortcut?.id === id) setEditingShortcut(null)
    showSaved()
  }

  function handleToggleShortcut(id: string) {
    const item = config!.shortcuts.find((s) => s.id === id)
    if (!item) return
    const updated = { ...item, enabled: !item.enabled }
    setConfig({
      ...config!,
      shortcuts: config!.shortcuts.map((s) => s.id === id ? updated : s),
    })
    window.electronAPI?.saveShortcutItem?.(updated)
    showSaved()
  }

  function handleMoveShortcut(id: string, dir: -1 | 1) {
    const sorted = [...modeShortcuts]
    const idx = sorted.findIndex((s) => s.id === id)
    if (idx < 0) return
    const targetIdx = idx + dir
    if (targetIdx < 0 || targetIdx >= sorted.length) return
    const a = { ...sorted[idx], order: sorted[targetIdx].order }
    const b = { ...sorted[targetIdx], order: sorted[idx].order }
    const otherShortcuts = config!.shortcuts.filter((s) => s.modeId !== selectedModeId)
    const updatedSorted = [...sorted]
    updatedSorted[idx] = a
    updatedSorted[targetIdx] = b
    setConfig({ ...config!, shortcuts: [...otherShortcuts, ...updatedSorted] })
    window.electronAPI?.saveShortcutItem?.(a)
    window.electronAPI?.saveShortcutItem?.(b)
    showSaved()
  }

  function handleUpdateShortcut(field: string, value: string) {
    if (!editingShortcut) return
    let updatedShortcut: ModeShortcut
    if (field === 'actionPayload.command') {
      updatedShortcut = {
        ...editingShortcut,
        actionPayload: { ...editingShortcut.actionPayload, command: value },
      }
    } else {
      updatedShortcut = { ...editingShortcut, [field]: value }
    }
    setEditingShortcut(updatedShortcut)
    setConfig({
      ...config!,
      shortcuts: config!.shortcuts.map((s) =>
        s.id === updatedShortcut.id ? updatedShortcut : s
      ),
    })
    window.electronAPI?.saveShortcutItem?.(updatedShortcut)
    showSaved()
  }

  const currentActionMeta = editingShortcut
    ? ACTION_TYPES.find((a) => a.value === editingShortcut.actionType)
    : null

  return (
    <div className="mode-shortcut-settings">
      <div className="mss-modes">
        <div className="settings-field-header">
          <label>板块列表</label>
        </div>
        <div className="mss-mode-list">
          {config.modes
            .sort((a, b) => a.order - b.order)
            .map((mode) => (
              <button
                key={mode.id}
                className={`mss-mode-item ${mode.id === selectedModeId ? 'active' : ''}`}
                onClick={() => {
                  setSelectedModeId(mode.id)
                  setEditingShortcut(null)
                }}
              >
                <span className="mss-mode-icon">{mode.icon}</span>
                <span className="mss-mode-name">{mode.name}</span>
                <button
                  className={`mss-toggle ${mode.enabled ? 'on' : 'off'}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleMode(mode)
                  }}
                  title={mode.enabled ? '禁用' : '启用'}
                >
                  {mode.enabled ? '✓' : '○'}
                </button>
              </button>
            ))}
        </div>
      </div>

      {selectedMode && (
        <div className="mss-shortcuts">
          <div className="settings-field-header">
            <label>{selectedMode.icon} {selectedMode.name} 的快捷键</label>
            <button className="settings-btn-small" onClick={handleAddShortcut}>+ 添加</button>
          </div>

          <div className="mss-shortcut-list">
            {modeShortcuts.length === 0 && (
              <div className="settings-empty">该板块暂无快捷键</div>
            )}
            {modeShortcuts.map((s, idx) => (
              <div
                key={s.id}
                className={`mss-shortcut-item ${editingShortcut?.id === s.id ? 'editing' : ''} ${!s.enabled ? 'disabled' : ''}`}
              >
                <span className="mss-shortcut-icon">{s.icon}</span>
                <span className="mss-shortcut-label">{s.label}</span>
                <div className="mss-shortcut-actions">
                  <button
                    className="mss-action-btn"
                    onClick={() => handleMoveShortcut(s.id, -1)}
                    disabled={idx === 0}
                    title="上移"
                  >↑</button>
                  <button
                    className="mss-action-btn"
                    onClick={() => handleMoveShortcut(s.id, 1)}
                    disabled={idx === modeShortcuts.length - 1}
                    title="下移"
                  >↓</button>
                  <button
                    className="mss-action-btn"
                    onClick={() => handleToggleShortcut(s.id)}
                    title={s.enabled ? '禁用' : '启用'}
                  >{s.enabled ? '✓' : '○'}</button>
                  <button
                    className="mss-action-btn"
                    onClick={() => setEditingShortcut(editingShortcut?.id === s.id ? null : s)}
                    title="编辑"
                  >✏️</button>
                  <button
                    className="mss-action-btn danger"
                    onClick={() => handleDeleteShortcut(s.id)}
                    title="删除"
                  >🗑</button>
                </div>
              </div>
            ))}
          </div>

          {editingShortcut && (
            <div className="mss-edit-panel">
              <div className="settings-field">
                <label>名称</label>
                <input
                  className="settings-input"
                  value={editingShortcut.label}
                  onChange={(e) => handleUpdateShortcut('label', e.target.value)}
                />
              </div>
              <div className="settings-field">
                <label>图标（emoji）</label>
                <input
                  className="settings-input"
                  value={editingShortcut.icon || ''}
                  onChange={(e) => handleUpdateShortcut('icon', e.target.value)}
                  style={{ width: 80 }}
                />
              </div>
              <div className="settings-field">
                <label>动作</label>
                <select
                  className="settings-select"
                  value={editingShortcut.actionType}
                  onChange={(e) => handleUpdateShortcut('actionType', e.target.value)}
                >
                  {ACTION_TYPES.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
              {currentActionMeta?.needsParam && (
                <div className="settings-field">
                  <label>命令内容</label>
                  <input
                    className="settings-input"
                    value={(editingShortcut.actionPayload?.command as string) || ''}
                    onChange={(e) => handleUpdateShortcut('actionPayload.command', e.target.value)}
                    placeholder="输入要执行的命令"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {saveStatus && (
        <div className="mss-save-status">{saveStatus}</div>
      )}
    </div>
  )
}

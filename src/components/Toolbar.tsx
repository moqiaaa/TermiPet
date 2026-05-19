interface ToolbarProps {
  onToggleCommands: () => void
  onToggleChat: () => void
  onTogglePomodoro: () => void
  commandsOpen: boolean
  chatOpen: boolean
  pomodoroOpen: boolean
}

export function Toolbar({
  onToggleCommands,
  onToggleChat,
  onTogglePomodoro,
  commandsOpen,
  chatOpen,
  pomodoroOpen,
}: ToolbarProps) {
  const handleSettings = () => {
    if (window.electronAPI?.openSettingsWindow) {
      window.electronAPI.openSettingsWindow()
    } else {
      window.location.hash = '#/settings'
    }
  }

  const handleQuit = () => {
    window.electronAPI?.quit?.()
  }

  return (
    <div className="toolbar">
      <button
        className={`toolbar-btn ${commandsOpen ? 'active' : ''}`}
        onClick={onToggleCommands}
        title="命令面板"
      >
        📋
      </button>
      <button
        className={`toolbar-btn ${chatOpen ? 'active' : ''}`}
        onClick={onToggleChat}
        title="聊天"
      >
        💬
      </button>
      <button
        className={`toolbar-btn ${pomodoroOpen ? 'active' : ''}`}
        onClick={onTogglePomodoro}
        title="番茄钟"
      >
        🍅
      </button>
      <button
        className="toolbar-btn"
        onClick={handleSettings}
        title="设置"
      >
        ⚙️
      </button>
      <button
        className="toolbar-btn"
        onClick={handleQuit}
        title="退出"
      >
        ❌
      </button>
    </div>
  )
}

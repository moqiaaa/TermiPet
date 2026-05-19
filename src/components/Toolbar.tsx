interface ToolbarProps {
  onToggleCommands: () => void
  onToggleChat: () => void
  commandsOpen: boolean
  chatOpen: boolean
}

export function Toolbar({
  onToggleCommands,
  onToggleChat,
  commandsOpen,
  chatOpen,
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

  const handleOpenTodo = () => {
    window.electronAPI?.openTodoWindow?.()
  }

  const handleOpenDiary = () => {
    window.electronAPI?.openDiaryWindow?.()
  }

  const handleOpenStock = () => {
    window.electronAPI?.openStockWindow?.()
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
        className="toolbar-btn"
        onClick={handleOpenTodo}
        title="待办"
      >
        ✅
      </button>
      <button
        className="toolbar-btn"
        onClick={handleOpenDiary}
        title="日记"
      >
        📔
      </button>
      <button
        className="toolbar-btn"
        onClick={handleOpenStock}
        title="股票"
      >
        📈
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

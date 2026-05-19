import { useState, useEffect } from 'react'
import type { Command } from '../types/pet'

interface CommandPanelProps {
  visible: boolean
}

export function CommandPanel({ visible }: CommandPanelProps) {
  const [commands, setCommands] = useState<Command[]>([])

  useEffect(() => {
    if (!visible) return
    window.electronAPI?.getCommands?.().then(setCommands).catch(() => {})
  }, [visible])

  const handleExecute = (cmd: Command) => {
    window.electronAPI?.executeCommand?.(cmd.command)
  }

  const handleAdd = () => {
    const name = prompt('命令名称：')
    if (!name) return
    const command = prompt('命令内容：')
    if (!command) return

    const newCmd: Command = {
      id: Date.now().toString(),
      name,
      command,
      pinned: false,
      isCustom: true,
    }
    const updated = [...commands, newCmd]
    setCommands(updated)
    window.electronAPI?.saveCommands?.(updated)
  }

  if (!visible) return null

  const sorted = [...commands].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return 0
  })

  return (
    <div className="command-panel">
      <div className="command-panel-header">
        <span>命令</span>
        <button className="command-add-btn" onClick={handleAdd} title="添加命令">+</button>
      </div>
      <div className="command-list">
        {sorted.length === 0 && (
          <div className="command-empty">暂无命令</div>
        )}
        {sorted.map((cmd) => (
          <button
            key={cmd.id}
            className="command-item"
            onClick={() => handleExecute(cmd)}
            title={cmd.description || cmd.command}
          >
            {cmd.pinned && <span className="command-pin">⭐</span>}
            <span className="command-name">{cmd.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

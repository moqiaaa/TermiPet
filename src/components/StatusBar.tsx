import type { ClaudeState, AgentState } from '../types/pet'

interface StatusBarProps {
  claudeState: ClaudeState | null
  activeApp: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

const STATE_LABELS: Record<AgentState, string> = {
  idle: '空闲',
  working: 'Claude 正在工作……',
  waiting: 'Claude 等待确认……',
  compacting: 'Claude 正在压缩……',
  stopped: 'Claude 已停止',
  error: 'Claude 发生错误',
}

export function StatusBar({ claudeState, activeApp, onMouseEnter, onMouseLeave }: StatusBarProps) {
  let text = '空闲'
  let stateClass = 'idle'

  if (claudeState && claudeState.state !== 'idle') {
    text = claudeState.summary || STATE_LABELS[claudeState.state]
    stateClass = claudeState.state
  } else if (activeApp) {
    text = activeApp
  }

  return (
    <div
      className={`status-bar status-${stateClass}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={text}
    >
      <span className="status-dot" />
      <span className="status-text">{text}</span>
    </div>
  )
}

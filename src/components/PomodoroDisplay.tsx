import type { PomodoroState } from '../types/pet'

interface PomodoroDisplayProps {
  state: PomodoroState
  visible: boolean
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function PomodoroDisplay({ state, visible }: PomodoroDisplayProps) {
  if (!visible) return null

  const handleStart = () => window.electronAPI?.startPomodoro?.()
  const handlePause = () => window.electronAPI?.pausePomodoro?.()
  const handleReset = () => window.electronAPI?.resetPomodoro?.()

  const phaseLabel = state.phase === 'work' ? '工作' : state.phase === 'break' ? '休息' : '就绪'

  return (
    <div className={`pomodoro-display pomodoro-${state.phase}`}>
      <div className="pomodoro-phase">{phaseLabel}</div>
      <div className="pomodoro-time">{formatTime(state.remaining)}</div>
      <div className="pomodoro-controls">
        {state.isRunning ? (
          <button className="pomodoro-btn" onClick={handlePause} title="暂停">⏸</button>
        ) : (
          <button className="pomodoro-btn" onClick={handleStart} title="开始">▶</button>
        )}
        <button className="pomodoro-btn" onClick={handleReset} title="重置">⏹</button>
      </div>
    </div>
  )
}

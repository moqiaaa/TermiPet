import { useEffect, useRef } from 'react'
import type { Todo } from '../types/pet'

interface TodoReminderProps {
  todo: Todo | null
  onDismiss: (id: string) => void
  onOpen: () => void
  onSnooze: (id: string, minutes: number) => void
}

const AUTO_DISMISS_MS = 30000

function formatReminderTime(todo: Todo) {
  const value = todo.reminderAt || todo.dueDate
  if (!value) return '已到提醒时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '已到提醒时间'
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TodoReminder({ todo, onDismiss, onOpen, onSnooze }: TodoReminderProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!todo) return

    timerRef.current = setTimeout(() => {
      onDismiss(todo.id)
    }, AUTO_DISMISS_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [todo?.id, onDismiss])

  if (!todo) return null

  return (
    <div className="todo-reminder-overlay">
      <div className="todo-reminder-popover">
        <div className="todo-reminder-head">
          <div className="todo-reminder-icon">!</div>
          <div>
            <div className="todo-reminder-title">任务到期</div>
            <div className="todo-reminder-time">{formatReminderTime(todo)}</div>
          </div>
        </div>

        <div className="todo-reminder-task">
          <span>{todo.priority === 'high' ? '高优先级' : todo.priority === 'low' ? '低优先级' : '待办提醒'}</span>
          <strong>{todo.title}</strong>
          {todo.note && <p>{todo.note}</p>}
        </div>

        <div className="todo-reminder-snooze">
          <button onClick={() => onSnooze(todo.id, 10)}>10 分钟</button>
          <button onClick={() => onSnooze(todo.id, 30)}>30 分钟</button>
        </div>

        <div className="todo-reminder-actions">
          <button
            className="primary"
            onClick={() => { onDismiss(todo.id); onOpen() }}
          >
            打开任务
          </button>
          <button onClick={() => onDismiss(todo.id)}>知道了</button>
        </div>
      </div>
    </div>
  )
}

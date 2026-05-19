import { useEffect, useRef } from 'react'
import type { ApprovalPrompt as ApprovalPromptType } from '../types/pet'

interface ApprovalPromptProps {
  prompt: ApprovalPromptType | null
  onResolve: (id: string, decision: 'allow' | 'deny') => void
}

const AUTO_DISMISS_MS = 25000

export function ApprovalPrompt({ prompt, onResolve }: ApprovalPromptProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!prompt) return

    timerRef.current = setTimeout(() => {
      // Auto-dismiss defaults to deny (ask again)
      onResolve(prompt.id, 'deny')
    }, AUTO_DISMISS_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [prompt?.id])

  if (!prompt) return null

  return (
    <div className="approval-overlay">
      <div className="approval-card">
        <div className="approval-header">
          <span className="approval-icon">🔐</span>
          <span className="approval-title">{prompt.title || '权限请求'}</span>
        </div>
        {prompt.toolName && (
          <div className="approval-tool">工具: {prompt.toolName}</div>
        )}
        <div className="approval-summary">{prompt.summary}</div>
        {prompt.detail && (
          <div className="approval-detail">{prompt.detail}</div>
        )}
        <div className="approval-actions">
          <button
            className="approval-btn approval-allow"
            onClick={() => onResolve(prompt.id, 'allow')}
          >
            ✅ 允许
          </button>
          <button
            className="approval-btn approval-deny"
            onClick={() => onResolve(prompt.id, 'deny')}
          >
            ❌ 拒绝
          </button>
        </div>
      </div>
    </div>
  )
}

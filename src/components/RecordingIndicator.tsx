import { useState, useEffect, useRef } from 'react'

type RecPhase = 'idle' | 'recording' | 'transcribing' | 'summarizing' | 'done' | 'error'

interface Props {
  phase: RecPhase
  recordingTime: number
  errorMsg?: string
  onStop: () => void
  onViewResults: () => void
  onDismiss: () => void
}

export function RecordingIndicator({ phase, recordingTime, errorMsg, onStop, onViewResults, onDismiss }: Props) {
  if (phase === 'idle') return null

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="rec-indicator">
      {phase === 'recording' && (
        <>
          <span className="rec-indicator-dot" />
          <span className="rec-indicator-label">录音中</span>
          <span className="rec-indicator-timer">{formatTime(recordingTime)}</span>
          <span className="rec-indicator-divider" />
          <button className="rec-indicator-stop" onClick={onStop}>
            <span className="rec-indicator-stop-icon" />
          </button>
        </>
      )}

      {(phase === 'transcribing' || phase === 'summarizing') && (
        <>
          <span className="rec-indicator-spinner" />
          <span className="rec-indicator-label">
            {phase === 'transcribing' ? '正在转写...' : '正在生成摘要...'}
          </span>
        </>
      )}

      {phase === 'done' && (
        <>
          <span className="rec-indicator-check">✓</span>
          <span className="rec-indicator-label">录音纪要已完成</span>
          <button className="rec-indicator-view" onClick={onViewResults}>查看</button>
        </>
      )}

      {phase === 'error' && (
        <>
          <span className="rec-indicator-error-icon">!</span>
          <span className="rec-indicator-label">{errorMsg || '处理失败'}</span>
          <button className="rec-indicator-dismiss" onClick={onDismiss}>✕</button>
        </>
      )}
    </div>
  )
}

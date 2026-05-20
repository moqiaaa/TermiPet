import { useState, useEffect, useRef } from 'react'
import type { ChatMessage } from '../types/pet'

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamBuffer, setStreamBuffer] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const doSend = (text: string, images?: string[]) => {
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setStreaming(true)
    if (images?.length) {
      window.electronAPI?.sendChatMessage?.({ text, images })
    } else {
      window.electronAPI?.sendChatMessage?.(text)
    }
  }

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    api.getChatHistory?.().then((history) => {
      if (history) setMessages(history)
    }).catch(() => {})

    api.getPendingChatMessage?.().then((payload) => {
      if (payload) {
        doSend(payload.text, payload.images)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!window.electronAPI) return

    const cleanupChunk = window.electronAPI.onChatChunk?.((chunk: string) => {
      setStreaming(true)
      setStreamBuffer((prev) => prev + chunk)
    })

    const cleanupComplete = window.electronAPI.onChatComplete?.((message: ChatMessage) => {
      setStreaming(false)
      if (message) {
        setMessages((prev) => [...prev.filter((m) => m.timestamp !== -1), message])
      }
      setStreamBuffer('')
    })

    const cleanupError = window.electronAPI.onChatError?.((error: string) => {
      setStreaming(false)
      setStreamBuffer('')
      setMessages((prev) => [
        ...prev.filter((m) => m.timestamp !== -1),
        { role: 'assistant', content: `错误: ${error}`, timestamp: Date.now() },
      ])
    })

    return () => {
      cleanupChunk?.()
      cleanupComplete?.()
      cleanupError?.()
    }
  }, [])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, streamBuffer])

  const handleSend = () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    doSend(text)
  }

  const handleCancel = () => {
    window.electronAPI?.cancelChat?.()
    setStreaming(false)
    setStreamBuffer('')
  }

  const handleClear = () => {
    window.electronAPI?.clearChatHistory?.()
    setMessages([])
    setStreamBuffer('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const displayMessages = [...messages]
  if (streaming && streamBuffer) {
    displayMessages.push({ role: 'assistant', content: streamBuffer, timestamp: -1 })
  }

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <span className="chat-window-title">宠物聊天</span>
        <div className="chat-window-header-actions">
          <button className="chat-window-new" onClick={handleClear} title="新建对话">
            ＋ 新对话
          </button>
        </div>
      </div>
      <div className="chat-window-messages" ref={listRef}>
        {displayMessages.length === 0 && (
          <div className="chat-window-empty">和宠物聊天吧~</div>
        )}
        {displayMessages.map((msg, i) => (
          <div key={i} className={`chat-window-msg chat-window-msg-${msg.role}`}>
            <div className="chat-window-bubble">{msg.content}</div>
          </div>
        ))}
      </div>
      <div className="chat-window-input-row">
        <textarea
          className="chat-window-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息…… (Enter 发送, Shift+Enter 换行)"
          disabled={streaming}
          rows={2}
        />
        {streaming ? (
          <button className="chat-window-cancel-btn" onClick={handleCancel} title="取消">
            ⏹ 停止
          </button>
        ) : (
          <button
            className="chat-window-send-btn"
            onClick={handleSend}
            disabled={!input.trim()}
            title="发送"
          >
            发送
          </button>
        )}
      </div>
    </div>
  )
}

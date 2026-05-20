import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import type { ChatMessage, ChatMessagePayload } from '../types/pet'

interface ChatPanelProps {
  visible: boolean
}

export interface ChatPanelHandle {
  sendMessage: (payload: ChatMessagePayload) => void
}

export const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(
  function ChatPanel({ visible }, ref) {
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

    useImperativeHandle(ref, () => ({
      sendMessage: (payload: ChatMessagePayload) => {
        doSend(payload.text, payload.images)
      },
    }))

    useEffect(() => {
      window.electronAPI?.getChatHistory?.().then((history) => {
        if (history) setMessages(history)
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
      <div className="chat-panel" style={{ display: visible ? undefined : 'none' }}>
        <div className="chat-messages" ref={listRef}>
          {displayMessages.length === 0 && (
            <div className="chat-empty">和宠物聊天吧~</div>
          )}
          {displayMessages.map((msg, i) => (
            <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
              <div className="chat-bubble">{msg.content}</div>
            </div>
          ))}
        </div>
        <div className="chat-input-row">
          <input
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息……"
            disabled={streaming}
          />
          {streaming ? (
            <button className="chat-cancel-btn" onClick={handleCancel} title="取消">
              ⏹
            </button>
          ) : (
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!input.trim()}
              title="发送"
            >
              ▶
            </button>
          )}
        </div>
      </div>
    )
  },
)

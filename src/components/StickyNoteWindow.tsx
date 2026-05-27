import { useState, useEffect, useCallback, useRef } from 'react'
import type { StickyNote, StickyNoteColor, StickyNoteBlock } from '../types/pet'

const COLORS: { id: StickyNoteColor; bg: string; text: string; border: string }[] = [
  { id: 'default', bg: '#1a1a2e', text: '#e0e0e8', border: '#ffffff15' },
  { id: 'yellow', bg: '#fef9c3', text: '#451a03', border: '#facc1530' },
  { id: 'blue', bg: '#dbeafe', text: '#1e293b', border: '#60a5fa30' },
  { id: 'green', bg: '#dcfce7', text: '#14532d', border: '#22c55e30' },
  { id: 'purple', bg: '#f3e8ff', text: '#3b0764', border: '#a855f730' },
]

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function getColorStyle(colorId: StickyNoteColor) {
  return COLORS.find((c) => c.id === colorId) || COLORS[0]
}

function formatTime(ts?: number) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  if (diffMs < 60_000) return '刚刚'
  if (diffMs < 3600_000) return `${Math.floor(diffMs / 60_000)} 分钟前`
  if (diffMs < 86400_000) return `${Math.floor(diffMs / 3600_000)} 小时前`
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function ensureBlocks(note: StickyNote): StickyNoteBlock[] {
  if (note.blocks && note.blocks.length > 0) return note.blocks
  return [{ type: 'text', content: note.content || '' }]
}

function BlockImage({ path, onDelete, onLoad }: {
  path: string
  onDelete: () => void
  onLoad?: () => void
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    let cancelled = false
    window.electronAPI?.getStickyImage?.(path).then((data) => {
      if (!cancelled && data) {
        setSrc(data)
        onLoad?.()
      }
    })
    return () => { cancelled = true }
  }, [path])

  if (!src) {
    return (
      <div className="sticky-block-img-loading">
        <span>加载中...</span>
      </div>
    )
  }

  return (
    <div
      className="sticky-block-img-wrap"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <img src={src} className="sticky-block-img" onClick={() => window.electronAPI?.previewStickyImage?.(path)} style={{ cursor: 'pointer' }} />
      {hover && (
        <button className="sticky-block-img-del" onClick={onDelete}>✕</button>
      )}
    </div>
  )
}

function AutoTextarea({ value, onChange, placeholder, style, onFocus, autoFocus }: {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  style?: React.CSSProperties
  onFocus?: () => void
  autoFocus?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0'
    el.style.height = Math.max(28, el.scrollHeight) + 'px'
  }, [])

  useEffect(() => { resize() }, [value, resize])

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus()
      const len = ref.current.value.length
      ref.current.setSelectionRange(len, len)
    }
  }, [autoFocus])

  return (
    <textarea
      ref={ref}
      className="sticky-block-text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      placeholder={placeholder}
      style={style}
      rows={1}
    />
  )
}

export function StickyNoteWindow() {
  const [notes, setNotes] = useState<StickyNote[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [focusedBlockIdx, setFocusedBlockIdx] = useState(0)
  const [capturing, setCapturing] = useState(false)
  const initRef = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const activeNote = notes.find((n) => n.id === activeId) || null
  const colorStyle = getColorStyle(activeNote?.color || 'default')
  const isLight = activeNote ? activeNote.color !== 'default' : false
  const blocks = activeNote ? ensureBlocks(activeNote) : []

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    window.electronAPI?.getStickyNotes?.().then((list) => {
      if (list && list.length > 0) {
        setNotes(list)
        setActiveId(list[0].id)
      } else {
        const first: StickyNote = {
          id: generateId(),
          title: '便签 1',
          content: '',
          blocks: [{ type: 'text', content: '' }],
          color: 'default',
          pinned: false,
          createdAt: Date.now(),
        }
        setNotes([first])
        setActiveId(first.id)
        window.electronAPI?.saveStickyNote?.(first)
      }
    })
  }, [])

  const saveNote = useCallback(
    (updated: StickyNote) => {
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
      window.electronAPI?.saveStickyNote?.(updated)
    },
    [],
  )

  const updateBlocks = useCallback(
    (newBlocks: StickyNoteBlock[]) => {
      if (!activeNote) return
      const plainContent = newBlocks.filter((b) => b.type === 'text').map((b) => b.content).join('\n')
      saveNote({ ...activeNote, blocks: newBlocks, content: plainContent })
    },
    [activeNote, saveNote],
  )

  const handleTextBlockChange = useCallback(
    (idx: number, value: string) => {
      const newBlocks = [...blocks]
      newBlocks[idx] = { type: 'text', content: value }
      updateBlocks(newBlocks)
    },
    [blocks, updateBlocks],
  )

  const handleDeleteImage = useCallback(
    (idx: number) => {
      const block = blocks[idx]
      if (block.type !== 'image') return
      window.electronAPI?.deleteStickyImage?.(block.path)
      const newBlocks = [...blocks]
      newBlocks.splice(idx, 1)
      // merge adjacent text blocks
      const merged: StickyNoteBlock[] = []
      for (const b of newBlocks) {
        const prev = merged[merged.length - 1]
        if (b.type === 'text' && prev && prev.type === 'text') {
          merged[merged.length - 1] = { type: 'text', content: prev.content + '\n' + b.content }
        } else {
          merged.push(b)
        }
      }
      if (merged.length === 0) merged.push({ type: 'text', content: '' })
      updateBlocks(merged)
    },
    [blocks, updateBlocks],
  )

  const handleScreenshot = useCallback(async () => {
    if (!activeNote || capturing) return
    setCapturing(true)
    try {
      const result = await window.electronAPI?.captureScreen()
      if (!result?.data) return
      const filePath = await window.electronAPI?.saveStickyImage(activeNote.id, result.data)
      if (!filePath) return

      const newBlocks = [...blocks]
      // insert image after focused text block, then add a new text block after it
      let insertIdx = focusedBlockIdx + 1
      if (insertIdx > newBlocks.length) insertIdx = newBlocks.length
      newBlocks.splice(insertIdx, 0, { type: 'image', path: filePath })
      // ensure there's a text block after the image
      if (insertIdx + 1 >= newBlocks.length || newBlocks[insertIdx + 1]?.type !== 'text') {
        newBlocks.splice(insertIdx + 1, 0, { type: 'text', content: '' })
      }
      updateBlocks(newBlocks)
      setFocusedBlockIdx(insertIdx + 1)
    } finally {
      setCapturing(false)
    }
  }, [activeNote, blocks, focusedBlockIdx, capturing, updateBlocks])

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!activeNote) return
      saveNote({ ...activeNote, title: e.target.value })
    },
    [activeNote, saveNote],
  )

  const handleColorChange = useCallback(
    (colorId: StickyNoteColor) => {
      if (!activeNote) return
      saveNote({ ...activeNote, color: colorId })
      setColorPickerOpen(false)
    },
    [activeNote, saveNote],
  )

  const handleAddNote = useCallback(() => {
    const newNote: StickyNote = {
      id: generateId(),
      title: `便签 ${notes.length + 1}`,
      content: '',
      blocks: [{ type: 'text', content: '' }],
      color: 'default',
      pinned: false,
      createdAt: Date.now(),
    }
    setNotes((prev) => [newNote, ...prev])
    setActiveId(newNote.id)
    setFocusedBlockIdx(0)
    window.electronAPI?.saveStickyNote?.(newNote)
  }, [notes.length])

  const handleDeleteNote = useCallback(() => {
    if (!activeNote || notes.length <= 1) return
    const idx = notes.findIndex((n) => n.id === activeNote.id)
    const nextId = notes[idx === 0 ? 1 : idx - 1]?.id || null
    setNotes((prev) => prev.filter((n) => n.id !== activeNote.id))
    setActiveId(nextId)
    setFocusedBlockIdx(0)
    window.electronAPI?.deleteStickyNote?.(activeNote.id)
  }, [activeNote, notes])

  const handleSyncToTodo = useCallback(() => {
    if (!activeNote) return
    const textContent = blocks.filter((b) => b.type === 'text').map((b) => b.content).join('\n').trim()
    if (!textContent) return
    const todo = {
      id: generateId(),
      title: textContent.split('\n')[0].slice(0, 100) || activeNote.title,
      done: false,
      projectId: 'inbox',
      note: textContent,
      status: 'backlog' as const,
      createdAt: Date.now(),
    }
    window.electronAPI?.saveTodo?.(todo as never)
  }, [activeNote, blocks])

  return (
    <div className={`sticky-window ${isLight ? 'sticky-light' : ''}`} style={{ background: colorStyle.bg }}>
      <div className="sticky-titlebar" style={{ borderBottom: `1px solid ${colorStyle.border}` }}>
        <div className="sticky-tabs">
          {notes.map((n) => (
            <button
              key={n.id}
              className={`sticky-tab ${n.id === activeId ? 'active' : ''}`}
              onClick={() => { setActiveId(n.id); setFocusedBlockIdx(0) }}
              style={n.id === activeId ? { color: colorStyle.text } : undefined}
            >
              {n.title || '便签'}
            </button>
          ))}
          <button className="sticky-tab sticky-tab-add" onClick={handleAddNote} title="新建便签">
            +
          </button>
        </div>
        <div className="sticky-actions">
          <div className="sticky-color-wrap">
            <button
              className="sticky-color-btn"
              style={{ background: COLORS.find((c) => c.id === activeNote?.color)?.id === 'default' ? '#7c6ef0' : COLORS.find((c) => c.id === activeNote?.color)?.bg }}
              onClick={() => setColorPickerOpen(!colorPickerOpen)}
              title="便签颜色"
            />
            {colorPickerOpen && (
              <div className="sticky-color-picker">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    className={`sticky-color-opt ${c.id === activeNote?.color ? 'active' : ''}`}
                    style={{ background: c.id === 'default' ? '#7c6ef0' : c.bg }}
                    onClick={() => handleColorChange(c.id)}
                  />
                ))}
              </div>
            )}
          </div>
          <button
            className="sticky-act-btn sticky-screenshot-btn"
            onClick={handleScreenshot}
            title="插入截图"
            style={{ color: colorStyle.text, opacity: capturing ? 0.3 : undefined }}
            disabled={capturing}
          >
            📷
          </button>
          {notes.length > 1 && (
            <button className="sticky-act-btn" onClick={handleDeleteNote} title="删除便签" style={{ color: colorStyle.text }}>
              🗑
            </button>
          )}
        </div>
      </div>

      {activeNote && (
        <>
          <input
            className="sticky-title-input"
            value={activeNote.title}
            onChange={handleTitleChange}
            placeholder="标题"
            style={{ color: colorStyle.text }}
          />
          <div className="sticky-blocks-scroll" ref={contentRef}>
            {blocks.map((block, idx) =>
              block.type === 'text' ? (
                <AutoTextarea
                  key={`${activeNote.id}-${idx}`}
                  value={block.content}
                  onChange={(val) => handleTextBlockChange(idx, val)}
                  onFocus={() => setFocusedBlockIdx(idx)}
                  placeholder={idx === 0 && blocks.length === 1 ? '在这里写点什么…' : undefined}
                  style={{ color: colorStyle.text }}
                  autoFocus={idx === focusedBlockIdx}
                />
              ) : (
                <BlockImage
                  key={`${activeNote.id}-img-${idx}`}
                  path={block.path}
                  onDelete={() => handleDeleteImage(idx)}
                  onLoad={() => {
                    contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight, behavior: 'smooth' })
                  }}
                />
              )
            )}
          </div>
          <div className="sticky-footer" style={{ borderTop: `1px solid ${colorStyle.border}` }}>
            <span className="sticky-time" style={{ color: '#64748b' }}>
              {formatTime(activeNote.updatedAt || activeNote.createdAt)}
            </span>
            <button className="sticky-sync-btn" onClick={handleSyncToTodo}>
              同步到待办 →
            </button>
          </div>
        </>
      )}

    </div>
  )
}

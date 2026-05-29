import { useState, useEffect, useRef, useCallback } from 'react'
import { PetSprite } from './components/PetSprite'
import { PetSelector } from './components/PetSelector'
import { StatusBar } from './components/StatusBar'
import { ActionBar } from './components/ActionBar'
import { ModeShortcutToolbar } from './components/ModeShortcutToolbar'
import { CommandPanel } from './components/CommandPanel'
import { ChatPanel } from './components/ChatPanel'
import type { ChatPanelHandle } from './components/ChatPanel'
import { ApprovalPrompt } from './components/ApprovalPrompt'
import { TodoReminder, type ReminderItem } from './components/TodoReminder'
import { QuotaCards } from './components/QuotaCard'
import { SettingsWindow } from './components/SettingsWindow'
import { TodoWindow } from './components/TodoWindow'
import { DiaryWindow } from './components/DiaryWindow'
import { StockWindow } from './components/StockWindow'
import { ChatWindow } from './components/ChatWindow'
import { RecordingWindow } from './components/RecordingWindow'
import { StickyNoteWindow } from './components/StickyNoteWindow'
import { RecordingIndicator } from './components/RecordingIndicator'
import type {
  PetMetadata,
  ClaudeState,
  ApprovalPrompt as ApprovalPromptType,
  UsageQuota,
  AgentState,
  Todo,
  ModeShortcutConfig,
  ModeShortcut,
  ShortcutModeId,
} from './types/pet'
import './App.css'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Map Claude agent state to a pet action index */
function resolveAction(state: AgentState): number {
  switch (state) {
    case 'error': return 5
    case 'waiting': return 4
    case 'working': return 1
    case 'compacting': return 7
    case 'stopped': return 0
    default: return 0
  }
}

function PetWindow() {
  // --- Pet state ---
  const [pets, setPets] = useState<PetMetadata[]>([])
  const [selectedPet, setSelectedPet] = useState<PetMetadata | null>(null)
  const [showSelector, setShowSelector] = useState(false)

  // --- UI visibility ---
  const [hovered, setHovered] = useState(false)
  const [commandsOpen, setCommandsOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [quotaVisible, setQuotaVisible] = useState(false)

  // --- Claude state ---
  const [claudeState, setClaudeState] = useState<ClaudeState | null>(null)
  const [approval, setApproval] = useState<ApprovalPromptType | null>(null)
  const [activeApp, setActiveApp] = useState('')

  // --- Pet action ---
  const [autoAction, setAutoAction] = useState(0)
  const [previewAction, setPreviewAction] = useState<number | null>(null)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Quotas ---
  const [quotas, setQuotas] = useState<UsageQuota[]>([])

  // --- Mode shortcut ---
  const [modeConfig, setModeConfig] = useState<ModeShortcutConfig | null>(null)
  const [activeModeId, setActiveModeId] = useState<ShortcutModeId>('assistant')

  // --- Todo reminder ---
  const [todoReminder, setTodoReminder] = useState<ReminderItem | null>(null)

  // --- Pet recording ---
  const [recPhase, setRecPhase] = useState<'idle' | 'recording' | 'transcribing' | 'summarizing' | 'done' | 'error'>('idle')
  const [recTime, setRecTime] = useState(0)
  const [recError, setRecError] = useState('')
  const recTimeRef = useRef(0)
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recMediaRef = useRef<MediaRecorder | null>(null)
  const recChunksRef = useRef<Blob[]>([])

  // --- Walking ---
  const [walkPhase, setWalkPhase] = useState<string>('idle')
  const [walkDirection, setWalkDirection] = useState(1)

  // --- Window drag ---
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{
    mouseX: number
    mouseY: number
    winX: number
    winY: number
  } | null>(null)

  // --- File drop ---
  const [isFileDragOver, setIsFileDragOver] = useState(false)
  const [isEating, setIsEating] = useState(false)
  const [eatScale, setEatScale] = useState(1)
  const [speechBubble, setSpeechBubble] = useState<string | null>(null)
  const dragCounterRef = useRef(0)
  const chatPanelRef = useRef<ChatPanelHandle>(null)

  // Current displayed action: preview > walk > auto
  const walkAction = walkPhase === 'walking' ? 2 : null
  const currentAction = previewAction !== null ? previewAction : (walkAction !== null ? walkAction : autoAction)

  // --- Init ---
  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    async function init() {
      const petList = await api.getPets()
      setPets(petList)

      const selectedId = await api.getSelectedPet()
      const found = petList.find((p) => p.id === selectedId) || petList[0]
      if (found) setSelectedPet(found)

      const shortcutConfig = await api.getModeShortcutConfig?.()
      if (shortcutConfig) {
        setModeConfig(shortcutConfig)
        setActiveModeId(shortcutConfig.activeModeId)
      }
    }
    init()

    // Pet changed
    const cleanupPet = api.onPetChanged(async (petId) => {
      const petList = await api.getPets()
      setPets(petList)
      const found = petList.find((p) => p.id === petId)
      if (found) setSelectedPet(found)
    })

    // Claude state
    const cleanupClaude = api.onClaudeStateChanged?.((state) => {
      setClaudeState(state)
      setAutoAction(resolveAction(state.state))
    })

    // Approval prompts
    const cleanupApproval = api.onApprovalPrompt?.((prompt) => {
      setApproval(prompt)
    })

    // Todo reminder
    const cleanupReminder = api.onTodoReminder?.((data: any) => {
      if (data.type === 'strategy') {
        setTodoReminder({ type: 'strategy', id: data.id, title: data.title, note: data.note, priority: data.priority, stock_code: data.stock_code })
      } else {
        setTodoReminder({ type: 'todo', todo: data as Todo })
      }
    })

    // Active app
    const cleanupApp = api.onActiveAppChanged?.((app: unknown) => {
      if (typeof app === 'string') {
        setActiveApp(app)
      } else if (app && typeof app === 'object' && 'processName' in app) {
        const a = app as { processName: string; windowTitle?: string }
        setActiveApp(a.windowTitle || a.processName)
      }
    })

    // Walking state
    const cleanupWalk = api.onWalkStateChanged?.((state: { phase: string; direction: number }) => {
      setWalkPhase(state.phase)
      setWalkDirection(state.direction)
    })

    // Recording progress from main process
    const cleanupRecProgress = api.onRecordingProgress?.((phase: string) => {
      if (phase === 'done') {
        setRecPhase('idle')
        window.electronAPI?.openRecordingResults?.()
      } else if (phase === 'transcribing' || phase === 'summarizing' || phase === 'error') {
        setRecPhase(phase as typeof recPhase)
      }
    })

    return () => {
      cleanupPet()
      cleanupClaude?.()
      cleanupApproval?.()
      cleanupReminder?.()
      cleanupApp?.()
      cleanupWalk?.()
      cleanupRecProgress?.()
    }
  }, [])

  // --- Quota loading ---
  useEffect(() => {
    if (!quotaVisible) return
    window.electronAPI?.getUsageQuotas?.().then(setQuotas).catch(() => {})
  }, [quotaVisible])

  // --- Pet selection ---
  const handlePetSelect = useCallback(async (pet: PetMetadata) => {
    setSelectedPet(pet)
    setShowSelector(false)
    await window.electronAPI?.setSelectedPet(pet.id)
  }, [])

  // --- Preview action (temporary) ---
  const handlePreviewAction = useCallback((index: number) => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    setPreviewAction(index)
    previewTimerRef.current = setTimeout(() => {
      setPreviewAction(null)
    }, 3000)
  }, [])

  // --- Approval resolution ---
  const handleResolveApproval = useCallback((id: string, decision: 'allow' | 'deny') => {
    window.electronAPI?.resolveApproval?.(id, decision)
    setApproval(null)
  }, [])

  // --- Todo reminder ---
  const handleDismissReminder = useCallback((id: string) => {
    if (todoReminder?.type === 'todo') {
      window.electronAPI?.dismissTodoReminder?.(id)
    }
    setTodoReminder(null)
  }, [todoReminder])

  const handleOpenReminder = useCallback((item: ReminderItem) => {
    if (item.type === 'todo') {
      window.electronAPI?.openTodoWindow?.()
    } else if (item.type === 'strategy') {
      window.electronAPI?.openStockWindow?.()
    }
  }, [])

  const handleSnoozeReminder = useCallback((id: string, minutes: number) => {
    window.electronAPI?.snoozeTodoReminder?.(id, minutes)
    setTodoReminder(null)
  }, [])

  useEffect(() => {
    if (todoReminder) {
      window.electronAPI?.setIgnoreMouse?.(false)
    } else if (!hovered && !commandsOpen && !chatOpen && !showSelector && recPhase === 'idle') {
      window.electronAPI?.setIgnoreMouse?.(true)
    }
  }, [todoReminder])

  // --- Pet recording handlers ---
  const startPetRecording = useCallback(async () => {
    setRecError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })
      recChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recChunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(recChunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1]
          const result = await window.electronAPI?.processPetRecording(base64, recTimeRef.current)
          if (result?.error) {
            setRecError(result.error)
            setRecPhase('error')
          }
        }
        reader.readAsDataURL(blob)
      }
      recorder.start(1000)
      recMediaRef.current = recorder
      setRecPhase('recording')
      setRecTime(0)
      recTimeRef.current = 0
      window.electronAPI?.setIgnoreMouse?.(false)
      recTimerRef.current = setInterval(() => {
        recTimeRef.current += 1
        setRecTime(recTimeRef.current)
      }, 1000)
    } catch (err) {
      setRecError(`无法访问麦克风: ${(err as Error).message}`)
      setRecPhase('error')
    }
  }, [])

  const stopPetRecording = useCallback(() => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current)
      recTimerRef.current = null
    }
    if (recMediaRef.current?.state === 'recording') {
      recMediaRef.current.stop()
    }
  }, [])

  const handleViewRecResults = useCallback(() => {
    setRecPhase('idle')
    window.electronAPI?.openRecordingResults?.()
  }, [])

  const handleDismissRec = useCallback(() => {
    setRecPhase('idle')
    setRecError('')
  }, [])

  // --- Mode shortcut handlers ---
  const handleModeChange = useCallback((modeId: ShortcutModeId) => {
    setActiveModeId(modeId)
    if (modeConfig) {
      setModeConfig({ ...modeConfig, activeModeId: modeId })
    }
    window.electronAPI?.setActiveModeId?.(modeId)
  }, [modeConfig])

  const executeModeShortcut = useCallback((shortcut: ModeShortcut) => {
    switch (shortcut.actionType) {
      case 'toggleCommands':
        setCommandsOpen((v) => !v)
        break
      case 'toggleChat':
        window.electronAPI?.openChatWindow?.()
        break
      case 'openTodoWindow':
        window.electronAPI?.openTodoWindow?.()
        break
      case 'addTodo':
        window.electronAPI?.openTodoWindowNew?.()
        break
      case 'voiceTodo':
        window.electronAPI?.openTodoWindowVoice?.()
        break
      case 'openDiaryWindow':
        window.electronAPI?.openDiaryWindow?.()
        break
      case 'openStockWindow':
        window.electronAPI?.openStockWindow?.()
        break
      case 'openStickyNoteWindow':
        window.electronAPI?.openStickyNoteWindow?.()
        break
      case 'openSettingsWindow':
        window.electronAPI?.openSettingsWindow?.()
        break
      case 'openRecordingWindow':
        if (recPhase === 'recording') {
          stopPetRecording()
        } else {
          setRecPhase('idle')
          setRecError('')
          startPetRecording()
        }
        break
      case 'openRecordingPanel':
        window.electronAPI?.openRecordingWindow?.()
        break
      case 'executeCommand':
        if (typeof shortcut.actionPayload?.command === 'string') {
          window.electronAPI?.executeCommand?.(shortcut.actionPayload.command)
        }
        break
      case 'quit':
        window.electronAPI?.quit?.()
        break
    }
  }, [recPhase, startPetRecording, stopPetRecording])

  // --- Window drag logic ---
  const didDragRef = useRef(false)

  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return
    didDragRef.current = false
    window.electronAPI?.pauseWalk?.()
    const pos = await window.electronAPI?.getWindowPosition()
    if (!pos) return
    dragStartRef.current = {
      mouseX: e.screenX,
      mouseY: e.screenY,
      winX: pos.x,
      winY: pos.y,
    }
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return
      const dx = e.screenX - dragStartRef.current.mouseX
      const dy = e.screenY - dragStartRef.current.mouseY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        didDragRef.current = true
      }
      window.electronAPI?.setWindowPosition(
        dragStartRef.current.winX + dx,
        dragStartRef.current.winY + dy,
      )
    }

    const handleMouseUp = () => {
      if (!didDragRef.current) {
        window.electronAPI?.toggleWalk?.()
      }
      dragStartRef.current = null
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // --- File drop: eating animation ---
  const runEatingAnimation = useCallback(async (fileName: string) => {
    setIsEating(true)
    setSpeechBubble(`嚼嚼… ${fileName}`)

    // Gulp
    setEatScale(1.18)
    await sleep(200)
    setEatScale(1.0)
    await sleep(150)

    // Chewing: alternate actions
    for (let i = 0; i < 3; i++) {
      setPreviewAction(7) // think
      await sleep(125)
      setPreviewAction(3) // happy
      await sleep(125)
    }

    // Celebrate
    setPreviewAction(8)
    setSpeechBubble(null)
    await sleep(600)

    setPreviewAction(null)
    setIsEating(false)
  }, [])

  // --- File drop handlers ---
  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleFileDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (dragCounterRef.current === 1 && e.dataTransfer.types.includes('Files') && !isEating) {
      setIsFileDragOver(true)
      setPreviewAction(4) // alert - pet notices
      setSpeechBubble('嗯？给我吃的？')
    }
  }, [isEating])

  const handleFileDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsFileDragOver(false)
      if (!isEating) {
        setPreviewAction(null)
        setSpeechBubble(null)
      }
    }
  }, [isEating])

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsFileDragOver(false)

    if (isEating) return

    const files = e.dataTransfer.files
    if (!files.length) return

    const file = files[0]
    const filePath = window.electronAPI?.getFilePathForDrop(file)
    if (!filePath) return

    const fileInfo = await window.electronAPI?.readDroppedFile(filePath)
    if (!fileInfo) return

    // Play eating animation
    await runEatingAnimation(fileInfo.name)

    // Open independent chat window with message
    if (fileInfo.type === 'image' && fileInfo.base64) {
      window.electronAPI?.openChatWindowWithMessage({
        text: '这张图里是什么？请帮我看看',
        images: [fileInfo.base64],
      })
    } else {
      window.electronAPI?.openChatWindowWithMessage({
        text: `请帮我看看这个文件「${fileInfo.name}」是什么 / 主要内容是什么\n文件路径: ${fileInfo.path}`,
      })
    }
  }, [isEating, runEatingAnimation])

  // --- Mouse hover (pause walk + disable passthrough) ---
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleMouseEnter = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    setHovered(true)
    window.electronAPI?.setIgnoreMouse?.(false)
    window.electronAPI?.pauseWalk?.()
  }
  const handleMouseLeave = () => {
    if (!showSelector && !commandsOpen && !chatOpen && recPhase === 'idle' && !todoReminder) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(() => {
        setHovered(false)
        window.electronAPI?.setIgnoreMouse?.(true)
        window.electronAPI?.resumeWalk?.()
        hideTimerRef.current = null
      }, 300)
    }
  }

  // Panel visibility: keep hovered if any panel is open or recording
  const showUI = hovered || commandsOpen || chatOpen || showSelector || recPhase !== 'idle'

  return (
    <div
      className="app-root"
      onDragOver={handleFileDragOver}
      onDragEnter={handleFileDragEnter}
      onDragLeave={handleFileDragLeave}
      onDrop={handleFileDrop}
    >
      {/* Speech bubble */}
      {speechBubble && (
        <div className="speech-bubble">
          <span>{speechBubble}</span>
        </div>
      )}

      {/* Pet interaction zone — unified hover area */}
      <div
        className="pet-zone"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Recording indicator */}
        {recPhase !== 'idle' && (
          <RecordingIndicator
            phase={recPhase}
            recordingTime={recTime}
            errorMsg={recError}
            onStop={stopPetRecording}
            onViewResults={handleViewRecResults}
            onDismiss={handleDismissRec}
          />
        )}
        {/* Draggable pet area */}
        <div
          className={`drag-area${isFileDragOver ? ' file-drag-over' : ''}`}
          onMouseDown={handleMouseDown}
          style={{
            transform: `scale(${eatScale}) scaleX(${walkDirection === -1 ? -1 : 1})`,
            transition: 'transform 0.15s ease',
          }}
        >
          <PetSprite pet={selectedPet} action={currentAction} />
        </div>

        {/* Status bar */}
        <StatusBar
          claudeState={claudeState}
          activeApp={activeApp}
          onMouseEnter={() => setQuotaVisible(true)}
          onMouseLeave={() => setQuotaVisible(false)}
        />

        {/* Quota cards (hover on status) */}
        <QuotaCards quotas={quotas} visible={quotaVisible} />

        {/* Mode Shortcut Toolbar (hover) */}
        {showUI && modeConfig && (
          <ModeShortcutToolbar
            config={modeConfig}
            activeModeId={activeModeId}
            onModeChange={handleModeChange}
            onShortcutClick={executeModeShortcut}
          />
        )}
      </div>

      {/* Expandable panels */}
      <CommandPanel visible={commandsOpen} />
      <ChatPanel ref={chatPanelRef} visible={chatOpen} />
      {/* Approval overlay */}
      <ApprovalPrompt prompt={approval} onResolve={handleResolveApproval} />

      {/* Todo reminder */}
      <TodoReminder
        item={todoReminder}
        onDismiss={handleDismissReminder}
        onOpen={handleOpenReminder}
        onSnooze={handleSnoozeReminder}
      />

      {/* Pet selector overlay */}
      {showSelector && (
        <PetSelector
          pets={pets}
          selectedPetId={selectedPet?.id || ''}
          onSelect={handlePetSelect}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  )
}

export default function App() {
  const [route, setRoute] = useState(window.location.hash)

  useEffect(() => {
    const handleHash = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  if (route === '#/settings') return <SettingsWindow />
  if (route === '#/todo') return <TodoWindow />
  if (route === '#/diary') return <DiaryWindow />
  if (route === '#/stock') return <StockWindow />
  if (route === '#/chat') return <ChatWindow />
  if (route === '#/recording') return <RecordingWindow />
  if (route === '#/sticky') return <StickyNoteWindow />

  return <PetWindow />
}

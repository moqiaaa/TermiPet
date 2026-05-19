import { useState, useEffect, useRef, useCallback } from 'react'
import { PetSprite } from './components/PetSprite'
import { PetSelector } from './components/PetSelector'
import { StatusBar } from './components/StatusBar'
import { ActionBar } from './components/ActionBar'
import { Toolbar } from './components/Toolbar'
import { CommandPanel } from './components/CommandPanel'
import { ChatPanel } from './components/ChatPanel'
import { ApprovalPrompt } from './components/ApprovalPrompt'
import { PomodoroDisplay } from './components/PomodoroDisplay'
import { QuotaCards } from './components/QuotaCard'
import { SettingsWindow } from './components/SettingsWindow'
import type {
  PetMetadata,
  ClaudeState,
  ApprovalPrompt as ApprovalPromptType,
  PomodoroState,
  UsageQuota,
  AgentState,
} from './types/pet'
import './App.css'

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
  const [pomodoroVisible, setPomodoroVisible] = useState(false)
  const [quotaVisible, setQuotaVisible] = useState(false)

  // --- Claude state ---
  const [claudeState, setClaudeState] = useState<ClaudeState | null>(null)
  const [approval, setApproval] = useState<ApprovalPromptType | null>(null)
  const [activeApp, setActiveApp] = useState('')

  // --- Pet action ---
  const [autoAction, setAutoAction] = useState(0)
  const [previewAction, setPreviewAction] = useState<number | null>(null)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Pomodoro ---
  const [pomodoroState, setPomodoroState] = useState<PomodoroState>({
    phase: 'idle',
    remaining: 0,
    isRunning: false,
  })

  // --- Quotas ---
  const [quotas, setQuotas] = useState<UsageQuota[]>([])

  // --- Drag ---
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{
    mouseX: number
    mouseY: number
    winX: number
    winY: number
  } | null>(null)

  // Current displayed action: preview overrides auto
  const currentAction = previewAction !== null ? previewAction : autoAction

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

    // Active app
    const cleanupApp = api.onActiveAppChanged?.((app: unknown) => {
      if (typeof app === 'string') {
        setActiveApp(app)
      } else if (app && typeof app === 'object' && 'processName' in app) {
        const a = app as { processName: string; windowTitle?: string }
        setActiveApp(a.windowTitle || a.processName)
      }
    })

    // Pomodoro ticks
    const cleanupPomodoro = api.onPomodoroTick?.((state) => {
      setPomodoroState(state)
    })

    return () => {
      cleanupPet()
      cleanupClaude?.()
      cleanupApproval?.()
      cleanupApp?.()
      cleanupPomodoro?.()
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

  // --- Drag logic ---
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return
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
      window.electronAPI?.setWindowPosition(
        dragStartRef.current.winX + dx,
        dragStartRef.current.winY + dy,
      )
    }

    const handleMouseUp = () => {
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

  // --- Mouse hover ---
  const handleMouseEnter = () => setHovered(true)
  const handleMouseLeave = () => {
    if (!showSelector && !commandsOpen && !chatOpen) {
      setHovered(false)
    }
  }

  // Panel visibility: keep hovered if any panel is open
  const showUI = hovered || commandsOpen || chatOpen || showSelector

  return (
    <div
      className="app-root"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Draggable pet area */}
      <div className="drag-area" onMouseDown={handleMouseDown}>
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

      {/* Action bar (hover) */}
      {showUI && (
        <ActionBar
          currentAction={currentAction}
          onPreviewAction={handlePreviewAction}
        />
      )}

      {/* Toolbar (hover) */}
      {showUI && (
        <Toolbar
          onToggleCommands={() => setCommandsOpen((v) => !v)}
          onToggleChat={() => setChatOpen((v) => !v)}
          onTogglePomodoro={() => setPomodoroVisible((v) => !v)}
          commandsOpen={commandsOpen}
          chatOpen={chatOpen}
          pomodoroOpen={pomodoroVisible}
        />
      )}

      {/* Expandable panels */}
      <CommandPanel visible={commandsOpen} />
      <ChatPanel visible={chatOpen} />
      <PomodoroDisplay state={pomodoroState} visible={pomodoroVisible} />

      {/* Approval overlay */}
      <ApprovalPrompt prompt={approval} onResolve={handleResolveApproval} />

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

  if (route === '#/settings') {
    return <SettingsWindow />
  }

  return <PetWindow />
}

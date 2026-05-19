export interface PetMetadata {
  id: string
  displayName: string
  description: string
  spritesheetPath: string
  folderName: string
  folderPath: string
}

export interface SpritesheetGrid {
  actionCount: number
  framesPerAction: number
  validFramesByAction: Record<number, number>
  frameWidth: number
  frameHeight: number
}

export const PET_ACTIONS = [
  'idle',
  'run',
  'move',
  'happy',
  'alert',
  'error',
  'sleep',
  'think',
  'celebrate',
] as const

export type PetAction = (typeof PET_ACTIONS)[number]

export const ACTION_EMOJIS: Record<PetAction, string> = {
  idle: '😊',
  run: '🏃',
  move: '🚶',
  happy: '😄',
  alert: '⚠️',
  error: '❌',
  sleep: '😴',
  think: '🤔',
  celebrate: '🎉',
}

export function inferSpritesheetGrid(
  pixelWidth: number,
  pixelHeight: number,
): SpritesheetGrid {
  const actionCount = 9
  const frameHeight = Math.max(1, Math.floor(pixelHeight / actionCount))
  const preferredFrameCounts = [8, 6, 4, 12, 3, 2, 1]
  const framesPerAction =
    preferredFrameCounts.find((n) => pixelWidth % n === 0) ||
    Math.max(1, Math.floor(pixelWidth / frameHeight))
  const frameWidth = Math.max(1, Math.floor(pixelWidth / framesPerAction))

  return {
    actionCount,
    framesPerAction,
    validFramesByAction: {
      0: 6,
      1: 8,
      2: 8,
      3: 4,
      4: 5,
      5: 8,
      6: 6,
      7: 6,
      8: 6,
    },
    frameWidth,
    frameHeight,
  }
}

export function getValidFrameCount(
  grid: SpritesheetGrid,
  action: number,
): number {
  return grid.validFramesByAction[action] ?? grid.framesPerAction
}

// --- New types for the full app ---

export type AgentState = 'idle' | 'working' | 'waiting' | 'compacting' | 'stopped' | 'error'
export type PomodoroPhase = 'idle' | 'work' | 'break'

export interface ClaudeState {
  state: AgentState
  summary: string
  sessionId?: string
  cwd?: string
}

export interface ApprovalPrompt {
  id: string
  title: string
  summary: string
  detail?: string
  toolName?: string
}

export interface Command {
  id: string
  name: string
  command: string
  description?: string
  pinned: boolean
  isCustom: boolean
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface PomodoroState {
  phase: PomodoroPhase
  remaining: number
  isRunning: boolean
}

export interface UsageQuota {
  name: string
  used: number
  limit: number
  resetAt?: string
  percentage: number
}

export interface Settings {
  language: string
  skin: string
  petName: string
  ownerName: string
  personality: string
  customPrompt: string
  chatProvider: string
  ollamaModel: string
  apiKeys: Record<string, string>
}

export interface ElectronAPI {
  // Pet management
  getPets: () => Promise<PetMetadata[]>
  getSelectedPet: () => Promise<string>
  setSelectedPet: (petId: string) => Promise<boolean>
  getSpritesheetBase64: (folderPath: string, filename: string) => Promise<string | null>

  // Window
  setWindowPosition: (x: number, y: number) => Promise<void>
  getWindowPosition: () => Promise<{ x: number; y: number }>

  // Claude hooks
  installClaudeHooks: () => Promise<void>
  uninstallClaudeHooks: () => Promise<void>
  isClaudeHooksInstalled: () => Promise<boolean>

  // Approval
  resolveApproval: (id: string, decision: 'allow' | 'deny') => Promise<void>
  onClaudeStateChanged: (callback: (state: ClaudeState) => void) => () => void
  onApprovalPrompt: (callback: (prompt: ApprovalPrompt) => void) => () => void

  // Commands
  getCommands: () => Promise<Command[]>
  saveCommands: (cmds: Command[]) => Promise<void>
  executeCommand: (text: string) => Promise<void>

  // Chat
  sendChatMessage: (msg: string, config?: Record<string, unknown>) => Promise<void>
  cancelChat: () => Promise<void>
  getChatHistory: () => Promise<ChatMessage[]>
  clearChatHistory: () => Promise<void>
  onChatChunk: (callback: (chunk: string) => void) => () => void
  onChatComplete: (callback: (message: ChatMessage) => void) => () => void
  onChatError: (callback: (error: string) => void) => () => void

  // Settings
  getSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<void>

  // Active app
  onActiveAppChanged: (callback: (appName: string) => void) => () => void

  // Usage
  getUsageQuotas: () => Promise<UsageQuota[]>

  // Pomodoro
  startPomodoro: () => Promise<void>
  pausePomodoro: () => Promise<void>
  resetPomodoro: () => Promise<void>
  onPomodoroTick: (callback: (state: PomodoroState) => void) => () => void

  // Misc
  onPetChanged: (callback: (petId: string) => void) => () => void
  openSettingsWindow: () => Promise<void>
  quit: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

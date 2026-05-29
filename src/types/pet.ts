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

// Todo & Project
export interface Todo {
  id: string
  title: string
  done: boolean
  projectId: string
  createdAt: number
  dueDate?: string
  reminderAt?: string
  note?: string
  notified?: boolean
  priority?: 'low' | 'medium' | 'high'
  status?: 'backlog' | 'in_progress' | 'waiting' | 'done'
  repeatRule?: 'none' | 'daily' | 'weekly' | 'monthly'
  estimatedMinutes?: number
  completedAt?: number
  updatedAt?: number
  subtasks?: TodoSubtask[]
  tags?: string[]
}

export interface TodoSubtask {
  id: string
  title: string
  done: boolean
}

export interface Project {
  id: string
  name: string
  color: string
  parentId?: string
  createdAt: number
}

// Diary
export interface DiaryCategory {
  id: number
  parent_id: number | null
  name: string
  description: string | null
  sort_order: number
}

export interface Diary {
  id: number
  category_id: number | null
  title: string
  content: string
  diary_date: string | null
  tags: string | null
  created_at: string
  updated_at: string
  category_name: string | null
}

// Stock
export interface StockTrade {
  id: number
  trade_date: string | null
  stock_code: string
  stock_name: string
  direction: number
  price: number
  quantity: number
  amount: number | null
  reason: string | null
  review: string | null
  correct: number | null
  created_at: string
  updated_at: string
}

export interface StockPosition {
  id: number
  stock_code: string
  stock_name: string
  quantity: number
  cost_price: number
  notes: string | null
  buy_point: string | null
  sell_point: string | null
  created_at: string
  updated_at: string
}

export interface StockIndicator {
  id: number
  stock_code: string
  name: string
  value: string | null
  remark: string | null
  created_at: string
  updated_at: string
}

export interface StockStrategy {
  id: number
  name: string
  description: string | null
  direction: number
  conditions: StockStrategyCondition[]
  bindingCount?: number
  bindings?: StockStrategyBinding[]
  created_at: string
  updated_at: string
}

export interface StockStrategyCondition {
  id: number
  strategy_id: number
  indicator_name: string
  operator: string
  threshold: string
  created_at: string
}

export interface StockStrategyBinding {
  id: number
  strategy_id: number
  stock_code: string
  stock_name: string
  enabled: number
  strategy_name?: string
  strategy_direction?: number
  created_at: string
}

export interface StockIndicatorDef {
  id: number
  name: string
  scope: 'stock' | 'market'
  value_type: 'number' | 'text'
  description: string | null
  created_at: string
  updated_at: string
}

export interface DroppedFile {
  type: 'image' | 'document'
  name: string
  path: string
  base64?: string
}

export interface ChatMessagePayload {
  text: string
  images?: string[]
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

  // Window
  setWindowSize: (w: number, h: number, animate?: boolean) => Promise<void>
  setIgnoreMouse: (ignore: boolean) => Promise<void>

  // Walking
  toggleWalk: () => Promise<string>
  pauseWalk: () => Promise<void>
  resumeWalk: () => Promise<void>
  getWalkState: () => Promise<{ phase: string; direction: number }>
  onWalkStateChanged: (callback: (state: { phase: string; direction: number }) => void) => () => void

  // File drop
  getFilePathForDrop: (file: File) => string
  readDroppedFile: (filePath: string) => Promise<DroppedFile | null>

  // Commands
  getCommands: () => Promise<Command[]>
  saveCommands: (cmds: Command[]) => Promise<void>
  saveCommand: (cmd: Command) => Promise<void>
  deleteCommand: (id: string) => Promise<void>
  executeCommand: (text: string) => Promise<void>

  // Chat
  sendChatMessage: (msg: string | ChatMessagePayload, config?: Record<string, unknown>) => Promise<void>
  cancelChat: () => Promise<void>
  getChatHistory: () => Promise<ChatMessage[]>
  clearChatHistory: () => Promise<void>
  onChatChunk: (callback: (chunk: string) => void) => () => void
  onChatComplete: (callback: (message: ChatMessage) => void) => () => void
  onChatError: (callback: (error: string) => void) => () => void

  // Settings
  getSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<void>
  testApiKey: (provider: string, key: string, endpoint: string) => Promise<{ success: boolean; error?: string }>

  // Active app
  onActiveAppChanged: (callback: (appName: string) => void) => () => void

  // Usage
  getUsageQuotas: () => Promise<UsageQuota[]>

  // Todo
  getTodos: () => Promise<Todo[]>
  saveTodo: (todo: Todo) => Promise<Todo[] | null>
  deleteTodo: (id: string) => Promise<Todo[] | null>
  getProjects: () => Promise<Project[]>
  saveProject: (project: Project) => Promise<Project[] | null>
  deleteProject: (id: string) => Promise<{ projects: Project[]; todos: Todo[] } | null>

  // Diary
  getDiaryCategories: () => Promise<DiaryCategory[]>
  getDiaries: (params: { categoryId?: number; keyword?: string; limit?: number; offset?: number }) => Promise<Diary[]>
  getDiaryById: (id: number) => Promise<Diary | null>
  getDiaryCount: (categoryId?: number) => Promise<number>
  saveDiary: (diary: Partial<Diary>) => Promise<Diary | null>
  deleteDiary: (id: number) => Promise<boolean>

  // Stock
  getTrades: (params: { direction?: number; keyword?: string; dateRange?: string; limit?: number; offset?: number }) => Promise<StockTrade[]>
  getTradeById: (id: number) => Promise<StockTrade | null>
  getTradeCount: (params: { direction?: number; dateRange?: string }) => Promise<number>
  saveTrade: (trade: Partial<StockTrade>) => Promise<StockTrade | null>
  deleteTrade: (id: number) => Promise<boolean>
  getPositions: (keyword?: string) => Promise<StockPosition[]>
  getPositionById: (id: number) => Promise<StockPosition | null>
  savePosition: (pos: Partial<StockPosition>) => Promise<StockPosition | null>
  deletePosition: (id: number) => Promise<boolean>
  getIndicators: (stockCode: string) => Promise<StockIndicator[]>
  saveIndicator: (ind: Partial<StockIndicator>) => Promise<StockIndicator | null>
  deleteIndicator: (id: number) => Promise<boolean>
  ocrTrade: (imageBase64: string) => Promise<{ data?: Record<string, unknown>; error?: string }>
  captureScreen: () => Promise<{ data?: string; cancelled?: boolean; error?: string }>
  // Stock Strategy
  getStrategies: () => Promise<StockStrategy[]>
  getStrategyById: (id: number) => Promise<StockStrategy | null>
  saveStrategy: (s: Partial<StockStrategy>) => Promise<StockStrategy | null>
  deleteStrategy: (id: number) => Promise<boolean>
  saveCondition: (c: Partial<StockStrategyCondition>) => Promise<StockStrategyCondition | null>
  deleteCondition: (id: number) => Promise<boolean>
  saveBinding: (b: { strategy_id: number; stock_code: string; stock_name: string }) => Promise<StockStrategyBinding | null>
  getBindingsByStock: (stockCode: string) => Promise<StockStrategyBinding[]>
  toggleBinding: (id: number, enabled: boolean) => Promise<boolean>
  deleteBinding: (id: number) => Promise<boolean>

  // Todo reminder
  onTodoReminder: (callback: (todo: Todo) => void) => () => void
  dismissTodoReminder: (id: string) => Promise<boolean>
  snoozeTodoReminder: (id: string, minutes: number) => Promise<boolean>

  // Speech / Recording
  transcribeAudio: (audioBase64: string) => Promise<{ text?: string; error?: string }>
  summarizeTranscript: (transcript: string, prompt: string) => Promise<{ text?: string; error?: string }>

  // Scenes
  getScenes: () => Promise<{ scenes: Scene[]; defaultSceneId: string }>
  saveScenes: (scenes: Scene[], defaultSceneId: string) => Promise<boolean>
  saveScene: (scene: Scene) => Promise<void>
  deleteScene: (id: string) => Promise<void>
  setDefaultScene: (sceneId: string) => Promise<void>

  // Sub windows
  openTodoWindow: () => Promise<void>
  openTodoWindowNew: () => Promise<void>
  openTodoWindowVoice: () => Promise<void>
  onStartNewTodo: (callback: () => void) => () => void
  onStartVoiceTodo: (callback: () => void) => () => void
  openDiaryWindow: () => Promise<void>
  openStockWindow: () => Promise<void>
  openRecordingWindow: () => Promise<void>
  processPetRecording: (audioBase64: string, duration: number) => Promise<{ success?: boolean; error?: string }>
  getRecordingResults: () => Promise<RecordingResults | null>
  openRecordingResults: () => Promise<void>
  getRecordings: (limit?: number, offset?: number) => Promise<RecordingHistoryItem[]>
  getRecordingById: (id: number) => Promise<RecordingHistoryItem | null>
  deleteRecording: (id: number) => Promise<boolean>
  getRecordingAudio: (audioPath: string) => Promise<string | null>
  onRecordingProgress: (callback: (phase: string) => void) => () => void
  openChatWindow: () => Promise<void>
  openChatWindowWithMessage: (payload: ChatMessagePayload) => Promise<void>
  getPendingChatMessage: () => Promise<ChatMessagePayload | null>

  // Store (generic)
  storeGet: (key: string) => Promise<unknown>
  storeSet: (key: string, value: unknown) => Promise<boolean>

  // Mode Shortcut
  getModeShortcutConfig: () => Promise<ModeShortcutConfig>
  saveModeShortcutConfig: (config: ModeShortcutConfig) => Promise<ModeShortcutConfig>
  saveShortcutMode: (mode: ShortcutMode) => Promise<void>
  saveShortcutItem: (item: ModeShortcut) => Promise<void>
  deleteShortcutItem: (id: string) => Promise<void>
  setActiveModeId: (modeId: string) => Promise<void>

  // Sticky Notes
  getStickyNotes: () => Promise<StickyNote[]>
  saveStickyNote: (note: StickyNote) => Promise<StickyNote[] | null>
  deleteStickyNote: (id: string) => Promise<StickyNote[] | null>
  openStickyNoteWindow: () => Promise<void>
  saveStickyImage: (noteId: string, dataUrl: string) => Promise<string | null>
  getStickyImage: (imagePath: string) => Promise<string | null>
  deleteStickyImage: (imagePath: string) => Promise<boolean>
  previewStickyImage: (imagePath: string) => Promise<boolean>

  // Misc
  onPetChanged: (callback: (petId: string) => void) => () => void
  openSettingsWindow: () => Promise<void>
  quit: () => Promise<void>
}

// --- Sticky Note ---

export type StickyNoteColor = 'default' | 'yellow' | 'blue' | 'green' | 'purple'

export type StickyNoteBlock =
  | { type: 'text'; content: string }
  | { type: 'image'; path: string }

export interface StickyNote {
  id: string
  title: string
  content: string           // keep for backward compat (plain text fallback)
  blocks: StickyNoteBlock[] // new: block-based content
  color: StickyNoteColor
  pinned: boolean
  createdAt: number
  updatedAt?: number
}

// --- Recording / Scene ---

export interface Scene {
  id: string
  name: string
  summaryPrompt: string
  todoPrompt: string
}

export interface TranscriptEntry {
  speaker: number
  startTime: number
  text: string
}

export interface RecordingResult {
  transcript: TranscriptEntry[]
  keywords: string[]
  audioBase64: string
  audioDuration: number
  sceneId: string
}

export interface RecordingResults {
  id?: number
  rawText: string
  summary: string
  todoSummary: string
  sceneName: string
  audioPath?: string
  duration?: number
}

export interface RecordingHistoryItem {
  id: number
  sceneName: string
  rawText: string
  summary: string
  todoSummary: string
  audioPath: string
  duration: number
  createdAt: number
}

// --- Mode Shortcut Toolbar ---

export type ShortcutModeId =
  | 'assistant'
  | 'todo'
  | 'stock'
  | 'diary'
  | 'commands'
  | string

export interface ShortcutMode {
  id: ShortcutModeId
  name: string
  icon?: string
  color?: string
  order: number
  enabled: boolean
}

export type ShortcutActionType =
  | 'toggleCommands'
  | 'toggleChat'
  | 'openTodoWindow'
  | 'addTodo'
  | 'voiceTodo'
  | 'openDiaryWindow'
  | 'openStockWindow'
  | 'openSettingsWindow'
  | 'openRecordingWindow'
  | 'openRecordingPanel'
  | 'openStickyNoteWindow'
  | 'executeCommand'
  | 'quit'

export interface ModeShortcut {
  id: string
  modeId: ShortcutModeId
  label: string
  icon?: string
  actionType: ShortcutActionType
  actionPayload?: Record<string, unknown>
  order: number
  enabled: boolean
}

export interface ModeShortcutConfig {
  activeModeId: ShortcutModeId
  modes: ShortcutMode[]
  shortcuts: ModeShortcut[]
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

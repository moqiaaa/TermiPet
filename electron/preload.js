const { contextBridge, ipcRenderer, webUtils } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Pet
  getPets: () => ipcRenderer.invoke('get-pets'),
  getSelectedPet: () => ipcRenderer.invoke('get-selected-pet'),
  setSelectedPet: (petId) => ipcRenderer.invoke('set-selected-pet', petId),
  getSpritesheetBase64: (folderPath, filename) =>
    ipcRenderer.invoke('get-spritesheet-base64', folderPath, filename),

  // Window
  setWindowPosition: (x, y) => ipcRenderer.invoke('set-window-position', x, y),
  getWindowPosition: () => ipcRenderer.invoke('get-window-position'),

  // Claude Hook
  installClaudeHooks: () => ipcRenderer.invoke('install-claude-hooks'),
  uninstallClaudeHooks: () => ipcRenderer.invoke('uninstall-claude-hooks'),
  isClaudeHooksInstalled: () => ipcRenderer.invoke('is-claude-hooks-installed'),
  resolveApproval: (id, decision) => ipcRenderer.invoke('resolve-approval', id, decision),
  onClaudeStateChanged: (cb) => {
    const handler = (_e, state) => cb(state)
    ipcRenderer.on('claude-state-changed', handler)
    return () => ipcRenderer.removeListener('claude-state-changed', handler)
  },
  onApprovalPrompt: (cb) => {
    const handler = (_e, prompt) => cb(prompt)
    ipcRenderer.on('approval-prompt', handler)
    return () => ipcRenderer.removeListener('approval-prompt', handler)
  },

  // Commands
  getCommands: () => ipcRenderer.invoke('get-commands'),
  saveCommands: (commands) => ipcRenderer.invoke('save-commands', commands),
  executeCommand: (text) => ipcRenderer.invoke('execute-command', text),

  // Window
  setWindowSize: (w, h, animate) => ipcRenderer.invoke('set-window-size', w, h, animate),
  setIgnoreMouse: (ignore) => ipcRenderer.invoke('set-ignore-mouse', ignore),

  // Walking
  toggleWalk: () => ipcRenderer.invoke('toggle-walk'),
  pauseWalk: () => ipcRenderer.invoke('pause-walk'),
  resumeWalk: () => ipcRenderer.invoke('resume-walk'),
  getWalkState: () => ipcRenderer.invoke('get-walk-state'),
  onWalkStateChanged: (cb) => {
    const handler = (_e, state) => cb(state)
    ipcRenderer.on('walk-state-changed', handler)
    return () => ipcRenderer.removeListener('walk-state-changed', handler)
  },

  // File drop
  getFilePathForDrop: (file) => webUtils.getPathForFile(file),
  readDroppedFile: (filePath) => ipcRenderer.invoke('read-dropped-file', filePath),

  // Chat
  sendChatMessage: (message, config) => ipcRenderer.invoke('send-chat-message', message, config),
  cancelChat: () => ipcRenderer.invoke('cancel-chat'),
  getChatHistory: () => ipcRenderer.invoke('get-chat-history'),
  clearChatHistory: () => ipcRenderer.invoke('clear-chat-history'),
  onChatChunk: (cb) => {
    const handler = (_e, chunk) => cb(chunk)
    ipcRenderer.on('chat-chunk', handler)
    return () => ipcRenderer.removeListener('chat-chunk', handler)
  },
  onChatComplete: (cb) => {
    const handler = (_e, msg) => cb(msg)
    ipcRenderer.on('chat-complete', handler)
    return () => ipcRenderer.removeListener('chat-complete', handler)
  },
  onChatError: (cb) => {
    const handler = (_e, err) => cb(err)
    ipcRenderer.on('chat-error', handler)
    return () => ipcRenderer.removeListener('chat-error', handler)
  },

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  testOllamaConnection: () => ipcRenderer.invoke('test-ollama-connection'),
  testApiKey: (provider, key, endpoint) => ipcRenderer.invoke('test-api-key', provider, key, endpoint),

  // Process Monitor
  onActiveAppChanged: (cb) => {
    const handler = (_e, app) => cb(app)
    ipcRenderer.on('active-app-changed', handler)
    return () => ipcRenderer.removeListener('active-app-changed', handler)
  },

  // Quota
  getUsageQuotas: () => ipcRenderer.invoke('get-usage-quotas'),

  // Todo
  getTodos: () => ipcRenderer.invoke('get-todos'),
  saveTodo: (todo) => ipcRenderer.invoke('save-todo', todo),
  deleteTodo: (id) => ipcRenderer.invoke('delete-todo', id),
  getProjects: () => ipcRenderer.invoke('get-projects'),
  saveProject: (project) => ipcRenderer.invoke('save-project', project),
  deleteProject: (id) => ipcRenderer.invoke('delete-project', id),

  // Diary
  getDiaryCategories: () => ipcRenderer.invoke('get-diary-categories'),
  getDiaries: (params) => ipcRenderer.invoke('get-diaries', params),
  getDiaryById: (id) => ipcRenderer.invoke('get-diary-by-id', id),
  getDiaryCount: (categoryId) => ipcRenderer.invoke('get-diary-count', categoryId),
  saveDiary: (diary) => ipcRenderer.invoke('save-diary', diary),
  deleteDiary: (id) => ipcRenderer.invoke('delete-diary', id),

  // Stock
  getTrades: (params) => ipcRenderer.invoke('get-trades', params),
  getTradeById: (id) => ipcRenderer.invoke('get-trade-by-id', id),
  getTradeCount: (params) => ipcRenderer.invoke('get-trade-count', params),
  saveTrade: (trade) => ipcRenderer.invoke('save-trade', trade),
  deleteTrade: (id) => ipcRenderer.invoke('delete-trade', id),
  getPositions: (keyword) => ipcRenderer.invoke('get-positions', keyword),
  getPositionById: (id) => ipcRenderer.invoke('get-position-by-id', id),
  savePosition: (pos) => ipcRenderer.invoke('save-position', pos),
  deletePosition: (id) => ipcRenderer.invoke('delete-position', id),
  getIndicators: (stockCode) => ipcRenderer.invoke('get-indicators', stockCode),
  saveIndicator: (ind) => ipcRenderer.invoke('save-indicator', ind),
  deleteIndicator: (id) => ipcRenderer.invoke('delete-indicator', id),
  ocrTrade: (imageBase64) => ipcRenderer.invoke('ocr-trade', imageBase64),
  captureScreen: () => ipcRenderer.invoke('capture-screen'),

  // Todo reminder
  onTodoReminder: (cb) => {
    const handler = (_e, todo) => cb(todo)
    ipcRenderer.on('todo-reminder', handler)
    return () => ipcRenderer.removeListener('todo-reminder', handler)
  },
  dismissTodoReminder: (id) => ipcRenderer.invoke('dismiss-todo-reminder', id),
  snoozeTodoReminder: (id, minutes) => ipcRenderer.invoke('snooze-todo-reminder', id, minutes),

  // Speech / Recording
  transcribeAudio: (audioBase64) => ipcRenderer.invoke('transcribe-audio', audioBase64),
  summarizeTranscript: (transcript, prompt) => ipcRenderer.invoke('summarize-transcript', transcript, prompt),
  getScenes: () => ipcRenderer.invoke('get-scenes'),
  saveScenes: (scenes, defaultSceneId) => ipcRenderer.invoke('save-scenes', scenes, defaultSceneId),

  // Mode Shortcut Config
  getModeShortcutConfig: () => ipcRenderer.invoke('get-mode-shortcut-config'),
  saveModeShortcutConfig: (config) => ipcRenderer.invoke('save-mode-shortcut-config', config),

  // Sub windows
  openTodoWindow: () => ipcRenderer.invoke('open-todo-window'),
  openTodoWindowNew: () => ipcRenderer.invoke('open-todo-window-new'),
  openTodoWindowVoice: () => ipcRenderer.invoke('open-todo-window-voice'),
  onStartNewTodo: (cb) => {
    const handler = () => cb()
    ipcRenderer.on('start-new-todo', handler)
    return () => ipcRenderer.removeListener('start-new-todo', handler)
  },
  onStartVoiceTodo: (cb) => {
    const handler = () => cb()
    ipcRenderer.on('start-voice-todo', handler)
    return () => ipcRenderer.removeListener('start-voice-todo', handler)
  },
  openDiaryWindow: () => ipcRenderer.invoke('open-diary-window'),
  openStockWindow: () => ipcRenderer.invoke('open-stock-window'),
  openRecordingWindow: () => ipcRenderer.invoke('open-recording-window'),
  processPetRecording: (audioBase64, duration) => ipcRenderer.invoke('process-pet-recording', audioBase64, duration),
  getRecordingResults: () => ipcRenderer.invoke('get-recording-results'),
  openRecordingResults: () => ipcRenderer.invoke('open-recording-results'),
  getRecordings: (limit, offset) => ipcRenderer.invoke('get-recordings', limit, offset),
  getRecordingById: (id) => ipcRenderer.invoke('get-recording-by-id', id),
  deleteRecording: (id) => ipcRenderer.invoke('delete-recording', id),
  getRecordingAudio: (audioPath) => ipcRenderer.invoke('get-recording-audio', audioPath),
  onRecordingProgress: (cb) => {
    const handler = (_event, phase) => cb(phase)
    ipcRenderer.on('recording-progress', handler)
    return () => ipcRenderer.removeListener('recording-progress', handler)
  },
  openChatWindow: () => ipcRenderer.invoke('open-chat-window'),
  openChatWindowWithMessage: (payload) => ipcRenderer.invoke('open-chat-window-with-message', payload),
  getPendingChatMessage: () => ipcRenderer.invoke('get-pending-chat-message'),

  // Store (generic)
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),

  // General
  onPetChanged: (cb) => {
    const handler = (_e, petId) => cb(petId)
    ipcRenderer.on('pet-changed', handler)
    return () => ipcRenderer.removeListener('pet-changed', handler)
  },
  openSettingsWindow: () => ipcRenderer.invoke('open-settings-window'),
  quit: () => ipcRenderer.invoke('quit-app'),
})

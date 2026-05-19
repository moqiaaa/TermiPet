const { contextBridge, ipcRenderer } = require('electron')

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
    const handler = () => cb()
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

  // Pomodoro
  startPomodoro: () => ipcRenderer.invoke('pomodoro-start'),
  pausePomodoro: () => ipcRenderer.invoke('pomodoro-pause'),
  resetPomodoro: () => ipcRenderer.invoke('pomodoro-reset'),
  onPomodoroTick: (cb) => {
    const handler = (_e, state) => cb(state)
    ipcRenderer.on('pomodoro-tick', handler)
    return () => ipcRenderer.removeListener('pomodoro-tick', handler)
  },

  // General
  onPetChanged: (cb) => {
    const handler = (_e, petId) => cb(petId)
    ipcRenderer.on('pet-changed', handler)
    return () => ipcRenderer.removeListener('pet-changed', handler)
  },
  openSettingsWindow: () => ipcRenderer.invoke('open-settings-window'),
  quit: () => ipcRenderer.invoke('quit-app'),
})

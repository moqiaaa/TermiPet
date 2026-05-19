const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, clipboard } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')
const https = require('https')
const { execFile } = require('child_process')
const os = require('os')

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------
app.commandLine.appendSwitch('no-sandbox')

const isDev = !app.isPackaged

let mainWindow = null
let settingsWindow = null
let tray = null

// Chat state
let chatHistory = []
let currentChatAbortController = null

// Process monitor
let processMonitorTimer = null
let lastActiveApp = null

// Claude hook (loaded lazily after app ready)
let claudeHook = null

// qimo modules (loaded lazily after app ready)
let store = null
let todoLogic = null
let diaryLogic = null
let stockLogic = null
let db = null

// Sub-windows
let todoWindow = null
let diaryWindow = null
let stockWindow = null

// ---------------------------------------------------------------------------
// Utility: paths
// ---------------------------------------------------------------------------
function getPetsDir() {
  if (isDev) {
    return path.join(__dirname, '..', 'Pets')
  }
  return path.join(process.resourcesPath, 'Pets')
}

function getUserDataPath(filename) {
  const dir = path.join(app.getPath('userData'), 'TermiPet')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return path.join(dir, filename)
}

// ---------------------------------------------------------------------------
// Utility: JSON file I/O with safe defaults
// ---------------------------------------------------------------------------
function readJSON(filepath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8')
}

// ---------------------------------------------------------------------------
// Utility: HTTP request helper (returns Promise)
// ---------------------------------------------------------------------------
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const mod = parsed.protocol === 'https:' ? https : http
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }

    const req = mod.request(reqOptions, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8')
        resolve({ status: res.statusCode, headers: res.headers, body })
      })
    })

    req.on('error', reject)

    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        req.destroy()
        reject(new Error('Request aborted'))
      })
    }

    if (options.body) {
      req.write(options.body)
    }
    req.end()
  })
}

// ---------------------------------------------------------------------------
// Utility: streaming HTTP request (calls onData for each chunk)
// ---------------------------------------------------------------------------
function httpStream(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const mod = parsed.protocol === 'https:' ? https : http
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'POST',
      headers: options.headers || {},
    }

    const req = mod.request(reqOptions, (res) => {
      if (res.statusCode >= 400) {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          reject(new Error(`HTTP ${res.statusCode}: ${Buffer.concat(chunks).toString('utf8')}`))
        })
        return
      }

      res.on('data', (chunk) => {
        if (options.onData) options.onData(chunk.toString('utf8'))
      })
      res.on('end', () => resolve())
      res.on('error', reject)
    })

    req.on('error', reject)

    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        req.destroy()
        reject(new Error('Request aborted'))
      })
    }

    if (options.body) {
      req.write(options.body)
    }
    req.end()
  })
}

// ---------------------------------------------------------------------------
// Pet management
// ---------------------------------------------------------------------------
function loadSelectedPet() {
  const data = readJSON(getUserDataPath('selected-pet.json'), {})
  return data.selectedPetId || 'mochi'
}

function saveSelectedPet(petId) {
  writeJSON(getUserDataPath('selected-pet.json'), { selectedPetId: petId })
}

function loadPets() {
  const petsDir = getPetsDir()
  if (!fs.existsSync(petsDir)) return []

  try {
    const dirs = fs.readdirSync(petsDir, { withFileTypes: true })
    return dirs
      .filter((d) => d.isDirectory())
      .map((d) => {
        const metaPath = path.join(petsDir, d.name, 'pet.json')
        if (!fs.existsSync(metaPath)) return null
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
          const spritesheetPath = path.join(petsDir, d.name, meta.spritesheetPath || 'spritesheet.webp')
          if (!fs.existsSync(spritesheetPath)) return null
          return {
            ...meta,
            folderName: d.name,
            folderPath: path.join(petsDir, d.name),
          }
        } catch {
          return null
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
const DEFAULT_SETTINGS = {
  language: 'zh-CN',
  skin: 'glass',
  petName: 'TermiPet',
  ownerName: '',
  personality: 'happy',
  customPrompt: '',
  chatProvider: 'ollama',
  ollamaModel: 'qwen2.5:0.5b',
  apiKeys: {},
}

function loadSettings() {
  const saved = readJSON(getUserDataPath('settings.json'), {})
  return { ...DEFAULT_SETTINGS, ...saved }
}

function saveSettings(settings) {
  const current = loadSettings()
  const merged = { ...current, ...settings }
  writeJSON(getUserDataPath('settings.json'), merged)
  return merged
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
const DEFAULT_COMMANDS = [
  { id: 'cmd-01', name: 'claude', command: 'claude', pinned: true, isCustom: false },
  { id: 'cmd-02', name: 'claude --enable-auto-mode', command: 'claude --enable-auto-mode', pinned: false, isCustom: false },
  { id: 'cmd-03', name: 'claude --dangerously-skip-permissions', command: 'claude --dangerously-skip-permissions', pinned: false, isCustom: false },
  { id: 'cmd-04', name: '/compact', command: '/compact', pinned: false, isCustom: false },
  { id: 'cmd-05', name: '/init', command: '/init', pinned: false, isCustom: false },
  { id: 'cmd-06', name: '/clear', command: '/clear', pinned: false, isCustom: false },
  { id: 'cmd-07', name: '/memory', command: '/memory', pinned: false, isCustom: false },
  { id: 'cmd-08', name: '/model', command: '/model', pinned: false, isCustom: false },
  { id: 'cmd-09', name: '/help', command: '/help', pinned: false, isCustom: false },
  { id: 'cmd-10', name: '/review', command: '/review', pinned: false, isCustom: false },
  { id: 'cmd-11', name: '/status', command: '/status', pinned: false, isCustom: false },
  { id: 'cmd-12', name: '/diff', command: '/diff', pinned: false, isCustom: false },
  { id: 'cmd-13', name: '/cost', command: '/cost', pinned: false, isCustom: false },
  { id: 'cmd-14', name: '/login', command: '/login', pinned: false, isCustom: false },
  { id: 'cmd-15', name: '/config', command: '/config', pinned: false, isCustom: false },
  { id: 'cmd-16', name: '/mcp', command: '/mcp', pinned: false, isCustom: false },
  { id: 'cmd-17', name: '/doctor', command: '/doctor', pinned: false, isCustom: false },
  { id: 'cmd-18', name: '/terminal-setup', command: '/terminal-setup', pinned: false, isCustom: false },
]

function loadCommands() {
  const filePath = getUserDataPath('commands.json')
  if (!fs.existsSync(filePath)) {
    writeJSON(filePath, DEFAULT_COMMANDS)
    return DEFAULT_COMMANDS
  }
  return readJSON(filePath, DEFAULT_COMMANDS)
}

function saveCommands(commands) {
  writeJSON(getUserDataPath('commands.json'), commands)
}

// ---------------------------------------------------------------------------
// Command execution: copy to clipboard + simulate Ctrl+V via PowerShell
// ---------------------------------------------------------------------------
function executeCommand(text) {
  return new Promise((resolve, reject) => {
    clipboard.writeText(text)

    const ps = `
Add-Type -AssemblyName System.Windows.Forms
Start-Sleep -Milliseconds 200
[System.Windows.Forms.SendKeys]::SendWait('^v')
Start-Sleep -Milliseconds 100
[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
`
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], (err) => {
      if (err) reject(err)
      else resolve(true)
    })
  })
}

// ---------------------------------------------------------------------------
// Chat system
// ---------------------------------------------------------------------------
function buildOllamaPayload(messages, model) {
  return JSON.stringify({
    model: model || 'qwen2.5:0.5b',
    messages,
    stream: true,
  })
}

function buildOpenAIPayload(messages, model) {
  return JSON.stringify({
    model: model || 'gpt-4o-mini',
    messages,
    stream: true,
  })
}

function getProviderURL(config) {
  switch (config.provider) {
    case 'ollama':
      return 'http://localhost:11434/api/chat'
    case 'openai':
      return config.endpoint || 'https://api.openai.com/v1/chat/completions'
    case 'google':
      return config.endpoint || `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
    case 'custom':
      return config.endpoint
    default:
      return 'http://localhost:11434/api/chat'
  }
}

function getProviderHeaders(config) {
  const headers = { 'Content-Type': 'application/json' }
  if (config.provider === 'openai' || config.provider === 'custom') {
    if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`
  }
  if (config.provider === 'google') {
    if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`
  }
  return headers
}

async function sendChatMessage(message, config) {
  // Add user message to history
  chatHistory.push({ role: 'user', content: message })

  // Build system prompt if personality is set
  const systemMessages = []
  if (config.personality) {
    systemMessages.push({ role: 'system', content: config.personality })
  }
  const messages = [...systemMessages, ...chatHistory]

  const abortController = new AbortController()
  currentChatAbortController = abortController

  const url = getProviderURL(config)
  const headers = getProviderHeaders(config)
  const isOllama = config.provider === 'ollama'
  const body = isOllama
    ? buildOllamaPayload(messages, config.model)
    : buildOpenAIPayload(messages, config.model)

  let fullResponse = ''

  try {
    if (isOllama) {
      // Ollama streaming: each line is a JSON object with { message: { content } }
      await httpStream(url, {
        method: 'POST',
        headers,
        body,
        signal: abortController.signal,
        onData: (data) => {
          const lines = data.split('\n').filter(Boolean)
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line)
              if (parsed.message && parsed.message.content) {
                fullResponse += parsed.message.content
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('chat-chunk', parsed.message.content)
                }
              }
            } catch {
              // Incomplete JSON chunk, ignore
            }
          }
        },
      })
    } else {
      // OpenAI-compatible streaming: SSE format with data: {...}
      await httpStream(url, {
        method: 'POST',
        headers,
        body,
        signal: abortController.signal,
        onData: (data) => {
          const lines = data.split('\n').filter(Boolean)
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const jsonStr = line.slice(6).trim()
            if (jsonStr === '[DONE]') return
            try {
              const parsed = JSON.parse(jsonStr)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) {
                fullResponse += delta
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('chat-chunk', delta)
                }
              }
            } catch {
              // Incomplete SSE chunk, ignore
            }
          }
        },
      })
    }

    // Store assistant response
    chatHistory.push({ role: 'assistant', content: fullResponse })

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('chat-complete')
    }
  } catch (err) {
    if (err.message === 'Request aborted') return
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('chat-error', err.message)
    }
  } finally {
    currentChatAbortController = null
  }
}

// ---------------------------------------------------------------------------
// Process monitor
// ---------------------------------------------------------------------------
const TERMINAL_PROCESSES = new Set([
  'windowsterminal', 'powershell', 'pwsh', 'cmd', 'wt',
  'alacritty', 'kitty', 'wezterm', 'hyper',
])
const EDITOR_PROCESSES = new Set([
  'code', 'cursor', 'idea64', 'webstorm64', 'pycharm64',
  'sublime_text', 'zed',
])
const AI_CHAT_PROCESSES = new Set(['claude', 'chatgpt'])

function classifyProcess(processName) {
  const name = processName.toLowerCase()
  if (TERMINAL_PROCESSES.has(name)) return 'terminal'
  if (EDITOR_PROCESSES.has(name)) return 'editor'
  if (AI_CHAT_PROCESSES.has(name)) return 'ai-chat'
  return 'other'
}

function startProcessMonitor() {
  if (processMonitorTimer) return

  processMonitorTimer = setInterval(() => {
    const psCommand = `Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object ProcessName, MainWindowTitle, Id | ConvertTo-Json`
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCommand], { timeout: 5000 }, (err, stdout) => {
      if (err || !stdout) return

      try {
        let processes = JSON.parse(stdout)
        // PowerShell returns a single object (not array) when there's only one result
        if (!Array.isArray(processes)) processes = [processes]

        // Find the foreground app among known categories
        const recognized = processes
          .filter((p) => classifyProcess(p.ProcessName) !== 'other')
          .map((p) => ({
            processName: p.ProcessName,
            windowTitle: p.MainWindowTitle,
            pid: p.Id,
            category: classifyProcess(p.ProcessName),
          }))

        const active = recognized[0] || null
        const activeKey = active ? `${active.processName}-${active.pid}` : null
        const lastKey = lastActiveApp ? `${lastActiveApp.processName}-${lastActiveApp.pid}` : null

        if (activeKey !== lastKey) {
          lastActiveApp = active
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('active-app-changed', active)
          }
        }
      } catch {
        // JSON parse error, skip this tick
      }
    })
  }, 3000)
}

function stopProcessMonitor() {
  if (processMonitorTimer) {
    clearInterval(processMonitorTimer)
    processMonitorTimer = null
  }
}

// ---------------------------------------------------------------------------
// Usage quota fetching
// ---------------------------------------------------------------------------
async function fetchClaudeQuota() {
  const credPath = path.join(os.homedir(), '.claude', '.credentials.json')
  const creds = readJSON(credPath, null)
  if (!creds || !creds.claudeAiOauth) return null

  const token = creds.claudeAiOauth.accessToken || creds.claudeAiOauth.token
  if (!token) return null

  try {
    const res = await httpRequest('https://api.anthropic.com/api/oauth/usage', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status !== 200) return null
    const data = JSON.parse(res.body)
    return {
      name: 'Claude Code',
      used: data.used ?? 0,
      limit: data.limit ?? 0,
      resetAt: data.resetAt || null,
      percentage: data.limit ? Math.round(((data.used ?? 0) / data.limit) * 100) : 0,
    }
  } catch {
    return null
  }
}

async function fetchCodexQuota() {
  const authPath = path.join(os.homedir(), '.codex', 'auth.json')
  const auth = readJSON(authPath, null)
  if (!auth || !auth.token) return null

  try {
    const res = await httpRequest('https://chatgpt.com/backend-api/wham/usage', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    if (res.status !== 200) return null
    const data = JSON.parse(res.body)
    return {
      name: 'Codex / ChatGPT',
      used: data.used ?? 0,
      limit: data.limit ?? 0,
      resetAt: data.resetAt || null,
      percentage: data.limit ? Math.round(((data.used ?? 0) / data.limit) * 100) : 0,
    }
  } catch {
    return null
  }
}

async function fetchCopilotQuota() {
  const hostsPath = path.join(os.homedir(), '.config', 'github-copilot', 'hosts.json')
  const hosts = readJSON(hostsPath, null)
  if (!hosts) return null

  // Extract token from first host entry
  const firstKey = Object.keys(hosts)[0]
  const token = firstKey ? (hosts[firstKey].oauth_token || hosts[firstKey].token) : null
  if (!token) return null

  try {
    const res = await httpRequest('https://api.github.com/copilot_internal/user', {
      headers: {
        Authorization: `token ${token}`,
        'User-Agent': 'TermiPet',
      },
    })
    if (res.status !== 200) return null
    const data = JSON.parse(res.body)
    return {
      name: 'GitHub Copilot',
      used: data.used ?? 0,
      limit: data.limit ?? 0,
      resetAt: data.resetAt || null,
      percentage: data.limit ? Math.round(((data.used ?? 0) / data.limit) * 100) : 0,
    }
  } catch {
    return null
  }
}

async function getUsageQuotas() {
  const results = await Promise.allSettled([
    fetchClaudeQuota(),
    fetchCodexQuota(),
    fetchCopilotQuota(),
  ])
  return results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Ollama / API key testing
// ---------------------------------------------------------------------------
async function testOllamaConnection() {
  try {
    const res = await httpRequest('http://localhost:11434/api/tags')
    return { success: res.status === 200 }
  } catch {
    return { success: false }
  }
}

async function testApiKey(provider, apiKey, endpoint) {
  try {
    let url, headers, body

    if (provider === 'openai') {
      url = endpoint || 'https://api.openai.com/v1/chat/completions'
      headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      }
      body = JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      })
    } else if (provider === 'google') {
      url = endpoint || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
      headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      }
      body = JSON.stringify({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      })
    } else {
      // custom provider
      if (!endpoint) return { success: false, error: 'No endpoint provided' }
      url = endpoint
      headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      }
      body = JSON.stringify({
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      })
    }

    const res = await httpRequest(url, { method: 'POST', headers, body })
    return { success: res.status >= 200 && res.status < 300 }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------
function createMainWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: 280,
    height: 320,
    x: screenWidth - 320,
    y: screenHeight - 370,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.setIgnoreMouseEvents(false)


  if (isDev) {
    mainWindow.loadURL('http://localhost:5174')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 560,
    height: 640,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    settingsWindow.loadURL('http://localhost:5174#/settings')
  } else {
    settingsWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
      hash: '/settings',
    })
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

function createSubWindow(hashRoute, width, height) {
  const win = new BrowserWindow({
    width,
    height,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.setMenu(null)

  if (isDev) {
    win.loadURL(`http://localhost:5174#${hashRoute}`)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
      hash: hashRoute,
    })
  }

  return win
}

function createTodoWindow() {
  if (todoWindow && !todoWindow.isDestroyed()) {
    todoWindow.focus()
    return
  }
  todoWindow = createSubWindow('/todo', 680, 520)
  todoWindow.on('closed', () => { todoWindow = null })
}

function createDiaryWindow() {
  if (diaryWindow && !diaryWindow.isDestroyed()) {
    diaryWindow.focus()
    return
  }
  diaryWindow = createSubWindow('/diary', 800, 520)
  diaryWindow.on('closed', () => { diaryWindow = null })
}

function createStockWindow() {
  if (stockWindow && !stockWindow.isDestroyed()) {
    stockWindow.focus()
    return
  }
  stockWindow = createSubWindow('/stock', 800, 520)
  stockWindow.on('closed', () => { stockWindow = null })
}

// ---------------------------------------------------------------------------
// System tray
// ---------------------------------------------------------------------------
function createTray() {
  const iconPath = path.join(__dirname, '..', 'icon', 'bar.png')
  let trayIcon
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  } else {
    trayIcon = nativeImage.createEmpty()
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('TermiPet')
  updateTrayMenu()

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function updateTrayMenu() {
  const pets = loadPets()
  const selectedPetId = loadSelectedPet()

  const petMenuItems = pets.map((pet) => ({
    label: pet.displayName || pet.id,
    type: 'radio',
    checked: pet.id === selectedPetId,
    click: () => {
      saveSelectedPet(pet.id)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pet-changed', pet.id)
      }
      updateTrayMenu()
    },
  }))

  const contextMenu = Menu.buildFromTemplate([
    { label: 'TermiPet', enabled: false },
    { type: 'separator' },
    {
      label: '选择宠物',
      submenu: petMenuItems.length > 0 ? petMenuItems : [{ label: '(无宠物)', enabled: false }],
    },
    { type: 'separator' },
    {
      label: '显示宠物',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
        } else {
          createMainWindow()
        }
      },
    },
    {
      label: '隐藏宠物',
      click: () => {
        if (mainWindow) mainWindow.hide()
      },
    },
    { type: 'separator' },
    {
      label: '设置',
      click: () => createSettingsWindow(),
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => app.quit(),
    },
  ])

  tray.setContextMenu(contextMenu)
}

// ---------------------------------------------------------------------------
// Claude Hook integration
// ---------------------------------------------------------------------------
function setupClaudeHook() {
  try {
    claudeHook = require('./claudeHook')

    if (claudeHook.onStateChanged) {
      claudeHook.onStateChanged((state) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('claude-state-changed', state)
        }
      })
    }

    if (claudeHook.onApprovalPrompt) {
      claudeHook.onApprovalPrompt((prompt) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('approval-prompt', prompt)
        }
      })
    }
  } catch (err) {
    console.error('Failed to load claudeHook module:', err.message)
    claudeHook = null
  }
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------
function setupIPC() {
  // -- Pet management --
  ipcMain.handle('get-pets', () => loadPets())

  ipcMain.handle('get-selected-pet', () => loadSelectedPet())

  ipcMain.handle('set-selected-pet', (_event, petId) => {
    saveSelectedPet(petId)
    updateTrayMenu()
    return true
  })

  ipcMain.handle('get-spritesheet-base64', (_event, folderPath, spritesheetFilename) => {
    try {
      const fullPath = path.join(folderPath, spritesheetFilename)
      if (!fs.existsSync(fullPath)) return null
      const buffer = fs.readFileSync(fullPath)
      const ext = path.extname(spritesheetFilename).slice(1)
      const mimeMap = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif' }
      const mime = mimeMap[ext] || 'image/png'
      return `data:${mime};base64,${buffer.toString('base64')}`
    } catch {
      return null
    }
  })

  // -- Window position --
  ipcMain.handle('set-window-position', (_event, x, y) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setPosition(Math.round(x), Math.round(y))
    }
  })

  ipcMain.handle('get-window-position', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const [x, y] = mainWindow.getPosition()
      return { x, y }
    }
    return { x: 0, y: 0 }
  })

  // -- Claude hooks --
  ipcMain.handle('install-claude-hooks', async () => {
    if (!claudeHook) return { success: false, error: 'Claude hook module not loaded' }
    try {
      return await claudeHook.install()
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('uninstall-claude-hooks', async () => {
    if (!claudeHook) return { success: false, error: 'Claude hook module not loaded' }
    try {
      return await claudeHook.uninstall()
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('is-claude-hooks-installed', async () => {
    if (!claudeHook) return false
    try {
      return await claudeHook.isInstalled()
    } catch {
      return false
    }
  })

  ipcMain.handle('resolve-approval', async (_event, id, decision) => {
    if (!claudeHook) return { success: false }
    try {
      return await claudeHook.resolveApproval(id, decision)
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // -- Commands --
  ipcMain.handle('get-commands', () => loadCommands())

  ipcMain.handle('save-commands', (_event, commands) => {
    saveCommands(commands)
    return true
  })

  ipcMain.handle('execute-command', async (_event, text) => {
    try {
      return await executeCommand(text)
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // -- Chat --
  ipcMain.handle('send-chat-message', async (_event, message, config) => {
    await sendChatMessage(message, config)
    return true
  })

  ipcMain.handle('cancel-chat', () => {
    if (currentChatAbortController) {
      currentChatAbortController.abort()
      currentChatAbortController = null
    }
    return true
  })

  ipcMain.handle('get-chat-history', () => chatHistory)

  ipcMain.handle('clear-chat-history', () => {
    chatHistory = []
    return true
  })

  // -- Settings --
  ipcMain.handle('get-settings', () => loadSettings())

  ipcMain.handle('save-settings', (_event, settings) => saveSettings(settings))

  ipcMain.handle('test-ollama-connection', () => testOllamaConnection())

  ipcMain.handle('test-api-key', (_event, provider, key, endpoint) => testApiKey(provider, key, endpoint))

  // -- Quota --
  ipcMain.handle('get-usage-quotas', () => getUsageQuotas())

  // -- Todo (electron-store) --
  ipcMain.handle('get-todos', () => store.get('todos'))
  ipcMain.handle('save-todo', (_event, todo) => {
    const todos = store.get('todos')
    const result = todoLogic.saveTodo(todos, todo)
    if (result) store.set('todos', result)
    return result
  })
  ipcMain.handle('delete-todo', (_event, id) => {
    const todos = store.get('todos')
    const result = todoLogic.deleteTodo(todos, id)
    if (result) store.set('todos', result)
    return result
  })
  ipcMain.handle('get-projects', () => store.get('projects'))
  ipcMain.handle('save-project', (_event, project) => {
    const projects = store.get('projects')
    const result = todoLogic.saveProject(projects, project)
    if (result) store.set('projects', result)
    return result
  })
  ipcMain.handle('delete-project', (_event, id) => {
    const projects = store.get('projects')
    const todos = store.get('todos')
    const result = todoLogic.deleteProject(projects, todos, id)
    if (result) {
      store.set('projects', result.projects)
      store.set('todos', result.todos)
    }
    return result
  })

  // -- Diary (MySQL) --
  ipcMain.handle('get-diary-categories', () => diaryLogic.getCategories())
  ipcMain.handle('get-diaries', (_event, params) => diaryLogic.getDiaries(params))
  ipcMain.handle('get-diary-by-id', (_event, id) => diaryLogic.getDiaryById(id))
  ipcMain.handle('get-diary-count', (_event, categoryId) => diaryLogic.getDiaryCount(categoryId))
  ipcMain.handle('save-diary', (_event, diary) => diaryLogic.saveDiary(diary))
  ipcMain.handle('delete-diary', (_event, id) => diaryLogic.deleteDiary(id))

  // -- Stock (MySQL) --
  ipcMain.handle('get-trades', (_event, params) => stockLogic.getTrades(params))
  ipcMain.handle('get-trade-by-id', (_event, id) => stockLogic.getTradeById(id))
  ipcMain.handle('get-trade-count', (_event, params) => stockLogic.getTradeCount(params))
  ipcMain.handle('save-trade', (_event, trade) => stockLogic.saveTrade(trade))
  ipcMain.handle('delete-trade', (_event, id) => stockLogic.deleteTrade(id))
  ipcMain.handle('get-positions', (_event, keyword) => stockLogic.getPositions(keyword))
  ipcMain.handle('get-position-by-id', (_event, id) => stockLogic.getPositionById(id))
  ipcMain.handle('save-position', (_event, pos) => stockLogic.savePosition(pos))
  ipcMain.handle('delete-position', (_event, id) => stockLogic.deletePosition(id))
  ipcMain.handle('get-indicators', (_event, stockCode) => stockLogic.getIndicators(stockCode))
  ipcMain.handle('save-indicator', (_event, ind) => stockLogic.saveIndicator(ind))
  ipcMain.handle('delete-indicator', (_event, id) => stockLogic.deleteIndicator(id))

  // -- Sub windows --
  ipcMain.handle('open-todo-window', () => { createTodoWindow(); return true })
  ipcMain.handle('open-diary-window', () => { createDiaryWindow(); return true })
  ipcMain.handle('open-stock-window', () => { createStockWindow(); return true })

  // -- Store (generic) --
  ipcMain.handle('store-get', (_event, key) => store.get(key))
  ipcMain.handle('store-set', (_event, key, value) => { store.set(key, value); return true })

  // -- General --
  ipcMain.handle('open-settings-window', () => {
    createSettingsWindow()
    return true
  })

  ipcMain.handle('quit-app', () => {
    app.quit()
  })
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(() => {
  // Load qimo modules
  store = require('./store')
  todoLogic = require('./todo-logic')
  diaryLogic = require('./diary-logic')
  stockLogic = require('./stock-logic')
  db = require('./db')

  setupIPC()
  setupClaudeHook()
  createMainWindow()
  createTray()
  startProcessMonitor()
})

app.on('window-all-closed', () => {
  // Keep running in tray -- do not quit
})

app.on('before-quit', async () => {
  stopProcessMonitor()
  if (db) {
    try { await db.closePool() } catch {}
  }
  if (tray) tray.destroy()
})

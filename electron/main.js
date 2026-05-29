const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, clipboard, desktopCapturer } = require('electron')
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
let diaryLogic = null
let stockLogic = null
let recordingDb = null

// Cached data (loaded from DB at startup)
let settingsCache = null
let commandsCache = null

// Sub-windows
let todoWindow = null
let diaryWindow = null
let stockWindow = null
let stickyNoteWindow = null
let recordingWindow = null
let pendingRecordingResults = null

// Todo reminder
let todoReminderTimer = null

// Walking engine
let walkTimer = null
let walkState = {
  enabled: true,
  phase: 'idle',     // 'idle' | 'walking' | 'paused'
  direction: 1,      // 1 = right, -1 = left
  speed: 30,         // pixels per second
  lastTick: 0,
  pausedByUser: false,
  phaseTimer: null,
}

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
  chatProvider: 'custom',
  ollamaModel: 'qwen-vl-max',
  apiKeys: {
    custom: 'sk-0baec11198694fde9ee9bb632ce619f9',
    custom_endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  },
}

function loadSettings() {
  return settingsCache || DEFAULT_SETTINGS
}

async function saveSettings(settings) {
  const current = loadSettings()
  const merged = { ...current, ...settings }
  const { setConfig } = require('./config-db')
  await setConfig('settings', merged)
  settingsCache = merged
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
  return commandsCache || DEFAULT_COMMANDS
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

function resolveConfig(config) {
  if (config && config.provider) return config
  const settings = loadSettings()
  return {
    provider: settings.chatProvider || 'ollama',
    model: settings.ollamaModel || 'qwen2.5:0.5b',
    personality: settings.personality || '',
    apiKey: settings.apiKeys?.[settings.chatProvider] || '',
    endpoint: settings.apiKeys?.[settings.chatProvider + '_endpoint'] || '',
  }
}

async function sendChatMessage(message, config) {
  config = resolveConfig(config)

  let displayText
  let ollamaUserMsg
  let openaiUserMsg

  if (typeof message === 'string') {
    displayText = message
    ollamaUserMsg = { role: 'user', content: message }
    openaiUserMsg = { role: 'user', content: message }
  } else {
    displayText = message.text
    const images = message.images || []
    if (images.length > 0) {
      ollamaUserMsg = { role: 'user', content: message.text, images }
      openaiUserMsg = {
        role: 'user',
        content: [
          { type: 'text', text: message.text },
          ...images.map((img) => ({
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${img}` },
          })),
        ],
      }
    } else {
      ollamaUserMsg = { role: 'user', content: message.text }
      openaiUserMsg = { role: 'user', content: message.text }
    }
  }

  chatHistory.push(openaiUserMsg)

  const isOllama = config.provider === 'ollama'

  const providerHistory = chatHistory.map((msg) => {
    if (isOllama && Array.isArray(msg.content)) {
      const textPart = msg.content.find((p) => p.type === 'text')
      const imageParts = msg.content.filter((p) => p.type === 'image_url')
      return {
        role: msg.role,
        content: textPart?.text || '',
        images: imageParts.map((p) => {
          const url = p.image_url.url
          return url.startsWith('data:') ? url.split(',')[1] : url
        }),
      }
    }
    return msg
  })

  const systemMessages = []
  if (config.personality) {
    systemMessages.push({ role: 'system', content: config.personality })
  }
  const messages = [...systemMessages, ...providerHistory]

  const abortController = new AbortController()
  currentChatAbortController = abortController

  const url = getProviderURL(config)
  const headers = getProviderHeaders(config)
  const body = isOllama
    ? buildOllamaPayload(messages, config.model)
    : buildOpenAIPayload(messages, config.model)

  let fullResponse = ''

  try {
    if (isOllama) {
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

    chatHistory.push({ role: 'assistant', content: fullResponse })

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('chat-complete', {
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now(),
      })
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
// File drop: read dropped file for pet interaction
// ---------------------------------------------------------------------------
const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'tiff', 'bmp', 'heic', 'heif',
])

function readDroppedFile(filePath) {
  try {
    const ext = path.extname(filePath).slice(1).toLowerCase()
    const name = path.basename(filePath)
    const isImage = IMAGE_EXTENSIONS.has(ext)

    if (isImage) {
      const buffer = fs.readFileSync(filePath)
      const base64 = buffer.toString('base64')
      return { type: 'image', name, path: filePath, base64 }
    }

    return { type: 'document', name, path: filePath }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Walking engine
// ---------------------------------------------------------------------------
function sendWalkState() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('walk-state-changed', {
    phase: walkState.phase,
    direction: walkState.direction,
  })
}

function scheduleNextPhase() {
  if (walkState.phaseTimer) clearTimeout(walkState.phaseTimer)

  if (walkState.phase === 'walking') {
    const walkDuration = 4000 + Math.random() * 4000
    walkState.phaseTimer = setTimeout(() => {
      walkState.phase = 'paused'
      sendWalkState()
      scheduleNextPhase()
    }, walkDuration)
  } else if (walkState.phase === 'paused') {
    const pauseDuration = 1500 + Math.random() * 1500
    walkState.phaseTimer = setTimeout(() => {
      if (Math.random() < 0.3) walkState.direction *= -1
      walkState.phase = 'walking'
      sendWalkState()
      scheduleNextPhase()
    }, pauseDuration)
  }
}

function walkTick() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (walkState.phase !== 'walking') return

  const now = Date.now()
  const dt = Math.min((now - walkState.lastTick) / 1000, 0.1)
  walkState.lastTick = now

  const pos = mainWindow.getPosition()
  const size = mainWindow.getSize()
  const display = screen.getDisplayMatching({
    x: pos[0], y: pos[1], width: size[0], height: size[1],
  })
  const bounds = display.workArea

  let newX = pos[0] + walkState.speed * walkState.direction * dt

  const minX = bounds.x + 10
  const maxX = bounds.x + bounds.width - size[0] - 10
  if (newX <= minX) {
    newX = minX
    walkState.direction = 1
    sendWalkState()
  } else if (newX >= maxX) {
    newX = maxX
    walkState.direction = -1
    sendWalkState()
  }

  mainWindow.setPosition(Math.round(newX), pos[1])
}

function startWalking() {
  if (walkTimer) return
  walkState.phase = 'walking'
  walkState.lastTick = Date.now()
  walkState.direction = Math.random() < 0.5 ? 1 : -1
  sendWalkState()
  scheduleNextPhase()
  walkTimer = setInterval(walkTick, 33)
}

function stopWalking() {
  if (walkState.phaseTimer) {
    clearTimeout(walkState.phaseTimer)
    walkState.phaseTimer = null
  }
  if (walkTimer) {
    clearInterval(walkTimer)
    walkTimer = null
  }
  walkState.phase = 'idle'
  sendWalkState()
}

function pauseWalking() {
  if (walkState.phase === 'idle') return
  if (walkState.phaseTimer) clearTimeout(walkState.phaseTimer)
  walkState.phase = 'paused'
  sendWalkState()
}

function resumeWalking() {
  if (!walkState.enabled || walkState.pausedByUser) return
  if (walkState.phase !== 'paused') return
  walkState.phase = 'walking'
  walkState.lastTick = Date.now()
  sendWalkState()
  scheduleNextPhase()
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
    const psCommand = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object ProcessName, MainWindowTitle, Id | ConvertTo-Json`
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
    y: screenHeight - 360,
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

  mainWindow.setIgnoreMouseEvents(true, { forward: true })

  if (isDev) {
    mainWindow.loadURL('http://localhost:9001')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => {
    stopWalking()
    mainWindow = null
  })

  mainWindow.webContents.on('did-finish-load', () => {
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
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1a2e',
      symbolColor: '#e0e0e0',
      height: 36,
    },
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    settingsWindow.loadURL('http://localhost:9001#/settings')
    settingsWindow.webContents.on('before-input-event', (_e, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        settingsWindow.webContents.toggleDevTools()
      }
    })
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
  const isLightWindow = hashRoute === '/todo' || hashRoute === '/recording'
  const win = new BrowserWindow({
    width,
    height,
    resizable: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: isLightWindow ? '#f5f7fb' : '#1a1a2e',
      symbolColor: isLightWindow ? '#334155' : '#e0e0e0',
      height: 36,
    },
    backgroundColor: isLightWindow ? '#f5f7fb' : '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.setMenu(null)

  if (isDev) {
    win.loadURL(`http://localhost:9001#${hashRoute}`)
    win.webContents.on('before-input-event', (_e, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        win.webContents.toggleDevTools()
      }
    })
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
  todoWindow = createSubWindow('/todo', 1120, 760)
  todoWindow.setMinimumSize(900, 680)
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

function createStickyNoteWindow() {
  if (stickyNoteWindow && !stickyNoteWindow.isDestroyed()) {
    stickyNoteWindow.focus()
    return
  }
  stickyNoteWindow = createSubWindow('/sticky', 360, 420)
  stickyNoteWindow.setMinimumSize(280, 300)
  stickyNoteWindow.on('closed', () => { stickyNoteWindow = null })
}

let chatWindow = null
let pendingChatMessage = null

function createChatWindow() {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.focus()
    return
  }
  chatWindow = createSubWindow('/chat', 480, 600)
  chatWindow.on('closed', () => { chatWindow = null })
}

function openChatWindowWithMessage(payload) {
  pendingChatMessage = payload
  createChatWindow()
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.focus()
  }
}

function createRecordingWindow() {
  if (recordingWindow && !recordingWindow.isDestroyed()) {
    recordingWindow.focus()
    return
  }
  recordingWindow = createSubWindow('/recording', 900, 620)
  recordingWindow.on('closed', () => { recordingWindow = null })
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

  // -- Commands (MySQL) --
  ipcMain.handle('get-commands', () => loadCommands())

  ipcMain.handle('save-commands', async (_event, commands) => {
    const commandDB = require('./command-db')
    for (const cmd of commands) await commandDB.saveCommand(cmd)
    commandsCache = await commandDB.getCommands()
    return true
  })

  ipcMain.handle('save-command', async (_event, cmd) => {
    const commandDB = require('./command-db')
    await commandDB.saveCommand(cmd)
    commandsCache = await commandDB.getCommands()
  })

  ipcMain.handle('delete-command', async (_event, id) => {
    const commandDB = require('./command-db')
    await commandDB.deleteCommand(id)
    commandsCache = await commandDB.getCommands()
  })

  ipcMain.handle('execute-command', async (_event, text) => {
    try {
      return await executeCommand(text)
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // -- Window resize --
  ipcMain.handle('set-window-size', (_event, width, height, animate) => {
    if (!mainWindow) return
    mainWindow.setSize(width, height, !!animate)
  })

  // -- Mouse passthrough control --
  ipcMain.handle('set-ignore-mouse', (_event, ignore) => {
    if (!mainWindow) return
    if (ignore) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true })
    } else {
      mainWindow.setIgnoreMouseEvents(false)
    }
  })

  // -- File drop --
  ipcMain.handle('read-dropped-file', (_event, filePath) => readDroppedFile(filePath))

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

  // -- Todo / Project (MySQL) --
  ipcMain.handle('get-todos', () => require('./todo-db').getTodos())
  ipcMain.handle('save-todo', (_event, todo) => require('./todo-db').saveTodo(todo))
  ipcMain.handle('delete-todo', (_event, id) => require('./todo-db').deleteTodo(id))
  ipcMain.handle('get-projects', () => require('./todo-db').getProjects())
  ipcMain.handle('save-project', (_event, project) => require('./todo-db').saveProject(project))
  ipcMain.handle('delete-project', (_event, id) => require('./todo-db').deleteProject(id))

  // -- Sticky Notes --
  ipcMain.handle('get-sticky-notes', () => require('./sticky-db').getStickyNotes())
  ipcMain.handle('save-sticky-note', (_event, note) => require('./sticky-db').saveStickyNote(note))
  ipcMain.handle('delete-sticky-note', (_event, id) => require('./sticky-db').deleteStickyNote(id))
  ipcMain.handle('open-sticky-note-window', () => createStickyNoteWindow())

  ipcMain.handle('save-sticky-image', async (_event, noteId, dataUrl) => {
    try {
      const imgDir = path.join(app.getPath('userData'), 'sticky-images')
      if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true })
      const filename = `${noteId}_${Date.now()}.png`
      const filePath = path.join(imgDir, filename)
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
      fs.writeFileSync(filePath, Buffer.from(base64, 'base64'))
      return filePath
    } catch (err) {
      console.error('save-sticky-image error:', err)
      return null
    }
  })

  ipcMain.handle('get-sticky-image', async (_event, imagePath) => {
    try {
      if (!fs.existsSync(imagePath)) return null
      const buf = fs.readFileSync(imagePath)
      return `data:image/png;base64,${buf.toString('base64')}`
    } catch {
      return null
    }
  })

  ipcMain.handle('delete-sticky-image', async (_event, imagePath) => {
    try {
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('preview-sticky-image', async (_event, imagePath) => {
    try {
      if (!fs.existsSync(imagePath)) return false
      const buf = fs.readFileSync(imagePath)
      const dataUrl = `data:image/png;base64,${buf.toString('base64')}`
      const display = screen.getPrimaryDisplay()
      const workArea = display.workAreaSize
      const winW = Math.round(workArea.width * 0.75)
      const winH = Math.round(workArea.height * 0.75)
      const previewWin = new BrowserWindow({
        width: winW,
        height: winH,
        center: true,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        webPreferences: { nodeIntegration: true, contextIsolation: false },
      })
      previewWin.setMenu(null)
      const html = `<!DOCTYPE html><html><head><style>
        *{margin:0;padding:0}
        body{background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;height:100vh;cursor:pointer;-webkit-app-region:no-drag}
        img{max-width:92%;max-height:92%;object-fit:contain;border-radius:6px;box-shadow:0 8px 40px rgba(0,0,0,0.6)}
        .close{position:fixed;top:16px;right:16px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);color:#fff;font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;backdrop-filter:blur(8px)}
        .close:hover{background:rgba(255,255,255,0.3)}
      </style></head><body>
        <img src="${dataUrl}"/>
        <button class="close" onclick="close()">✕</button>
        <script>
          document.body.addEventListener('click', (e) => { if(e.target.tagName!=='IMG') window.close() });
          document.addEventListener('keydown', (e) => { if(e.key==='Escape') window.close() });
        </script>
      </body></html>`
      previewWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      return true
    } catch {
      return false
    }
  })

  // -- Diary (MySQL, lazy-loaded) --
  function getDiaryLogic() {
    if (!diaryLogic) diaryLogic = require('./diary-logic')
    return diaryLogic
  }
  ipcMain.handle('get-diary-categories', () => getDiaryLogic().getCategories())
  ipcMain.handle('get-diaries', (_event, params) => getDiaryLogic().getDiaries(params))
  ipcMain.handle('get-diary-by-id', (_event, id) => getDiaryLogic().getDiaryById(id))
  ipcMain.handle('get-diary-count', (_event, categoryId) => getDiaryLogic().getDiaryCount(categoryId))
  ipcMain.handle('save-diary', (_event, diary) => getDiaryLogic().saveDiary(diary))
  ipcMain.handle('delete-diary', (_event, id) => getDiaryLogic().deleteDiary(id))

  // -- Stock (MySQL, lazy-loaded) --
  function getStockLogic() {
    if (!stockLogic) stockLogic = require('./stock-logic')
    return stockLogic
  }
  ipcMain.handle('get-trades', (_event, params) => getStockLogic().getTrades(params))
  ipcMain.handle('get-trade-by-id', (_event, id) => getStockLogic().getTradeById(id))
  ipcMain.handle('get-trade-count', (_event, params) => getStockLogic().getTradeCount(params))
  ipcMain.handle('save-trade', (_event, trade) => getStockLogic().saveTrade(trade))
  ipcMain.handle('delete-trade', (_event, id) => getStockLogic().deleteTrade(id))
  ipcMain.handle('get-positions', (_event, keyword) => getStockLogic().getPositions(keyword))
  ipcMain.handle('get-position-by-id', (_event, id) => getStockLogic().getPositionById(id))
  ipcMain.handle('save-position', (_event, pos) => getStockLogic().savePosition(pos))
  ipcMain.handle('delete-position', (_event, id) => getStockLogic().deletePosition(id))
  ipcMain.handle('get-indicators', (_event, stockCode) => getStockLogic().getIndicators(stockCode))
  ipcMain.handle('save-indicator', async (_event, ind) => {
    const result = await getStockLogic().saveIndicator(ind)
    if (result.triggered && result.triggered.length > 0) {
      const stockName = ind.stock_name || ind.stock_code
      for (const t of result.triggered) {
        mainWindow.webContents.send('todo-reminder', {
          id: `strategy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'strategy',
          title: `${t.strategy_name}`,
          note: `${stockName}(${ind.stock_code}) — ${t.direction === 1 ? '买入' : '卖出'}信号\n${t.conditions.map(c => `${c.indicator_name} ${c.operator} ${c.threshold} (当前: ${c.current_value})`).join('\n')}`,
          priority: 'high',
          stock_code: ind.stock_code,
        })
      }
    }
    return result.indicator
  })
  ipcMain.handle('delete-indicator', (_event, id) => getStockLogic().deleteIndicator(id))

  // Stock strategy
  ipcMain.handle('get-strategies', () => getStockLogic().getStrategies())
  ipcMain.handle('get-strategy-by-id', (_event, id) => getStockLogic().getStrategyById(id))
  ipcMain.handle('save-strategy', (_event, data) => getStockLogic().saveStrategy(data))
  ipcMain.handle('delete-strategy', (_event, id) => getStockLogic().deleteStrategy(id))
  ipcMain.handle('save-condition', (_event, data) => getStockLogic().saveCondition(data))
  ipcMain.handle('delete-condition', (_event, id) => getStockLogic().deleteCondition(id))
  ipcMain.handle('get-bindings-by-strategy', (_event, strategyId) => getStockLogic().getBindingsByStrategy(strategyId))
  ipcMain.handle('get-bindings-by-stock', (_event, stockCode) => getStockLogic().getBindingsByStock(stockCode))
  ipcMain.handle('save-binding', (_event, data) => getStockLogic().saveBinding(data))
  ipcMain.handle('toggle-binding', (_event, id, enabled) => getStockLogic().toggleBinding(id, enabled))
  ipcMain.handle('delete-binding', (_event, id) => getStockLogic().deleteBinding(id))

  // -- Stock OCR --
  ipcMain.handle('ocr-trade', async (_event, imageBase64) => {
    try {
      const { getConfig } = require('./config-db')
      const alicloud = await getConfig('alicloud')
      const settings = loadSettings()
      const apiKey = settings.apiKeys?.custom || alicloud?.chatKey
      const endpoint = settings.apiKeys?.custom_endpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
      if (!apiKey) return { error: '未配置 API Key' }

      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

      const defaultOcrPrompt = '你是一个股票交易截图识别助手。从截图中提取交易信息，返回 JSON 格式，字段包括：stock_name(证券名称), stock_code(证券代码), direction(买卖方向，买入=1，卖出=2), price(成交价格，数字), quantity(成交数量，数字), trade_time(成交时间)。只返回 JSON，不要其他文字。'
      const storedPrompts = await getConfig('system_prompts')
      const ocrPrompt = Array.isArray(storedPrompts)
        ? (storedPrompts.find(p => p.key === 'ocr_trade')?.prompt || defaultOcrPrompt)
        : defaultOcrPrompt

      const body = JSON.stringify({
        model: 'qwen-vl-max',
        messages: [
          {
            role: 'system',
            content: ocrPrompt
          },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Data}` } },
              { type: 'text', text: '请识别这张交易截图中的信息' }
            ]
          }
        ],
      })

      const res = await httpRequest(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body,
      })

      if (res.status >= 400) {
        return { error: `API 请求失败: HTTP ${res.status}` }
      }

      const data = JSON.parse(res.body)
      const content = data.choices?.[0]?.message?.content || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return { error: '无法解析识别结果' }
      return { data: JSON.parse(jsonMatch[0]) }
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle('capture-screen', async () => {
    try {
      const displays = screen.getAllDisplays()
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width, height } = primaryDisplay.size
      const scaleFactor = primaryDisplay.scaleFactor

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: width * scaleFactor, height: height * scaleFactor },
      })

      if (!sources.length) return { error: '无法捕获屏幕' }

      const source = sources[0]
      const dataUrl = source.thumbnail.toDataURL()

      return new Promise((resolve) => {
        const screenshotWin = new BrowserWindow({
          x: primaryDisplay.bounds.x,
          y: primaryDisplay.bounds.y,
          width: primaryDisplay.bounds.width,
          height: primaryDisplay.bounds.height,
          frame: false,
          alwaysOnTop: true,
          skipTaskbar: true,
          resizable: false,
          movable: false,
          minimizable: false,
          maximizable: false,
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
          },
        })

        screenshotWin.setMenu(null)
        screenshotWin.setFullScreen(true)
        screenshotWin.loadFile(path.join(__dirname, 'screenshot.html'))

        screenshotWin.webContents.on('did-finish-load', () => {
          screenshotWin.webContents.send('screenshot-data', dataUrl)
        })

        ipcMain.once('screenshot-result', (_event, result) => {
          screenshotWin.close()
          if (result) {
            resolve({ data: result })
          } else {
            resolve({ cancelled: true })
          }
        })

        screenshotWin.on('closed', () => {
          resolve({ cancelled: true })
        })
      })
    } catch (err) {
      return { error: err.message }
    }
  })

  // -- Todo reminder (MySQL) --
  ipcMain.handle('dismiss-todo-reminder', async (_event, id) => {
    const { query } = require('./db')
    await query('UPDATE todo SET notified = 1 WHERE id = ?', [id])
    return true
  })

  ipcMain.handle('snooze-todo-reminder', async (_event, id, minutes) => {
    const delayMinutes = Number.isFinite(Number(minutes)) ? Math.max(1, Number(minutes)) : 10
    const reminderAt = new Date(Date.now() + delayMinutes * 60_000).toISOString()
    const { query } = require('./db')
    await query('UPDATE todo SET reminder_at = ?, notified = 0 WHERE id = ?', [reminderAt, id])
    return true
  })

  async function checkTodoReminders() {
    if (!mainWindow || mainWindow.isDestroyed()) return
    try {
      const todoDB = require('./todo-db')
      const todos = await todoDB.getTodos()
      const now = Date.now()
      for (const todo of todos) {
        if (todo.done || todo.notified) continue
        const reminderSource = todo.reminderAt || todo.dueDate
        if (!reminderSource) continue
        const dueTime = new Date(reminderSource).getTime()
        if (isNaN(dueTime)) continue
        if (now >= dueTime) {
          mainWindow.webContents.send('todo-reminder', todo)
          const { query } = require('./db')
          await query('UPDATE todo SET notified = 1 WHERE id = ?', [todo.id])
          break
        }
      }
    } catch {}
  }

  todoReminderTimer = setInterval(checkTodoReminders, 60_000)
  checkTodoReminders()

  // -- Speech to text (DashScope FunASR / SenseVoice) --
  ipcMain.handle('transcribe-audio', async (_event, audioBase64) => {
    const { getConfig } = require('./config-db')
    const alicloud = await getConfig('alicloud')
    const speechKey = alicloud?.speechKey
    if (!speechKey) {
      return { error: '未配置语音识别 API Key，请在设置中配置' }
    }

    try {
      const audioBuffer = Buffer.from(audioBase64, 'base64')
      const filename = `recording-${Date.now()}.webm`

      // Step 1: Get OSS upload policy from DashScope
      const policyRes = await httpRequest(
        `https://dashscope.aliyuncs.com/api/v1/uploads?action=getPolicy&model=sensevoice-v1`,
        { method: 'GET', headers: { 'Authorization': `Bearer ${speechKey}` } }
      )
      if (policyRes.status >= 400) {
        return { error: `获取上传凭证失败: HTTP ${policyRes.status}: ${policyRes.body}` }
      }
      const policyData = JSON.parse(policyRes.body)
      const { data } = policyData
      if (!data || !data.upload_host || !data.policy) {
        return { error: `获取上传凭证失败: ${policyRes.body}` }
      }

      // Step 2: Upload audio file to OSS
      const ossKey = `${data.upload_dir}/${filename}`
      const boundary = '----OSSBound' + Date.now().toString(36)
      const fields = {
        OSSAccessKeyId: data.oss_access_key_id,
        Signature: data.signature,
        policy: data.policy,
        'x-oss-object-acl': data.x_oss_object_acl,
        'x-oss-forbid-overwrite': data.x_oss_forbid_overwrite,
        key: ossKey,
        success_action_status: '200',
      }
      const ossParts = []
      for (const [k, v] of Object.entries(fields)) {
        ossParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`))
      }
      ossParts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: audio/webm\r\n\r\n`
      ))
      ossParts.push(audioBuffer)
      ossParts.push(Buffer.from(`\r\n--${boundary}--\r\n`))
      const ossBody = Buffer.concat(ossParts)

      const ossRes = await httpRequest(data.upload_host, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body: ossBody,
      })
      if (ossRes.status >= 300) {
        return { error: `OSS 上传失败: HTTP ${ossRes.status}: ${ossRes.body}` }
      }

      const ossUrl = `oss://${ossKey}`

      // Step 3: Submit transcription task
      const taskBody = JSON.stringify({
        model: 'sensevoice-v1',
        input: { file_urls: [ossUrl] },
        parameters: { language_hints: ['zh'] },
      })

      const taskRes = await httpRequest('https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${speechKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
          'X-DashScope-OssResourceResolve': 'enable',
        },
        body: taskBody,
      })

      if (taskRes.status >= 400) {
        return { error: `提交识别任务失败: HTTP ${taskRes.status}: ${taskRes.body}` }
      }

      const taskData = JSON.parse(taskRes.body)
      const taskId = taskData.output?.task_id
      if (!taskId) {
        return { error: `提交识别任务失败: 未返回 task_id: ${taskRes.body}` }
      }

      // Step 4: Poll for results (max 60s)
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 1000))

        const pollRes = await httpRequest(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${speechKey}` },
        })

        const pollData = JSON.parse(pollRes.body)
        const status = pollData.output?.task_status

        if (status === 'SUCCEEDED') {
          const results = pollData.output?.results
          if (!results || results.length === 0) {
            return { error: '识别完成但无结果' }
          }

          const transUrl = results[0].transcription_url
          if (!transUrl) {
            return { text: (results[0].text || '').replace(/<\|[^|]*\|>/g, '').trim() }
          }

          const transRes = await httpRequest(transUrl, { method: 'GET' })
          const transData = JSON.parse(transRes.body)

          let text = ''
          if (transData.transcripts) {
            for (const t of transData.transcripts) {
              if (t.sentences) {
                text += t.sentences.map(s => s.text).join('')
              } else if (t.text) {
                text += t.text
              }
            }
          }
          if (!text && transData.text) {
            text = transData.text
          }

          text = text.replace(/<\|[^|]*\|>/g, '').trim()
          return { text }
        }

        if (status === 'FAILED') {
          return { error: `语音识别失败: ${pollData.output?.message || pollData.output?.code || '未知错误'}` }
        }
      }

      return { error: '语音识别超时（60秒）' }
    } catch (err) {
      return { error: `语音识别失败: ${err.message}` }
    }
  })

  // -- Scenes (MySQL) --
  ipcMain.handle('get-scenes', () => require('./scene-db').getScenes())

  ipcMain.handle('save-scenes', async (_event, scenes, defaultSceneId) => {
    const sceneDB = require('./scene-db')
    for (const s of scenes) await sceneDB.saveScene(s)
    if (defaultSceneId !== undefined) await sceneDB.setDefaultSceneId(defaultSceneId)
    return true
  })

  ipcMain.handle('save-scene', async (_event, scene) => {
    await require('./scene-db').saveScene(scene)
  })

  ipcMain.handle('delete-scene', async (_event, id) => {
    await require('./scene-db').deleteScene(id)
  })

  ipcMain.handle('set-default-scene', async (_event, sceneId) => {
    await require('./scene-db').setDefaultSceneId(sceneId)
  })

  // -- Summarize transcript (DashScope LLM) --
  ipcMain.handle('summarize-transcript', async (_event, transcript, prompt) => {
    const settings = loadSettings()
    const apiKey = settings.apiKeys?.custom
    const endpoint = settings.apiKeys?.custom_endpoint
    if (!apiKey || !endpoint) {
      return { error: '未配置 LLM API Key，请在设置中配置' }
    }

    try {
      const body = JSON.stringify({
        model: settings.ollamaModel || 'qwen-vl-max',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: transcript },
        ],
      })

      const res = await httpRequest(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body,
      })

      if (res.status >= 400) {
        return { error: `LLM 请求失败: HTTP ${res.status}` }
      }

      const data = JSON.parse(res.body)
      const text = data.choices?.[0]?.message?.content
      return { text: text || '' }
    } catch (err) {
      return { error: `摘要生成失败: ${err.message}` }
    }
  })

  // -- Mode Shortcut Config (MySQL) --
  ipcMain.handle('get-mode-shortcut-config', () => require('./shortcut-db').getModeShortcutConfig())

  ipcMain.handle('save-mode-shortcut-config', (_event, config) => require('./shortcut-db').saveModeShortcutConfig(config))
  ipcMain.handle('save-shortcut-mode', (_event, mode) => require('./shortcut-db').saveMode(mode))
  ipcMain.handle('save-shortcut-item', (_event, item) => require('./shortcut-db').saveItem(item))
  ipcMain.handle('delete-shortcut-item', (_event, id) => require('./shortcut-db').deleteItem(id))
  ipcMain.handle('set-active-mode-id', (_event, modeId) => require('./config-db').setConfig('activeModeId', modeId))

  // -- Sub windows --
  ipcMain.handle('open-todo-window', () => { createTodoWindow(); return true })
  ipcMain.handle('open-todo-window-new', () => {
    createTodoWindow()
    const win = todoWindow
    if (win && !win.isDestroyed()) {
      if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', () => {
          win.webContents.send('start-new-todo')
        })
      } else {
        win.webContents.send('start-new-todo')
      }
    }
    return true
  })
  ipcMain.handle('open-todo-window-voice', () => {
    createTodoWindow()
    const win = todoWindow
    if (win && !win.isDestroyed()) {
      if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', () => {
          win.webContents.send('start-voice-todo')
        })
      } else {
        win.webContents.send('start-voice-todo')
      }
    }
    return true
  })
  ipcMain.handle('open-diary-window', () => { createDiaryWindow(); return true })
  ipcMain.handle('open-stock-window', () => { createStockWindow(); return true })
  ipcMain.handle('open-recording-window', () => { createRecordingWindow(); return true })

  ipcMain.handle('process-pet-recording', async (_event, audioBase64, duration) => {
    const sendProgress = (phase) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('recording-progress', phase)
      }
    }

    sendProgress('transcribing')

    const { getConfig } = require('./config-db')
    const alicloud = await getConfig('alicloud')
    const speechKey = alicloud?.speechKey
    if (!speechKey) {
      sendProgress('error')
      return { error: '未配置语音识别 API Key' }
    }

    try {
      const rawBuffer = Buffer.from(audioBase64, 'base64')
      console.log('[录音] 收到 webm 原始大小:', rawBuffer.length)
      const ts = Date.now()
      const tmpDir = path.join(app.getPath('temp'), 'termipet-rec')
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
      const webmPath = path.join(tmpDir, `tmp-${ts}.webm`)
      const wavPath = path.join(tmpDir, `tmp-${ts}.wav`)
      fs.writeFileSync(webmPath, rawBuffer)
      const { execSync } = require('child_process')
      try {
        const ffOut = execSync(`ffmpeg -y -i "${webmPath}" -ar 16000 -ac 1 -sample_fmt s16 "${wavPath}" 2>&1`, { encoding: 'utf-8' })
        console.log('[录音] ffmpeg 输出:', ffOut.slice(-200))
      } catch (ffErr) {
        console.error('[录音] ffmpeg 失败:', ffErr.stderr || ffErr.message)
        sendProgress('error')
        try { fs.unlinkSync(webmPath) } catch (_) {}
        return { error: `音频转换失败 (ffmpeg): ${ffErr.message}` }
      }
      const audioBuffer = fs.readFileSync(wavPath)
      console.log('[录音] WAV 大小:', audioBuffer.length, 'RIFF:', audioBuffer.slice(0,4).toString('ascii'))
      try { fs.unlinkSync(webmPath); fs.unlinkSync(wavPath) } catch (_) {}
      const filename = `recording-${ts}.wav`

      const policyRes = await httpRequest(
        `https://dashscope.aliyuncs.com/api/v1/uploads?action=getPolicy&model=sensevoice-v1`,
        { method: 'GET', headers: { 'Authorization': `Bearer ${speechKey}` } }
      )
      if (policyRes.status >= 400) {
        sendProgress('error')
        return { error: `获取上传凭证失败: HTTP ${policyRes.status}` }
      }
      const policyData = JSON.parse(policyRes.body)
      const { data } = policyData
      if (!data || !data.upload_host || !data.policy) {
        sendProgress('error')
        return { error: `获取上传凭证失败` }
      }

      const ossKey = `${data.upload_dir}/${filename}`
      const boundary = '----OSSBound' + Date.now().toString(36)
      const fields = {
        OSSAccessKeyId: data.oss_access_key_id,
        Signature: data.signature,
        policy: data.policy,
        'x-oss-object-acl': data.x_oss_object_acl,
        'x-oss-forbid-overwrite': data.x_oss_forbid_overwrite,
        key: ossKey,
        success_action_status: '200',
      }
      const ossParts = []
      for (const [k, v] of Object.entries(fields)) {
        ossParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`))
      }
      ossParts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: audio/wav\r\n\r\n`
      ))
      ossParts.push(audioBuffer)
      ossParts.push(Buffer.from(`\r\n--${boundary}--\r\n`))

      const ossRes = await httpRequest(data.upload_host, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body: Buffer.concat(ossParts),
      })
      if (ossRes.status >= 300) {
        sendProgress('error')
        return { error: `OSS 上传失败: HTTP ${ossRes.status}` }
      }

      const ossUrl = `oss://${ossKey}`
      const taskBody = JSON.stringify({
        model: 'sensevoice-v1',
        input: { file_urls: [ossUrl] },
        parameters: { language_hints: ['zh'] },
      })
      const taskRes = await httpRequest('https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${speechKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
          'X-DashScope-OssResourceResolve': 'enable',
        },
        body: taskBody,
      })
      if (taskRes.status >= 400) {
        sendProgress('error')
        return { error: `提交识别任务失败: HTTP ${taskRes.status}` }
      }

      const taskData = JSON.parse(taskRes.body)
      const taskId = taskData.output?.task_id
      if (!taskId) {
        sendProgress('error')
        return { error: `提交识别任务失败: 未返回 task_id` }
      }

      let rawText = ''
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 1000))
        const pollRes = await httpRequest(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${speechKey}` },
        })
        const pollData = JSON.parse(pollRes.body)
        const st = pollData.output?.task_status
        if (st === 'SUCCEEDED') {
          const results = pollData.output?.results
          if (results?.[0]?.transcription_url) {
            const transRes = await httpRequest(results[0].transcription_url, { method: 'GET' })
            const transData = JSON.parse(transRes.body)
            if (transData.transcripts) {
              for (const t of transData.transcripts) {
                if (t.sentences) rawText += t.sentences.map(s => s.text).join('')
                else if (t.text) rawText += t.text
              }
            }
            if (!rawText && transData.text) rawText = transData.text
          } else if (results?.[0]?.text) {
            rawText = results[0].text
          }
          break
        }
        if (st === 'FAILED') {
          const code = pollData.output?.code
          if (code === 'InvalidFile.EmptyOutput') {
            sendProgress('error')
            return { error: '没有检测到语音内容，请靠近麦克风说话后重试' }
          }
          sendProgress('error')
          return { error: `语音识别失败: ${pollData.output?.message || '未知错误'}` }
        }
      }

      if (!rawText) {
        sendProgress('error')
        return { error: '语音识别超时或无结果' }
      }

      sendProgress('summarizing')

      const sceneData = await require('./scene-db').getScenes()
      const allScenes = sceneData.scenes || []
      const scene = allScenes.find(s => s.id === sceneData.defaultSceneId) || allScenes[0]

      let summary = ''
      let todoSummary = ''
      if (scene) {
        const settings = loadSettings()
        const apiKey = settings.apiKeys?.custom || alicloud?.chatKey
        const endpoint = settings.apiKeys?.custom_endpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
        if (apiKey && endpoint) {
          const summarize = async (prompt) => {
            const body = JSON.stringify({
              model: settings.ollamaModel || 'qwen-vl-max',
              messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: rawText },
              ],
            })
            const res = await httpRequest(endpoint, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body,
            })
            if (res.status < 400) {
              const d = JSON.parse(res.body)
              return d.choices?.[0]?.message?.content || ''
            }
            return ''
          }
          const [s, t] = await Promise.all([
            summarize(scene.summaryPrompt),
            summarize(scene.todoPrompt),
          ])
          summary = s
          todoSummary = t
        }
      }

      // Save audio file to disk
      const recordingsDir = path.join(app.getPath('userData'), 'TermiPet', 'recordings')
      if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true })
      const audioFileName = `rec-${Date.now()}.wav`
      const audioFilePath = path.join(recordingsDir, audioFileName)
      fs.writeFileSync(audioFilePath, audioBuffer)

      // Save to database
      if (!recordingDb) recordingDb = require('./recording-db')
      const recId = await recordingDb.saveRecording({
        sceneName: scene?.name || '',
        rawText,
        summary,
        todoSummary,
        audioPath: audioFilePath,
        duration: duration || 0,
        createdAt: Date.now(),
      })

      pendingRecordingResults = { id: recId, rawText, summary, todoSummary, sceneName: scene?.name || '', audioPath: audioFilePath, duration: duration || 0 }
      sendProgress('done')
      return { success: true }
    } catch (err) {
      sendProgress('error')
      return { error: `处理失败: ${err.message}` }
    }
  })

  ipcMain.handle('get-recording-results', () => {
    const results = pendingRecordingResults
    pendingRecordingResults = null
    return results
  })

  ipcMain.handle('open-recording-results', () => {
    createRecordingWindow()
    return true
  })

  ipcMain.handle('get-recordings', async (_event, limit, offset) => {
    if (!recordingDb) recordingDb = require('./recording-db')
    return recordingDb.getRecordings(limit || 50, offset || 0)
  })

  ipcMain.handle('get-recording-by-id', async (_event, id) => {
    if (!recordingDb) recordingDb = require('./recording-db')
    return recordingDb.getRecordingById(id)
  })

  ipcMain.handle('save-recording', async (_event, { sceneName, rawText, summary, todoSummary, audioBase64, duration }) => {
    if (!recordingDb) recordingDb = require('./recording-db')
    let audioPath = ''
    if (audioBase64) {
      const recordingsDir = path.join(app.getPath('userData'), 'TermiPet', 'recordings')
      if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true })
      const audioFileName = `rec-${Date.now()}.webm`
      audioPath = path.join(recordingsDir, audioFileName)
      fs.writeFileSync(audioPath, Buffer.from(audioBase64, 'base64'))
    }
    const id = await recordingDb.saveRecording({
      sceneName: sceneName || '',
      rawText: rawText || '',
      summary: summary || '',
      todoSummary: todoSummary || '',
      audioPath,
      duration: duration || 0,
      createdAt: Date.now(),
    })
    return { id, audioPath }
  })

  ipcMain.handle('delete-recording', async (_event, id) => {
    if (!recordingDb) recordingDb = require('./recording-db')
    const rec = await recordingDb.getRecordingById(id)
    if (rec?.audioPath && fs.existsSync(rec.audioPath)) {
      fs.unlinkSync(rec.audioPath)
    }
    await recordingDb.deleteRecording(id)
    return true
  })

  ipcMain.handle('get-recording-audio', async (_event, audioPath) => {
    if (!audioPath || !fs.existsSync(audioPath)) return null
    const buf = fs.readFileSync(audioPath)
    return buf.toString('base64')
  })

  ipcMain.handle('open-chat-window', () => { createChatWindow(); return true })
  ipcMain.handle('open-chat-window-with-message', (_event, payload) => {
    openChatWindowWithMessage(payload)
    return true
  })
  ipcMain.handle('get-pending-chat-message', () => {
    const msg = pendingChatMessage
    pendingChatMessage = null
    return msg
  })

  // -- Walking --
  ipcMain.handle('toggle-walk', () => {
    if (walkState.phase === 'idle') {
      walkState.pausedByUser = false
      startWalking()
    } else {
      walkState.pausedByUser = true
      stopWalking()
    }
    return walkState.phase
  })
  ipcMain.handle('pause-walk', () => { pauseWalking(); return true })
  ipcMain.handle('resume-walk', () => { resumeWalking(); return true })
  ipcMain.handle('get-walk-state', () => ({
    phase: walkState.phase,
    direction: walkState.direction,
  }))

  // -- Config (MySQL app_config) --
  ipcMain.handle('store-get', (_event, key) => require('./config-db').getConfig(key))
  ipcMain.handle('store-set', async (_event, key, value) => { await require('./config-db').setConfig(key, value); return true })

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
app.whenReady().then(async () => {
  // Load electron-store (used as migration source only)
  store = require('./store')

  // Initialize DB schema (idempotent CREATE TABLE IF NOT EXISTS)
  const { ensureSchema } = require('./schema')
  await ensureSchema()

  // One-time migration: electron-store + files → MySQL
  const { migrateFromStore } = require('./migrate-to-db')
  await migrateFromStore(store)

  // Initialize settings cache from DB
  const configDB = require('./config-db')
  const dbSettings = await configDB.getConfig('settings')
  if (!dbSettings) {
    const fileSettings = readJSON(getUserDataPath('settings.json'), {})
    const merged = { ...DEFAULT_SETTINGS, ...fileSettings }
    await configDB.setConfig('settings', merged)
    settingsCache = merged
  } else {
    settingsCache = { ...DEFAULT_SETTINGS, ...dbSettings }
  }

  // Initialize commands cache from DB
  const commandDB = require('./command-db')
  const dbCmds = await commandDB.getCommands()
  if (dbCmds.length === 0) {
    const filePath = getUserDataPath('commands.json')
    const fileCmds = fs.existsSync(filePath) ? readJSON(filePath, DEFAULT_COMMANDS) : DEFAULT_COMMANDS
    for (const cmd of fileCmds) await commandDB.saveCommand(cmd)
    commandsCache = await commandDB.getCommands()
  } else {
    commandsCache = dbCmds
  }

  // Ensure alicloud config exists in DB
  const alicloud = await configDB.getConfig('alicloud')
  if (!alicloud || !alicloud.speechKey) {
    await configDB.setConfig('alicloud', {
      ...(alicloud || {}),
      speechKey: alicloud?.speechKey || 'sk-0baec11198694fde9ee9bb632ce619f9',
    })
  }

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
  try {
    const { closePool } = require('./db')
    await closePool()
  } catch {}
  if (tray) tray.destroy()
})

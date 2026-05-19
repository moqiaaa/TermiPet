/**
 * claudeHook.js — Claude Code Hook integration for TermiPet (Electron main process)
 *
 * Three subsystems:
 *   1. HTTP Hook Server   – receives hook events from Claude Code via a bash relay script
 *   2. Hook Installer      – writes the bash relay + patches ~/.claude/settings.json
 *   3. JSONL Session Watcher – fallback state tracker that tails session logs
 *
 * Only Node.js built-in modules are used.
 */

const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PORT_RANGE_START = 23456
const PORT_RANGE_END = 23460
const HOOK_SCRIPT_NAME = 'floating-pet-hook.sh'
const PORT_FILE_NAME = 'floating-pet-port'
const SETTINGS_BACKUP_SUFFIX = '.floating-pet.bak'
const IDLE_DECAY_MS = 30_000 // auto-decay to idle after 30 s silence
const JSONL_POLL_MS = 2_000
const JSONL_MAX_BYTES = 32 * 1024
const JSONL_STALE_MS = 5 * 60 * 1000 // only look at files < 5 min old
const HOOK_PRIORITY_MS = 5_000 // JSONL yields to hook events for 5 s
const PERMISSION_TIMEOUT_MS = 25_000

const ALL_HOOK_EVENTS = [
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'PermissionRequest',
  'PreCompact',
  'Stop',
  'SubagentStop',
  'SessionStart',
  'SessionEnd',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function claudeDir() {
  return path.join(os.homedir(), '.claude')
}

function hooksDir() {
  return path.join(claudeDir(), 'hooks')
}

function hookScriptPath() {
  return path.join(hooksDir(), HOOK_SCRIPT_NAME)
}

function portFilePath() {
  return path.join(hooksDir(), PORT_FILE_NAME)
}

function settingsPath() {
  return path.join(claudeDir(), 'settings.json')
}

function settingsBackupPath() {
  return settingsPath() + SETTINGS_BACKUP_SUFFIX
}

function projectsDir() {
  return path.join(claudeDir(), 'projects')
}

/** Read a JSON file safely; return null on any failure. */
function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

/** Write a JSON file, creating parent dirs as needed. */
function writeJsonSafe(filePath, data) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
}

/** Truncate text to `max` characters, appending "…" if clipped. */
function truncate(text, max = 100) {
  if (!text) return ''
  const clean = text.replace(/[\r\n]+/g, ' ').trim()
  return clean.length <= max ? clean : clean.slice(0, max) + '…'
}

/** Generate a simple unique id (hex timestamp + random). */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ---------------------------------------------------------------------------
// 1. HTTP Hook Server
// ---------------------------------------------------------------------------

function createHttpHookServer(onStateChanged, onApprovalPrompt) {
  let server = null
  let boundPort = null
  let lastHookEventTime = 0
  let idleTimer = null
  let currentState = { state: 'idle', summary: '' }

  // Pending permission-request responses: id -> { resolve, timer }
  const pendingApprovals = new Map()

  function setState(newState) {
    currentState = { ...newState }
    lastHookEventTime = Date.now()
    onStateChanged(currentState)
    resetIdleTimer()
  }

  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer)
    if (currentState.state !== 'idle') {
      idleTimer = setTimeout(() => {
        setState({ state: 'idle', summary: '' })
      }, IDLE_DECAY_MS)
    }
  }

  function resolveApproval(id, decision) {
    const entry = pendingApprovals.get(id)
    if (!entry) return false
    clearTimeout(entry.timer)
    entry.resolve(decision)
    pendingApprovals.delete(id)
    return true
  }

  function handleEvent(body) {
    const event = body.hook_event_name
    const toolName = body.tool_name || ''
    const sessionId = body.session_id
    const cwd = body.cwd

    const base = { sessionId, cwd }

    switch (event) {
      case 'UserPromptSubmit':
        setState({ ...base, state: 'working', summary: 'Claude 正在思考……' })
        return null // 204

      case 'PreToolUse':
        if (toolName === 'AskQuestion') {
          setState({ ...base, state: 'waiting', summary: '等待你回复' })
        } else {
          setState({ ...base, state: 'working', summary: `Claude 正在调用 ${toolName}` })
        }
        return null

      case 'PostToolUse':
        if (body.tool_response && body.tool_response.is_error) {
          setState({ ...base, state: 'error', summary: `工具 ${toolName} 失败` })
        } else {
          setState({ ...base, state: 'working', summary: `工具 ${toolName} 完成` })
        }
        return null

      case 'PermissionRequest': {
        // Return a Promise — the HTTP handler will await it before responding.
        const id = uid()
        const title = toolName ? `授权调用 ${toolName}` : '权限请求'
        const detail = body.tool_input
          ? JSON.stringify(body.tool_input, null, 2)
          : undefined
        const summary = toolName
          ? `Claude 想要使用 ${toolName}`
          : '需要你的授权'

        setState({ ...base, state: 'waiting', summary: '等待你授权' })
        onApprovalPrompt({ id, title, summary, detail, toolName })

        return new Promise((resolve) => {
          const timer = setTimeout(() => {
            // Timeout — fall through to "ask" (let Claude's own UI handle it)
            pendingApprovals.delete(id)
            resolve('ask')
          }, PERMISSION_TIMEOUT_MS)

          pendingApprovals.set(id, { resolve, timer })
        })
      }

      case 'PreCompact':
        setState({ ...base, state: 'compacting', summary: '正在压缩上下文' })
        return null

      case 'Stop': {
        const preview = body.last_assistant_message
          ? truncate(body.last_assistant_message, 100)
          : '轮次完成'
        setState({ ...base, state: 'stopped', summary: preview })
        return null
      }

      case 'SubagentStop':
        setState({ ...base, state: 'working', summary: '子 Agent 已停止' })
        return null

      case 'SessionStart':
        setState({ ...base, state: 'idle', summary: '会话已启动' })
        return null

      case 'SessionEnd':
        setState({ ...base, state: 'idle', summary: '' })
        return null

      default:
        return null
    }
  }

  /** Try to bind to a port in range. Returns the port number or throws. */
  function tryListen(portStart, portEnd) {
    return new Promise((resolve, reject) => {
      let attempt = portStart

      function tryNext() {
        if (attempt > portEnd) {
          return reject(new Error(`No available port in ${portStart}-${portEnd}`))
        }

        const s = http.createServer(async (req, res) => {
          if (req.method !== 'POST' || req.url !== '/hook') {
            res.writeHead(404)
            res.end()
            return
          }

          let rawBody = ''
          req.on('data', (chunk) => { rawBody += chunk })
          req.on('end', async () => {
            let body
            try {
              body = JSON.parse(rawBody)
            } catch {
              res.writeHead(400)
              res.end('Invalid JSON')
              return
            }

            try {
              const result = handleEvent(body)

              if (result instanceof Promise) {
                // PermissionRequest — wait for user decision
                const decision = await result
                const responsePayload = {
                  hookSpecificOutput: {
                    hookEventName: 'PermissionRequest',
                    decision: { behavior: decision },
                  },
                }
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify(responsePayload))
              } else {
                // All other events — 204 No Content
                res.writeHead(204)
                res.end()
              }
            } catch (err) {
              res.writeHead(500)
              res.end(String(err))
            }
          })
        })

        s.once('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            attempt++
            tryNext()
          } else {
            reject(err)
          }
        })

        s.listen(attempt, '127.0.0.1', () => {
          server = s
          boundPort = attempt
          resolve(attempt)
        })
      }

      tryNext()
    })
  }

  return {
    async start() {
      const port = await tryListen(PORT_RANGE_START, PORT_RANGE_END)
      return port
    },

    stop() {
      if (idleTimer) clearTimeout(idleTimer)
      for (const [, entry] of pendingApprovals) {
        clearTimeout(entry.timer)
        entry.resolve('ask')
      }
      pendingApprovals.clear()
      return new Promise((resolve) => {
        if (server) {
          server.close(() => resolve())
        } else {
          resolve()
        }
      })
    },

    resolveApproval,

    getState() {
      return { ...currentState }
    },

    getPort() {
      return boundPort
    },

    getLastHookEventTime() {
      return lastHookEventTime
    },
  }
}

// ---------------------------------------------------------------------------
// 2. Hook Installer
// ---------------------------------------------------------------------------

function buildBashScript() {
  // The script reads JSON from stdin, posts it to the local HTTP server,
  // and prints the server response (only meaningful for PermissionRequest).
  // PORT is read at runtime from the port file so it survives restarts.
  const portFile = portFilePath().replace(/\\/g, '/')
  return `#!/usr/bin/env bash
# floating-pet-hook.sh — relay Claude Code hook events to TermiPet
# Auto-generated. Do not edit manually.

PORT_FILE="${portFile}"

if [ ! -f "$PORT_FILE" ]; then
  exit 0
fi

PORT=$(cat "$PORT_FILE" 2>/dev/null)
if [ -z "$PORT" ]; then
  exit 0
fi

INPUT=$(cat)
if [ -z "$INPUT" ]; then
  exit 0
fi

EVENT=$(echo "$INPUT" | grep -o '"hook_event_name"\\s*:\\s*"[^"]*"' | head -1 | sed 's/.*"hook_event_name"\\s*:\\s*"\\([^"]*\\)".*/\\1/')

if [ "$EVENT" = "PermissionRequest" ]; then
  RESPONSE=$(echo "$INPUT" | curl -s -S --max-time 30 -X POST -H "Content-Type: application/json" -d @- "http://127.0.0.1:$PORT/hook" 2>/dev/null)
  echo "$RESPONSE"
else
  echo "$INPUT" | curl -s -S --max-time 1 -X POST -H "Content-Type: application/json" -d @- "http://127.0.0.1:$PORT/hook" >/dev/null 2>&1 &
fi

exit 0
`
}

/**
 * Install hooks into ~/.claude/settings.json and write the bash relay script.
 * @param {number} port – the HTTP server port to write into the port file
 * @returns {Promise<boolean>}
 */
async function installHooks(port) {
  try {
    // Ensure hooks directory exists
    const dir = hooksDir()
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Write bash script
    fs.writeFileSync(hookScriptPath(), buildBashScript(), { encoding: 'utf8', mode: 0o755 })

    // Write port file
    fs.writeFileSync(portFilePath(), String(port), 'utf8')

    // Patch settings.json
    const sPath = settingsPath()
    let settings = readJsonSafe(sPath) || {}

    // Create backup on first install (only if backup doesn't exist yet)
    if (!fs.existsSync(settingsBackupPath())) {
      if (fs.existsSync(sPath)) {
        fs.copyFileSync(sPath, settingsBackupPath())
      }
    }

    if (!settings.hooks) {
      settings.hooks = {}
    }

    // Convert hookScriptPath to forward slashes for bash compatibility
    const scriptPathForBash = hookScriptPath().replace(/\\/g, '/')
    const command = `bash "${scriptPathForBash}"`

    for (const event of ALL_HOOK_EVENTS) {
      const entry = { type: 'command', command }

      // PreToolUse and PostToolUse need a wildcard matcher
      if (event === 'PreToolUse' || event === 'PostToolUse') {
        entry.matcher = '*'
      }

      if (!settings.hooks[event]) {
        settings.hooks[event] = []
      }

      // Remove any existing floating-pet entries to avoid duplicates
      settings.hooks[event] = settings.hooks[event].filter(
        (h) => !h.command || !h.command.includes(HOOK_SCRIPT_NAME)
      )

      settings.hooks[event].push(entry)
    }

    writeJsonSafe(sPath, settings)
    return true
  } catch (err) {
    console.error('[claudeHook] installHooks failed:', err)
    return false
  }
}

/**
 * Remove all TermiPet hook entries, the bash script, and the port file.
 * @returns {Promise<boolean>}
 */
async function uninstallHooks() {
  try {
    // Remove script and port file
    for (const f of [hookScriptPath(), portFilePath()]) {
      if (fs.existsSync(f)) fs.unlinkSync(f)
    }

    // Clean settings.json
    const sPath = settingsPath()
    const settings = readJsonSafe(sPath)
    if (settings && settings.hooks) {
      for (const event of ALL_HOOK_EVENTS) {
        if (Array.isArray(settings.hooks[event])) {
          settings.hooks[event] = settings.hooks[event].filter(
            (h) => !h.command || !h.command.includes(HOOK_SCRIPT_NAME)
          )
          if (settings.hooks[event].length === 0) {
            delete settings.hooks[event]
          }
        }
      }
      if (Object.keys(settings.hooks).length === 0) {
        delete settings.hooks
      }
      writeJsonSafe(sPath, settings)
    }

    return true
  } catch (err) {
    console.error('[claudeHook] uninstallHooks failed:', err)
    return false
  }
}

/**
 * Check whether our hooks are currently installed in settings.json.
 * @returns {Promise<boolean>}
 */
async function isHooksInstalled() {
  try {
    const settings = readJsonSafe(settingsPath())
    if (!settings || !settings.hooks) return false

    // Consider installed if at least one event has our script entry
    for (const event of ALL_HOOK_EVENTS) {
      const entries = settings.hooks[event]
      if (Array.isArray(entries)) {
        if (entries.some((h) => h.command && h.command.includes(HOOK_SCRIPT_NAME))) {
          return true
        }
      }
    }
    return false
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// 3. JSONL Session Watcher (fallback)
// ---------------------------------------------------------------------------

function createJsonlWatcher(onStateChanged, hookServer) {
  let pollTimer = null
  let lastProcessedOffset = 0
  let lastWatchedFile = null

  /**
   * Recursively find *.jsonl files under a directory, respecting depth limits.
   * Returns array of { filePath, mtime }.
   */
  function findJsonlFiles(dir, depth = 0) {
    const results = []
    if (depth > 6) return results // safety: don't recurse too deep
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          results.push(...findJsonlFiles(full, depth + 1))
        } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
          try {
            const stat = fs.statSync(full)
            if (Date.now() - stat.mtimeMs < JSONL_STALE_MS) {
              results.push({ filePath: full, mtime: stat.mtimeMs })
            }
          } catch {
            // stat failed, skip
          }
        }
      }
    } catch {
      // readdir failed, skip
    }
    return results
  }

  function poll() {
    try {
      const pDir = projectsDir()
      if (!fs.existsSync(pDir)) return

      // Find the most recently modified .jsonl file
      const files = findJsonlFiles(pDir)
      if (files.length === 0) return

      files.sort((a, b) => b.mtime - a.mtime)
      const target = files[0]

      // Skip if hook server received a recent event
      if (hookServer && Date.now() - hookServer.getLastHookEventTime() < HOOK_PRIORITY_MS) {
        return
      }

      // Read last JSONL_MAX_BYTES of the file
      const stat = fs.statSync(target.filePath)
      const readStart = Math.max(0, stat.size - JSONL_MAX_BYTES)

      // If file changed, reset offset tracking
      if (target.filePath !== lastWatchedFile) {
        lastWatchedFile = target.filePath
        lastProcessedOffset = readStart
      }

      if (stat.size <= lastProcessedOffset) return

      const fd = fs.openSync(target.filePath, 'r')
      const bufSize = stat.size - Math.max(readStart, lastProcessedOffset)
      const buf = Buffer.alloc(bufSize)
      fs.readSync(fd, buf, 0, bufSize, Math.max(readStart, lastProcessedOffset))
      fs.closeSync(fd)

      lastProcessedOffset = stat.size

      const text = buf.toString('utf8')
      const lines = text.split('\n').filter(Boolean)

      // Walk lines in order; last meaningful event wins
      let latestState = null

      for (const line of lines) {
        let obj
        try {
          obj = JSON.parse(line)
        } catch {
          continue
        }

        if (obj.type === 'user' && obj.message && obj.message.role === 'user') {
          latestState = { state: 'working', summary: 'Claude 正在思考……' }
          continue
        }

        if (obj.type === 'assistant' && obj.message) {
          const msg = obj.message
          const content = Array.isArray(msg.content) ? msg.content : []

          // Check for tool_use
          const toolUse = content.find((c) => c.type === 'tool_use')
          if (toolUse) {
            latestState = { state: 'working', summary: `调用 ${toolUse.name}` }
            continue
          }

          // Check for thinking
          const thinking = content.find((c) => c.type === 'thinking')
          if (thinking) {
            latestState = { state: 'working', summary: '思考中' }
            continue
          }

          // Check for end_turn with text
          if (msg.stop_reason === 'end_turn') {
            const textBlock = content.find((c) => c.type === 'text')
            if (textBlock && textBlock.text) {
              latestState = { state: 'stopped', summary: truncate(textBlock.text, 100) }
            } else {
              latestState = { state: 'stopped', summary: '轮次完成' }
            }
            continue
          }
        }

        // tool_result with error
        if (obj.type === 'tool_result' || (obj.tool_result && obj.is_error)) {
          if (obj.is_error) {
            latestState = { state: 'error', summary: '工具执行出错' }
          }
          continue
        }
      }

      if (latestState) {
        onStateChanged(latestState)
      }
    } catch (err) {
      // Silently ignore — this is a best-effort fallback
      console.error('[claudeHook] JSONL poll error:', err.message)
    }
  }

  return {
    start() {
      if (pollTimer) return
      pollTimer = setInterval(poll, JSONL_POLL_MS)
      // Run once immediately
      poll()
    },

    stop() {
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create the complete Claude Hook system.
 *
 * @param {(state: {state: string, summary: string, sessionId?: string, cwd?: string}) => void} onStateChanged
 * @param {(prompt: {id: string, title: string, summary: string, detail?: string, toolName?: string}) => void} onApprovalPrompt
 * @returns {{
 *   start: () => Promise<void>,
 *   stop: () => Promise<void>,
 *   resolveApproval: (id: string, decision: string) => boolean,
 *   getState: () => {state: string, summary: string}
 * }}
 */
function createClaudeHook(onStateChanged, onApprovalPrompt) {
  const hookServer = createHttpHookServer(onStateChanged, onApprovalPrompt)
  const jsonlWatcher = createJsonlWatcher(onStateChanged, hookServer)

  return {
    async start() {
      const port = await hookServer.start()
      console.log(`[claudeHook] HTTP server listening on 127.0.0.1:${port}`)

      // Write port file so existing hook scripts can find us
      try {
        const dir = hooksDir()
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(portFilePath(), String(port), 'utf8')
      } catch (err) {
        console.error('[claudeHook] Failed to write port file:', err.message)
      }

      // Start JSONL watcher as fallback
      jsonlWatcher.start()
    },

    async stop() {
      jsonlWatcher.stop()
      await hookServer.stop()
    },

    resolveApproval(id, decision) {
      return hookServer.resolveApproval(id, decision)
    },

    getState() {
      return hookServer.getState()
    },
  }
}

module.exports = {
  createClaudeHook,
  installHooks,
  uninstallHooks,
  isHooksInstalled,
}

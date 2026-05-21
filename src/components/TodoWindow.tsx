import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { Todo, Project, TodoSubtask } from '../types/pet'

type ViewMode = 'list' | 'board' | 'calendar'
type SmartView = 'all' | 'today' | 'upcoming' | 'inbox' | 'repeat'

const DEFAULT_PROJECT: Project = {
  id: 'inbox',
  name: '收集箱',
  color: '#94a3b8',
  createdAt: 0,
}

const PREVIEW_PROJECTS: Project[] = [
  DEFAULT_PROJECT,
  { id: 'work', name: '工作', color: '#635bff', createdAt: 1 },
  { id: 'life', name: '生活', color: '#22c55e', createdAt: 2 },
  { id: 'study', name: '学习', color: '#f97316', createdAt: 3 },
]

const PROJECT_COLORS = ['#635bff', '#22c55e', '#f97316', '#0ea5e9', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b']

const BOARD_COLUMNS: Array<{ id: NonNullable<Todo['status']>; title: string }> = [
  { id: 'backlog', title: '待安排' },
  { id: 'in_progress', title: '进行中' },
  { id: 'waiting', title: '等待' },
  { id: 'done', title: '已完成' },
]

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function nowLocalInputValue() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function toLocalInputValue(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function formatDateTime(value?: string) {
  if (!value) return '未安排'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isSameDay(value?: string, compare = new Date()) {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
    && date.getFullYear() === compare.getFullYear()
    && date.getMonth() === compare.getMonth()
    && date.getDate() === compare.getDate()
}

function isUpcoming(value?: string) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  const week = new Date()
  week.setDate(now.getDate() + 7)
  return date >= now && date <= week
}

function createBlankTodo(projectId: string): Todo {
  return {
    id: generateId(),
    title: '',
    done: false,
    projectId,
    createdAt: Date.now(),
    priority: 'medium',
    status: 'backlog',
    repeatRule: 'none',
    estimatedMinutes: 30,
    subtasks: [],
  }
}

function createPreviewTodos(): Todo[] {
  const now = new Date()
  const at = (hour: number, minute = 0, dayOffset = 0) => {
    const date = new Date(now)
    date.setDate(now.getDate() + dayOffset)
    date.setHours(hour, minute, 0, 0)
    return date.toISOString()
  }

  return [
    {
      id: 'preview-prototype',
      title: '交产品原型修改稿',
      done: false,
      projectId: 'work',
      createdAt: Date.now() - 120000,
      dueDate: at(15, 0),
      reminderAt: at(14, 30),
      note: '需要对齐最新功能工作台方向，整理给开发使用的交互稿。',
      priority: 'high',
      status: 'in_progress',
      repeatRule: 'none',
      estimatedMinutes: 45,
      subtasks: [
        { id: 'sub-scope', title: '确认修改范围', done: true },
        { id: 'sub-layout', title: '调整主界面布局', done: false },
        { id: 'sub-states', title: '补充交互状态', done: false },
      ],
    },
    {
      id: 'preview-medicine',
      title: '给妈妈买药',
      done: false,
      projectId: 'life',
      createdAt: Date.now() - 90000,
      dueDate: at(20, 0),
      note: '路过药店时提醒。',
      priority: 'medium',
      status: 'backlog',
      repeatRule: 'none',
      estimatedMinutes: 20,
      subtasks: [],
    },
    {
      id: 'preview-research',
      title: '阅读 AI 助手竞品资料',
      done: false,
      projectId: 'study',
      createdAt: Date.now() - 80000,
      note: '重点看 Todoist、TickTick、Microsoft To Do 的任务组织方式。',
      priority: 'medium',
      status: 'backlog',
      repeatRule: 'none',
      estimatedMinutes: 40,
      subtasks: [],
    },
    {
      id: 'preview-weekly',
      title: '写周报',
      done: false,
      projectId: 'work',
      createdAt: Date.now() - 70000,
      dueDate: at(16, 0, 2),
      priority: 'medium',
      status: 'waiting',
      repeatRule: 'weekly',
      estimatedMinutes: 30,
      subtasks: [],
    },
    {
      id: 'preview-done',
      title: '确认修改范围',
      done: true,
      projectId: 'work',
      createdAt: Date.now() - 200000,
      completedAt: Date.now() - 60000,
      priority: 'low',
      status: 'done',
      repeatRule: 'none',
      estimatedMinutes: 15,
      subtasks: [],
    },
  ]
}

function normalizeTodo(todo: Todo): Todo {
  const base = {
    priority: 'medium' as const,
    status: (todo.done ? 'done' : 'backlog') as Todo['status'],
    repeatRule: 'none' as const,
    estimatedMinutes: 30,
    subtasks: [] as Todo['subtasks'],
    ...todo,
  }
  // status 是唯一真值源，done 从 status 派生
  base.done = base.status === 'done'
  return base
}

function priorityLabel(priority?: Todo['priority']) {
  if (priority === 'high') return '高'
  if (priority === 'low') return '低'
  return '中'
}

function repeatLabel(rule?: Todo['repeatRule']) {
  if (rule === 'daily') return '每天'
  if (rule === 'weekly') return '每周'
  if (rule === 'monthly') return '每月'
  return '不重复'
}

// --- Repeat task: compute next due date ---
function computeNextDueDate(dueDate: string | undefined, rule: Todo['repeatRule']): string | undefined {
  if (!dueDate || !rule || rule === 'none') return undefined
  const date = new Date(dueDate)
  if (Number.isNaN(date.getTime())) return undefined
  if (rule === 'daily') date.setDate(date.getDate() + 1)
  else if (rule === 'weekly') date.setDate(date.getDate() + 7)
  else if (rule === 'monthly') date.setMonth(date.getMonth() + 1)
  return date.toISOString()
}

// --- Natural language parsing ---
function parseNaturalLanguage(input: string): Partial<Todo> & { cleanTitle: string } {
  let text = input

  const projectMatch = text.match(/#([^\s]+)/)
  const projectTag = projectMatch?.[1]
  text = text.replace(/#[^\s]+/g, '')

  const tagMatches = text.match(/@([^\s]+)/g)
  const tags = tagMatches?.map(t => t.slice(1)) || []
  text = text.replace(/@[^\s]+/g, '')

  let priority: Todo['priority'] = 'medium'
  if (/!高/.test(text)) priority = 'high'
  else if (/!低/.test(text)) priority = 'low'
  text = text.replace(/![高中低]/g, '')

  let repeatRule: Todo['repeatRule'] = 'none'
  if (/每天|每日/.test(text)) { repeatRule = 'daily'; text = text.replace(/每天|每日/g, '') }
  else if (/每周/.test(text)) { repeatRule = 'weekly'; text = text.replace(/每周[一二三四五六日]?/g, '') }
  else if (/每月/.test(text)) { repeatRule = 'monthly'; text = text.replace(/每月/g, '') }

  let dueDate: string | undefined
  let reminderAt: string | undefined
  const now = new Date()

  const cnNumMap: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12 }
  const cnToNum = (s: string): number => cnNumMap[s] ?? parseInt(s, 10)

  const timeMatch = text.match(/(?:下午|晚上|上午|早上)?(\d{1,2}|十一|十二|[一二两三四五六七八九十])[：:点](\d{0,2})/)
    || text.match(/(下午|晚上|上午|早上)(十一|十二|[一二两三四五六七八九十]|\d{1,2})[点時时](?:(\d{1,2}|半)分?)?/)
  let hour: number | null = null
  let minute = 0
  if (timeMatch) {
    const raw1 = timeMatch[1]
    const raw2 = timeMatch[2]
    if (/下午|晚上|上午|早上/.test(raw1)) {
      hour = cnToNum(raw2 || '0')
      minute = timeMatch[3] === '半' ? 30 : timeMatch[3] ? parseInt(timeMatch[3], 10) : 0
      if (/下午|晚上/.test(raw1) && hour < 12) hour += 12
    } else {
      hour = cnToNum(raw1)
      minute = raw2 ? parseInt(raw2, 10) : 0
      const prefix = timeMatch[0]
      if (/下午|晚上/.test(prefix) && hour < 12) hour += 12
    }
    text = text.replace(timeMatch[0], '')
  }

  if (/今天|今晚|今早/.test(text)) {
    const d = new Date(now)
    if (hour !== null) { d.setHours(hour, minute, 0, 0) } else { d.setHours(23, 59, 0, 0) }
    dueDate = d.toISOString()
    text = text.replace(/今天|今晚|今早/g, '')
  } else if (/明天|明早|明晚/.test(text)) {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    if (hour !== null) { d.setHours(hour, minute, 0, 0) } else { d.setHours(23, 59, 0, 0) }
    dueDate = d.toISOString()
    text = text.replace(/明天|明早|明晚/g, '')
  } else if (/后天/.test(text)) {
    const d = new Date(now)
    d.setDate(d.getDate() + 2)
    if (hour !== null) { d.setHours(hour, minute, 0, 0) } else { d.setHours(23, 59, 0, 0) }
    dueDate = d.toISOString()
    text = text.replace(/后天/g, '')
  } else if (/下?周([一二三四五六日天])/.test(text)) {
    const dayMap: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 }
    const match = text.match(/下?周([一二三四五六日天])/)!
    const isNext = text.includes('下周')
    const targetDay = dayMap[match[1]]
    const d = new Date(now)
    let diff = targetDay - d.getDay()
    if (diff <= 0 || isNext) diff += 7
    if (isNext && diff <= 7) diff += 7
    d.setDate(d.getDate() + diff)
    if (hour !== null) { d.setHours(hour, minute, 0, 0) } else { d.setHours(23, 59, 0, 0) }
    dueDate = d.toISOString()
    text = text.replace(/下?周[一二三四五六日天]/g, '')
  } else if (/(\d{1,2})[月/](\d{1,2})[日号]?/.test(text)) {
    const absMatch = text.match(/(\d{1,2})[月/](\d{1,2})[日号]?/)!
    const d = new Date(now.getFullYear(), parseInt(absMatch[1], 10) - 1, parseInt(absMatch[2], 10))
    if (d.getTime() < now.getTime()) d.setFullYear(d.getFullYear() + 1)
    if (hour !== null) { d.setHours(hour, minute, 0, 0) } else { d.setHours(23, 59, 0, 0) }
    dueDate = d.toISOString()
    text = text.replace(absMatch[0], '')
  } else if (/(\d{1,2})[日号]/.test(text)) {
    const dayMatch = text.match(/(\d{1,2})[日号]/)!
    const d = new Date(now.getFullYear(), now.getMonth(), parseInt(dayMatch[1], 10))
    if (d.getTime() < now.getTime()) d.setMonth(d.getMonth() + 1)
    if (hour !== null) { d.setHours(hour, minute, 0, 0) } else { d.setHours(23, 59, 0, 0) }
    dueDate = d.toISOString()
    text = text.replace(dayMatch[0], '')
  } else if (hour !== null) {
    const d = new Date(now)
    d.setHours(hour, minute, 0, 0)
    if (d.getTime() < now.getTime()) d.setDate(d.getDate() + 1)
    dueDate = d.toISOString()
  }

  if (/提醒/.test(text)) {
    reminderAt = dueDate
    text = text.replace(/提醒我?/g, '')
  }

  const cleanTitle = text.replace(/\s+/g, ' ').trim()

  return { cleanTitle, priority, repeatRule, dueDate, reminderAt, projectId: projectTag, tags: tags.length ? tags : undefined }
}

// --- AI task decomposition templates ---
function generateSubtasks(title: string): TodoSubtask[] {
  const lower = title.toLowerCase()
  if (/报告|报表|文档|方案/.test(lower)) {
    return [
      { id: generateId(), title: '收集相关资料', done: false },
      { id: generateId(), title: '整理大纲', done: false },
      { id: generateId(), title: '撰写初稿', done: false },
      { id: generateId(), title: '检查修改', done: false },
    ]
  }
  if (/会议|复盘|讨论|评审/.test(lower)) {
    return [
      { id: generateId(), title: '准备议题清单', done: false },
      { id: generateId(), title: '整理相关数据', done: false },
      { id: generateId(), title: '发送会议邀请', done: false },
      { id: generateId(), title: '会后整理纪要', done: false },
    ]
  }
  if (/设计|原型|UI|界面/.test(lower)) {
    return [
      { id: generateId(), title: '确认需求范围', done: false },
      { id: generateId(), title: '完成线框图', done: false },
      { id: generateId(), title: '设计高保真稿', done: false },
      { id: generateId(), title: '标注交付给开发', done: false },
    ]
  }
  if (/开发|实现|功能|代码|bug|修复/.test(lower)) {
    return [
      { id: generateId(), title: '分析需求/问题', done: false },
      { id: generateId(), title: '编写代码', done: false },
      { id: generateId(), title: '自测验证', done: false },
      { id: generateId(), title: '提交代码审查', done: false },
    ]
  }
  if (/学习|阅读|研究|调研/.test(lower)) {
    return [
      { id: generateId(), title: '收集学习资料', done: false },
      { id: generateId(), title: '阅读核心内容', done: false },
      { id: generateId(), title: '做笔记总结', done: false },
    ]
  }
  if (/购买|买|采购/.test(lower)) {
    return [
      { id: generateId(), title: '确认购买清单', done: false },
      { id: generateId(), title: '比较价格和渠道', done: false },
      { id: generateId(), title: '完成购买', done: false },
    ]
  }
  return [
    { id: generateId(), title: '明确目标和范围', done: false },
    { id: generateId(), title: '执行主要工作', done: false },
    { id: generateId(), title: '检查和收尾', done: false },
  ]
}

// --- Today's plan recommendation ---
function getRecommendedTodos(todos: Todo[]): Array<{ todo: Todo; reason: string }> {
  const candidates = todos
    .filter(t => !t.done)
    .map(t => normalizeTodo(t))

  const scored = candidates.map(todo => {
    let score = 0
    let reason = ''

    if (todo.dueDate) {
      const due = new Date(todo.dueDate)
      const hoursLeft = (due.getTime() - Date.now()) / (1000 * 60 * 60)
      if (hoursLeft < 0) { score += 100; reason = '已逾期' }
      else if (hoursLeft < 4) { score += 80; reason = `${Math.ceil(hoursLeft)} 小时后截止` }
      else if (hoursLeft < 24) { score += 60; reason = '今天截止' }
      else if (hoursLeft < 48) { score += 30; reason = '明天截止' }
    }

    if (todo.priority === 'high') { score += 40; if (!reason) reason = '高优先级' }
    else if (todo.priority === 'low') score -= 10

    if (todo.status === 'in_progress') { score += 20; if (!reason) reason = '进行中' }

    const est = todo.estimatedMinutes || 30
    if (est <= 15) { score += 15; if (!reason) reason = `仅需 ${est} 分钟` }

    if (!reason) reason = '建议今天处理'

    return { todo, score, reason }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ todo, reason }) => ({ todo, reason }))
}

export function TodoWindow() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [projects, setProjects] = useState<Project[]>([DEFAULT_PROJECT])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [smartView, setSmartView] = useState<SmartView | null>('today')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [quickInput, setQuickInput] = useState('')
  const [editingTodo, _setEditingTodo] = useState<Todo | null>(null)
  const [editingDirty, setEditingDirty] = useState(false)
  const openEditor = (todo: Todo | null) => {
    _setEditingTodo(todo)
    setEditingDirty(false)
  }
  const markDirty = () => setEditingDirty(true)
  const closeEditor = () => {
    if (editingTodo && editingDirty) {
      if (!window.confirm('有未保存的修改，确定关闭？')) return
    }
    _setEditingTodo(null)
    setEditingDirty(false)
  }
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingProjectName, setEditingProjectName] = useState('')
  const [projectMenuId, setProjectMenuId] = useState<string | null>(null)
  const [dragTodoId, setDragTodoId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [calendarScheduling, setCalendarScheduling] = useState<string | null>(null)
  const [calendarWeekOffset, setCalendarWeekOffset] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = (message: string, undo?: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, undo })
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }
  const dismissToast = () => { if (toastTimer.current) clearTimeout(toastTimer.current); setToast(null) }
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const usingPreviewStore = !window.electronAPI

  const projectList = useMemo(() => {
    const merged = projects.some(p => p.id === 'inbox') ? projects : [DEFAULT_PROJECT, ...projects]
    return merged.map(p => p.id === 'inbox' && /�|鏀/.test(p.name) ? DEFAULT_PROJECT : p)
  }, [projects])

  const initialLoadDone = useRef(false)
  const loadData = useCallback(async () => {
    const api = window.electronAPI
    if (!api) {
      const storedTodos = window.localStorage.getItem('termipet-preview-todos')
      const storedProjects = window.localStorage.getItem('termipet-preview-projects')
      const previewTodos = storedTodos ? JSON.parse(storedTodos) as Todo[] : createPreviewTodos()
      const previewProjects = storedProjects ? JSON.parse(storedProjects) as Project[] : PREVIEW_PROJECTS
      if (!storedTodos) window.localStorage.setItem('termipet-preview-todos', JSON.stringify(previewTodos))
      if (!storedProjects) window.localStorage.setItem('termipet-preview-projects', JSON.stringify(previewProjects))
      setTodos(previewTodos.map(normalizeTodo))
      setProjects(previewProjects)
      if (!initialLoadDone.current && previewTodos[0]) { setSelectedTodoId(previewTodos[0].id); initialLoadDone.current = true }
      return
    }
    const [loadedTodos, loadedProjects] = await Promise.all([api.getTodos(), api.getProjects()])
    const normalizedTodos = (loadedTodos || []).map(normalizeTodo)
    setTodos(normalizedTodos)
    setProjects(loadedProjects?.length ? loadedProjects : [DEFAULT_PROJECT])
    if (!initialLoadDone.current && normalizedTodos[0]) { setSelectedTodoId(normalizedTodos[0].id); initialLoadDone.current = true }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const cleanup = window.electronAPI?.onStartNewTodo?.(() => {
      openEditor(createBlankTodo(selectedProjectId || 'inbox'))
    })
    return () => { cleanup?.() }
  }, [selectedProjectId])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setIsRecording(false)
        setRecordingTime(0)
        setIsTranscribing(true)

        const buffer = await blob.arrayBuffer()
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
        const result = await window.electronAPI?.transcribeAudio?.(base64)
        setIsTranscribing(false)

        if (result && 'text' in result && result.text) {
          setQuickInput(result.text)
        } else if (result && 'error' in result) {
          setValidationHint(`语音识别失败: ${result.error}`)
          setTimeout(() => setValidationHint(''), 3000)
        }
      }

      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000)
    } catch {
      setIsRecording(false)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  useEffect(() => {
    const cleanup = window.electronAPI?.onStartVoiceTodo?.(() => {
      startRecording()
    })
    return () => { cleanup?.() }
  }, [startRecording])

  const selectedTodo = todos.find(t => t.id === selectedTodoId) || null

  const filteredTodos = useMemo(() => {
    let result = todos.map(normalizeTodo)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(t => t.title.toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q))
    }
    if (selectedProjectId) result = result.filter(t => t.projectId === selectedProjectId)
    if (smartView === 'all') result = result.filter(t => !t.done)
    else if (smartView === 'today') result = result.filter(t => !t.done && (isSameDay(t.dueDate) || t.status === 'in_progress'))
    else if (smartView === 'upcoming') result = result.filter(t => !t.done && isUpcoming(t.dueDate))
    else if (smartView === 'inbox') result = result.filter(t => t.projectId === 'inbox')
    else if (smartView === 'repeat') result = result.filter(t => t.repeatRule && t.repeatRule !== 'none')
    return result.sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 }
      const priorityDiff = rank[a.priority || 'medium'] - rank[b.priority || 'medium']
      if (priorityDiff !== 0) return priorityDiff
      return new Date(a.dueDate || '9999-12-31').getTime() - new Date(b.dueDate || '9999-12-31').getTime()
    })
  }, [todos, selectedProjectId, smartView, viewMode, searchQuery])

  const activeCount = todos.filter(t => !t.done).length
  const highCount = todos.filter(t => !t.done && t.priority === 'high').length
  const overdueCount = todos.filter(t => !t.done && t.dueDate && new Date(t.dueDate).getTime() < Date.now()).length

  const getProjectName = (id?: string) => projectList.find(p => p.id === id)?.name || '收集箱'
  const getProjectColor = (id?: string) => projectList.find(p => p.id === id)?.color || DEFAULT_PROJECT.color

  const createNextRepeat = async (todo: Todo) => {
    if (!todo.repeatRule || todo.repeatRule === 'none') return
    const nextDue = computeNextDueDate(todo.dueDate, todo.repeatRule)
    const nextReminder = computeNextDueDate(todo.reminderAt, todo.repeatRule)
    const nextTodo: Todo = {
      ...todo,
      id: generateId(),
      done: false,
      status: 'backlog',
      notified: false,
      completedAt: undefined,
      createdAt: Date.now(),
      dueDate: nextDue,
      reminderAt: nextReminder,
      subtasks: (todo.subtasks || []).map(s => ({ ...s, done: false })),
    }
    await saveTodoSilent(nextTodo)
    showToast(`已创建下一轮：${todo.title} — 截止 ${nextDue ? formatDateTime(nextDue) : '未设'}`)
  }

  const saveTodo = async (todo: Todo) => {
    const oldTodo = todos.find(t => t.id === todo.id)
    const normalized = normalizeTodo({
      ...todo,
      title: todo.title.trim(),
      done: todo.status === 'done',
      updatedAt: Date.now(),
    })
    if (!normalized.title) { window.alert('请输入任务标题'); return }
    if (usingPreviewStore) {
      const nextTodos = todos.some(t => t.id === normalized.id)
        ? todos.map(t => t.id === normalized.id ? normalized : t)
        : [...todos, normalized]
      window.localStorage.setItem('termipet-preview-todos', JSON.stringify(nextTodos))
      setTodos(nextTodos)
    } else {
      await window.electronAPI?.saveTodo(normalized)
    }
    setSelectedTodoId(normalized.id)
    if (!usingPreviewStore) loadData()

    if (normalized.done && oldTodo && !oldTodo.done) {
      await createNextRepeat(normalized)
    }
  }

  const saveTodoSilent = async (todo: Todo) => {
    const normalized = normalizeTodo({ ...todo, updatedAt: Date.now() })
    if (!normalized.title) return
    if (usingPreviewStore) {
      const nextTodos = todos.some(t => t.id === normalized.id)
        ? todos.map(t => t.id === normalized.id ? normalized : t)
        : [...todos, normalized]
      window.localStorage.setItem('termipet-preview-todos', JSON.stringify(nextTodos))
      setTodos(nextTodos)
    } else {
      await window.electronAPI?.saveTodo(normalized)
      loadData()
    }
  }

  const [validationHint, setValidationHint] = useState('')

  const nlpPreview = useMemo(() => {
    if (!quickInput.trim()) return null
    const parsed = parseNaturalLanguage(quickInput)
    if (!parsed.cleanTitle) return null
    const previewTags: string[] = []
    if (parsed.dueDate) previewTags.push(`📅 ${formatDateTime(parsed.dueDate)}`)
    if (parsed.priority && parsed.priority !== 'medium') previewTags.push(parsed.priority === 'high' ? '🔴 高优先级' : '🔵 低优先级')
    if (parsed.projectId) previewTags.push(`📂 ${parsed.projectId}`)
    if (parsed.repeatRule && parsed.repeatRule !== 'none') {
      const labels: Record<string, string> = { daily: '每天', weekly: '每周', monthly: '每月' }
      previewTags.push(`🔁 ${labels[parsed.repeatRule] || parsed.repeatRule}`)
    }
    if (parsed.tags?.length) parsed.tags.forEach(t => previewTags.push(`🏷️ ${t}`))
    return previewTags.length > 0 ? { title: parsed.cleanTitle, tags: previewTags } : null
  }, [quickInput])
  const handleQuickAdd = async () => {
    if (!quickInput.trim()) { setValidationHint('请输入任务内容'); setTimeout(() => setValidationHint(''), 2000); return }
    const parsed = parseNaturalLanguage(quickInput)
    if (!parsed.cleanTitle) { setValidationHint('无法解析任务内容'); setTimeout(() => setValidationHint(''), 2000); return }
    const project = parsed.projectId
      ? projectList.find(p => p.name === parsed.projectId)
        || projectList.find(p => p.name.includes(parsed.projectId!))
        || projectList.find(p => p.id === selectedProjectId) || DEFAULT_PROJECT
      : projectList.find(p => p.id === selectedProjectId) || DEFAULT_PROJECT
    const todo: Todo = {
      ...createBlankTodo(project.id),
      title: parsed.cleanTitle,
      priority: parsed.priority,
      dueDate: parsed.dueDate,
      reminderAt: parsed.reminderAt,
      repeatRule: parsed.repeatRule,
      tags: parsed.tags,
    }
    await saveTodo(todo)
    setQuickInput('')
    showToast(`已添加「${parsed.cleanTitle}」到 ${project.name}`)
  }

  const handleToggleDone = async (todo: Todo) => {
    const nowDone = !todo.done
    await saveTodo({
      ...todo,
      done: nowDone,
      status: nowDone ? 'done' : 'backlog',
      completedAt: nowDone ? Date.now() : undefined,
      notified: nowDone ? true : false,
    })
  }

  const handleDeleteTodo = async (id: string) => {
    const deleted = todos.find(t => t.id === id)
    if (!deleted) return
    if (usingPreviewStore) {
      const nextTodos = todos.filter(t => t.id !== id)
      window.localStorage.setItem('termipet-preview-todos', JSON.stringify(nextTodos))
      setTodos(nextTodos)
    } else {
      await window.electronAPI?.deleteTodo(id)
    }
    if (selectedTodoId === id) setSelectedTodoId(null)
    if (!usingPreviewStore) loadData()
    showToast(`已删除「${deleted.title}」`, () => {
      saveTodoSilent(deleted)
    })
  }

  const handleAddProject = async () => {
    if (!newProjectName.trim()) return
    const project: Project = {
      id: generateId(),
      name: newProjectName.trim(),
      color: PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
      createdAt: Date.now(),
    }
    if (usingPreviewStore) {
      const nextProjects = [...projectList, project]
      window.localStorage.setItem('termipet-preview-projects', JSON.stringify(nextProjects))
      setProjects(nextProjects)
    } else {
      await window.electronAPI?.saveProject(project)
    }
    setNewProjectName('')
    setShowProjectForm(false)
    if (!usingPreviewStore) loadData()
  }

  const handleRenameProject = async (id: string, name: string) => {
    if (!name.trim() || id === 'inbox') { setEditingProjectId(null); return }
    const project = projectList.find(p => p.id === id)
    if (!project) return
    const updated = { ...project, name: name.trim() }
    if (usingPreviewStore) {
      const nextProjects = projectList.map(p => p.id === id ? updated : p)
      window.localStorage.setItem('termipet-preview-projects', JSON.stringify(nextProjects))
      setProjects(nextProjects)
    } else {
      await window.electronAPI?.saveProject(updated)
      loadData()
    }
    setEditingProjectId(null)
  }

  const handleChangeProjectColor = async (id: string, color: string) => {
    const project = projectList.find(p => p.id === id)
    if (!project) return
    const updated = { ...project, color }
    if (usingPreviewStore) {
      const nextProjects = projectList.map(p => p.id === id ? updated : p)
      window.localStorage.setItem('termipet-preview-projects', JSON.stringify(nextProjects))
      setProjects(nextProjects)
    } else {
      await window.electronAPI?.saveProject(updated)
      loadData()
    }
  }

  const handleDeleteProject = async (id: string) => {
    if (id === 'inbox') return
    const count = todos.filter(t => t.projectId === id).length
    if (!window.confirm(`删除此项目？${count > 0 ? `其中 ${count} 个任务将移到收集箱。` : ''}`)) return
    if (usingPreviewStore) {
      const nextProjects = projectList.filter(p => p.id !== id)
      const nextTodos = todos.map(t => t.projectId === id ? { ...t, projectId: 'inbox' } : t)
      window.localStorage.setItem('termipet-preview-projects', JSON.stringify(nextProjects))
      window.localStorage.setItem('termipet-preview-todos', JSON.stringify(nextTodos))
      setProjects(nextProjects)
      setTodos(nextTodos)
    } else {
      await window.electronAPI?.deleteProject(id)
    }
    if (selectedProjectId === id) setSelectedProjectId(null)
    if (!usingPreviewStore) loadData()
  }

  const handleToggleDetailSubtask = async (subtaskId: string) => {
    if (!selectedTodo) return
    const updatedSubtasks = (selectedTodo.subtasks || []).map(s =>
      s.id === subtaskId ? { ...s, done: !s.done } : s
    )
    await saveTodo({ ...selectedTodo, subtasks: updatedSubtasks })
  }

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!editingTodo) return
    _setEditingTodo({
      ...editingTodo,
      subtasks: (editingTodo.subtasks || []).filter(s => s.id !== subtaskId),
    })
    markDirty()
  }

  const seedSampleData = async () => {
    if (todos.length > 0 && !window.confirm('加载示例数据将覆盖当前内容，确定继续？')) return
    const sampleProjects = PREVIEW_PROJECTS.filter(project => project.id !== 'inbox')
    const sampleTodos = createPreviewTodos()

    if (usingPreviewStore) {
      window.localStorage.setItem('termipet-preview-projects', JSON.stringify(PREVIEW_PROJECTS))
      window.localStorage.setItem('termipet-preview-todos', JSON.stringify(sampleTodos))
      setProjects(PREVIEW_PROJECTS)
      setTodos(sampleTodos.map(normalizeTodo))
      setSelectedTodoId(sampleTodos[0]?.id || null)
      return
    }

    for (const project of sampleProjects) {
      await window.electronAPI?.saveProject(project)
    }
    for (const todo of sampleTodos) {
      await window.electronAPI?.saveTodo(todo)
    }
    setSelectedTodoId(sampleTodos[0]?.id || null)
    loadData()
  }

  const updateSubtask = (id: string, patch: Partial<TodoSubtask>) => {
    if (!editingTodo) return
    _setEditingTodo({
      ...editingTodo,
      subtasks: (editingTodo.subtasks || []).map(item => item.id === id ? { ...item, ...patch } : item),
    })
    markDirty()
  }

  // --- Kanban drag-and-drop ---
  const handleDragStart = (e: React.DragEvent, todoId: string) => {
    setDragTodoId(todoId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', todoId)
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = async (e: React.DragEvent, columnId: NonNullable<Todo['status']>) => {
    e.preventDefault()
    setDragOverColumn(null)
    const todoId = dragTodoId || e.dataTransfer.getData('text/plain')
    if (!todoId) return
    setDragTodoId(null)

    const todo = todos.find(t => t.id === todoId)
    if (!todo) return

    const isDone = columnId === 'done'
    const wasDone = todo.done

    if (isDone && !wasDone) {
      await handleToggleDone(todo)
    } else if (!isDone && wasDone) {
      await saveTodo({ ...todo, done: false, status: columnId, completedAt: undefined })
    } else {
      await saveTodo({ ...todo, status: columnId })
    }
  }

  const handleDragEnd = () => {
    setDragTodoId(null)
    setDragOverColumn(null)
  }

  // --- Calendar: schedule a task ---
  const handleScheduleToDate = async (todoId: string, date: Date, hour: number) => {
    const todo = todos.find(t => t.id === todoId)
    if (!todo) return
    const d = new Date(date)
    d.setHours(hour, 0, 0, 0)
    await saveTodo({ ...todo, dueDate: d.toISOString() })
    setCalendarScheduling(null)
  }

  const handleAiDecompose = async (todo: Todo, openEditorAfter = true) => {
    if ((todo.subtasks || []).length > 0) {
      if (!window.confirm(`当前有 ${todo.subtasks!.length} 个子任务，拆解将覆盖，是否继续？`)) return
    }
    const subtasks = generateSubtasks(todo.title)
    if (openEditorAfter) {
      openEditor({ ...todo, subtasks })
    } else {
      await saveTodoSilent({ ...todo, subtasks })
    }
  }

  const recommendations = useMemo(() => getRecommendedTodos(todos), [todos])

  const renderTaskCard = (todo: Todo, compact = false, draggable = false) => (
    <div
      key={todo.id}
      className={`todo-work-card priority-${todo.priority || 'medium'} ${selectedTodoId === todo.id ? 'selected' : ''} ${dragTodoId === todo.id ? 'dragging' : ''}`}
      onClick={() => setSelectedTodoId(todo.id)}
      draggable={draggable}
      onDragStart={draggable ? (e) => handleDragStart(e, todo.id) : undefined}
      onDragEnd={draggable ? handleDragEnd : undefined}
    >
      <button className="todo-check" onClick={e => { e.stopPropagation(); handleToggleDone(todo) }}>
        {todo.done ? '✓' : ''}
      </button>
      <div className="todo-card-body">
        <div className="todo-card-title">{todo.title}</div>
        <div className="todo-card-meta">
          <span>{formatDateTime(todo.dueDate)}</span>
          <span>{getProjectName(todo.projectId)}</span>
          <span>{priorityLabel(todo.priority)}</span>
          {!compact && <span>{todo.estimatedMinutes || 30} 分钟</span>}
        </div>
        {todo.tags && todo.tags.length > 0 && (
          <div className="todo-card-tags">
            {todo.tags.map(tag => <span key={tag} className="todo-tag">{tag}</span>)}
          </div>
        )}
        {!compact && (
          <div className="todo-progress-track">
            <div
              className="todo-progress-fill"
              style={{ width: `${Math.min(100, ((todo.subtasks || []).filter(s => s.done).length / Math.max(1, (todo.subtasks || []).length)) * 100)}%` }}
            />
          </div>
        )}
      </div>
      <div className={`todo-card-actions ${compact ? 'compact' : ''}`}>
        <button onClick={e => { e.stopPropagation(); openEditor(todo) }}>编辑</button>
        <button onClick={e => { e.stopPropagation(); handleAiDecompose(todo) }}>拆解</button>
      </div>
    </div>
  )

  const renderListView = () => {
    const undone = filteredTodos.filter(t => !t.done)
    const done = filteredTodos.filter(t => t.done)
    const topId = recommendations[0]?.todo.id
    const top = undone.find(t => t.id === topId)
    const rest = undone.filter(t => t.id !== topId)
    return (
      <div className="todo-list-workspace">
        {top && <div className="todo-section-label">现在优先</div>}
        {top && renderTaskCard(top)}
        {rest.length > 0 && <div className="todo-section-label">其他待办</div>}
        {rest.map(t => renderTaskCard(t))}
        {done.length > 0 && <div className="todo-section-label">已完成</div>}
        {done.map(t => renderTaskCard(t, true))}
        {filteredTodos.length === 0 && (
          <div className="todo-empty-state">
            <div className="empty-icon">{smartView === 'today' ? '☀️' : smartView === 'upcoming' ? '📅' : smartView === 'inbox' ? '📥' : smartView === 'repeat' ? '🔁' : selectedProjectId ? '📂' : '✅'}</div>
            <strong>{smartView === 'today' ? '今天没有待办任务' : smartView === 'upcoming' ? '未来 7 天暂无安排' : smartView === 'inbox' ? '收集箱是空的' : smartView === 'repeat' ? '还没有重复任务' : selectedProjectId ? `「${getProjectName(selectedProjectId)}」暂无任务` : '全部任务已完成'}</strong>
            <span>{smartView === 'inbox' ? '快速添加的任务会先进入收集箱，稍后整理到项目中' : smartView === 'repeat' ? '创建任务时设置重复规则，自动循环提醒' : '用上方输入框添加一个新任务吧'}</span>
          </div>
        )}
      </div>
    )
  }

  const renderBoardView = () => (
    <div className="todo-board-view">
      {BOARD_COLUMNS.map(column => {
        const columnTodos = filteredTodos.filter(t => (t.done ? 'done' : t.status || 'backlog') === column.id)
        return (
          <div
            className={`todo-board-column ${dragOverColumn === column.id ? 'drag-over' : ''}`}
            key={column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="todo-board-head">
              <span>{column.title}</span>
              <b>{columnTodos.length}</b>
            </div>
            {columnTodos.map(t => renderTaskCard(t, true, true))}
          </div>
        )
      })}
    </div>
  )

  const renderCalendarView = () => {
    const baseDate = new Date()
    baseDate.setDate(baseDate.getDate() + calendarWeekOffset * 7)
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(baseDate)
      date.setDate(baseDate.getDate() + index)
      return date
    })
    const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]

    return (
      <div className="todo-calendar-view">
        <div className="calendar-main">
          <div className="calendar-nav">
            <button onClick={() => setCalendarWeekOffset(o => o - 1)}>←</button>
            <button className="calendar-nav-today" onClick={() => setCalendarWeekOffset(0)}>今天</button>
            <button onClick={() => setCalendarWeekOffset(o => o + 1)}>→</button>
          </div>
          <div className="todo-calendar-grid">
          <div className="calendar-head empty" />
          {days.map(day => (
            <div className="calendar-head" key={day.toDateString()}>
              <strong>{day.toLocaleDateString('zh-CN', { weekday: 'short' })}</strong>
              <span>{day.getDate()}</span>
            </div>
          ))}
          {hours.map(hour => {
            const timeLabel = `${hour.toString().padStart(2, '0')}:00`
            return (
              <div key={`row-${hour}`} style={{ display: 'contents' }}>
                <div className="calendar-time" key={`${timeLabel}-label`}>{timeLabel}</div>
                {days.map(day => {
                  const dayTodos = filteredTodos.filter(t => {
                    if (!t.dueDate) return false
                    const d = new Date(t.dueDate)
                    return isSameDay(t.dueDate, day) && d.getHours() === hour
                  })
                  return (
                    <div
                      className="calendar-cell"
                      key={`${day.toDateString()}-${hour}`}
                      onClick={() => {
                        if (calendarScheduling) {
                          handleScheduleToDate(calendarScheduling, day, hour)
                        }
                      }}
                      style={calendarScheduling ? { cursor: 'pointer' } : undefined}
                    >
                      {dayTodos.map(t => (
                        <div
                          className={`calendar-event priority-${t.priority}`}
                          key={t.id}
                          onClick={e => { e.stopPropagation(); setSelectedTodoId(t.id) }}
                        >
                          {t.title}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
        </div>
        <div className="todo-unscheduled">
          <h3>未安排任务</h3>
          {calendarScheduling && <div className="calendar-scheduling-hint">点击日历格子安排时间</div>}
          {filteredTodos.filter(t => !t.dueDate && !t.done).map(t => (
            <div key={t.id} className="todo-unscheduled-item">
              {renderTaskCard(t, true)}
              <button
                className={`schedule-btn ${calendarScheduling === t.id ? 'active' : ''}`}
                onClick={e => {
                  e.stopPropagation()
                  setCalendarScheduling(calendarScheduling === t.id ? null : t.id)
                }}
              >
                {calendarScheduling === t.id ? '取消' : '安排'}
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="todo-workspace-shell" onClick={() => projectMenuId && setProjectMenuId(null)}>
      <aside className="todo-work-sidebar">
        <div className="todo-work-brand">
          <div className="todo-work-logo">✓</div>
          <div>
            <strong>待办工作台</strong>
            <span>今天 {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        <div className="todo-search-box">
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜索任务…" />
          {searchQuery && <button onClick={() => setSearchQuery('')}>×</button>}
          {searchQuery && (
            <span className="todo-search-scope">
              搜索范围：{selectedProjectId ? getProjectName(selectedProjectId) : smartView === 'today' ? '今天' : smartView === 'upcoming' ? '未来7天' : smartView === 'inbox' ? '收集箱' : smartView === 'repeat' ? '重复任务' : '全部未完成'}
            </span>
          )}
        </div>

        <div className="todo-nav-group">
          <button className={smartView === 'all' ? 'active' : ''} onClick={() => { setSmartView('all'); setSelectedProjectId(null) }}>全部</button>
          <button className={smartView === 'today' ? 'active' : ''} onClick={() => { setSmartView('today'); setSelectedProjectId(null) }}>今天</button>
          <button className={smartView === 'upcoming' ? 'active' : ''} onClick={() => { setSmartView('upcoming'); setSelectedProjectId(null) }}>未来 7 天</button>
          <button className={smartView === 'inbox' ? 'active' : ''} onClick={() => { setSmartView('inbox'); setSelectedProjectId(null) }}>收集箱</button>
          <button className={smartView === 'repeat' ? 'active' : ''} onClick={() => { setSmartView('repeat'); setSelectedProjectId(null) }}>重复任务</button>
        </div>

        <div className="todo-work-stats">
          <span>未完成 <b>{activeCount}</b></span>
          <span>高优先级 <b>{highCount}</b></span>
          <span>已逾期 <b>{overdueCount}</b></span>
        </div>

        <div className="todo-projects-head">
          <span>项目</span>
          <button onClick={() => setShowProjectForm(true)}>+</button>
        </div>
        <div className="todo-project-nav">
          {projectList.filter(p => p.id !== 'inbox').map(project => (
            <div key={project.id} className="todo-project-item">
              <button
                className={selectedProjectId === project.id ? 'active' : ''}
                onClick={() => {
                  if (selectedProjectId === project.id) { setSelectedProjectId(null); setSmartView('today') }
                  else { setSelectedProjectId(project.id); setSmartView(null) }
                  setProjectMenuId(null)
                }}
              >
                <i style={{ background: project.color }} />
                {editingProjectId === project.id ? (
                  <input
                    className="todo-project-rename"
                    value={editingProjectName}
                    onChange={e => setEditingProjectName(e.target.value)}
                    onBlur={() => handleRenameProject(project.id, editingProjectName)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameProject(project.id, editingProjectName); if (e.key === 'Escape') setEditingProjectId(null) }}
                    onClick={e => e.stopPropagation()}
                    autoFocus
                  />
                ) : project.name}
                <b>{todos.filter(t => t.projectId === project.id && !t.done).length}</b>
              </button>
              <span className="todo-project-more" onClick={e => { e.stopPropagation(); setProjectMenuId(projectMenuId === project.id ? null : project.id) }}>⋯</span>
              {projectMenuId === project.id && (
                <div className="todo-project-menu">
                  <div className="todo-color-picker">
                    {PROJECT_COLORS.map(c => (
                      <span
                        key={c}
                        className={`color-dot ${project.color === c ? 'active' : ''}`}
                        style={{ background: c }}
                        onClick={() => handleChangeProjectColor(project.id, c)}
                      />
                    ))}
                  </div>
                  <button onClick={() => { setEditingProjectId(project.id); setEditingProjectName(project.name); setProjectMenuId(null) }}>重命名</button>
                  <button onClick={() => { handleDeleteProject(project.id); setProjectMenuId(null) }}>删除</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {showProjectForm && (
          <div className="todo-project-form">
            <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="项目名称" autoFocus />
            <button onClick={handleAddProject}>添加</button>
          </div>
        )}
      </aside>

      <main className="todo-work-main">
        <div className="todo-command-bar">
          <span>✦</span>
          <input
            value={quickInput}
            onChange={e => { setQuickInput(e.target.value); setValidationHint('') }}
            onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
            placeholder={isTranscribing ? '语音识别中…' : '添加待办，例如：明天下午三点交报告 #工作 !高'}
            disabled={isTranscribing}
          />
          {validationHint && <span className="todo-validation-hint">{validationHint}</span>}
          {isRecording ? (
            <button className="todo-voice-btn recording" onClick={stopRecording} title="停止录音">
              <span className="voice-pulse" />
              {String(Math.floor(recordingTime / 60)).padStart(2, '0')}:{String(recordingTime % 60).padStart(2, '0')}
            </button>
          ) : (
            <button
              className={`todo-voice-btn ${isTranscribing ? 'transcribing' : ''}`}
              onClick={startRecording}
              disabled={isTranscribing}
              title="语音录入"
            >
              🎤
            </button>
          )}
          <button onClick={handleQuickAdd} disabled={isTranscribing}>添加</button>
          <button className="ghost" onClick={() => openEditor(createBlankTodo(selectedProjectId || 'inbox'))}>手动</button>
          {todos.length === 0 && <button className="ghost" onClick={seedSampleData}>示例</button>}
        </div>
        {nlpPreview && (
          <div className="nlp-preview">
            <span className="nlp-preview-title">{nlpPreview.title}</span>
            {nlpPreview.tags.map((tag, i) => <span key={i} className="nlp-preview-tag">{tag}</span>)}
          </div>
        )}

        <div className="todo-work-header">
          <div>
            <h2>{viewMode === 'board' ? '看板视图' : viewMode === 'calendar' ? '日历视图' : selectedProjectId ? getProjectName(selectedProjectId) : smartView === 'all' ? '全部任务' : smartView === 'upcoming' ? '未来 7 天' : smartView === 'inbox' ? '收集箱' : smartView === 'repeat' ? '重复任务' : '今天任务'}</h2>
            <p>AI 会根据截止时间、优先级和项目状态辅助你安排顺序。</p>
          </div>
          <div className="todo-view-switch">
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>列表</button>
            <button className={viewMode === 'board' ? 'active' : ''} onClick={() => setViewMode('board')}>看板</button>
            <button className={viewMode === 'calendar' ? 'active' : ''} onClick={() => setViewMode('calendar')}>日历</button>
          </div>
        </div>

        {viewMode === 'list' && renderListView()}
        {viewMode === 'board' && renderBoardView()}
        {viewMode === 'calendar' && renderCalendarView()}
      </main>

      <aside className="todo-detail-panel">
        <div className="todo-detail-head">
          <h3>任务详情</h3>
          {selectedTodo && <button onClick={() => openEditor(selectedTodo)}>编辑</button>}
        </div>
        {selectedTodo ? (
          <>
            <div className={`todo-detail-card priority-${selectedTodo.priority || 'medium'}`}>
              <span>{priorityLabel(selectedTodo.priority)}优先级</span>
              <h2>{selectedTodo.title}</h2>
              <p>{selectedTodo.note || '暂无备注'}</p>
              {selectedTodo.tags && selectedTodo.tags.length > 0 && (
                <div className="todo-card-tags">
                  {selectedTodo.tags.map(tag => <span key={tag} className="todo-tag">{tag}</span>)}
                </div>
              )}
            </div>
            <details className="todo-field-list" open>
              <summary>详细信息</summary>
              <div><span>截止</span><b>{formatDateTime(selectedTodo.dueDate)}</b></div>
              <div><span>项目</span><b>{getProjectName(selectedTodo.projectId)}</b></div>
              <div><span>提醒</span><b>{selectedTodo.reminderAt ? formatDateTime(selectedTodo.reminderAt) : '未设置'}</b></div>
              <div><span>重复</span><b>{repeatLabel(selectedTodo.repeatRule)}</b></div>
            </details>
            <details className="todo-subtasks-preview" open>
              <summary>子任务</summary>
              {(selectedTodo.subtasks || []).length ? selectedTodo.subtasks?.map(item => (
                <label key={item.id}><input type="checkbox" checked={item.done} onChange={() => handleToggleDetailSubtask(item.id)} /> {item.title}</label>
              )) : <button onClick={() => handleAiDecompose(selectedTodo, false)}>快速拆解</button>}
            </details>
            <div className="todo-detail-actions">
              <button onClick={() => handleToggleDone(selectedTodo)}>{selectedTodo.done ? '取消完成' : '标记完成'}</button>
              <button className="danger" onClick={() => handleDeleteTodo(selectedTodo.id)}>删除</button>
            </div>
          </>
        ) : (
          <div className="todo-empty-state">选择一个任务查看详情。</div>
        )}
      </aside>

      {editingTodo && (
        <div className="todo-form-overlay" onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { saveTodo(editingTodo); _setEditingTodo(null) } }}>
          <div className="todo-form-modal">
            <div className="todo-form-head">
              <h3>{todos.some(t => t.id === editingTodo.id) ? '编辑任务' : '添加任务'}</h3>
              <button onClick={closeEditor}>×</button>
            </div>
            <label>
              任务标题
              <input value={editingTodo.title} onChange={e => { _setEditingTodo({ ...editingTodo, title: e.target.value }); markDirty() }} autoFocus />
            </label>
            <label>
              备注
              <textarea value={editingTodo.note || ''} onChange={e => { _setEditingTodo({ ...editingTodo, note: e.target.value }); markDirty() }} rows={3} />
            </label>
            <div className="todo-form-grid">
              <label>
                截止时间
                <input type="datetime-local" value={toLocalInputValue(editingTodo.dueDate)} onChange={e => { _setEditingTodo({ ...editingTodo, dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined, notified: false }); markDirty() }} />
              </label>
              <label>
                提醒时间
                <input type="datetime-local" value={toLocalInputValue(editingTodo.reminderAt)} onChange={e => { _setEditingTodo({ ...editingTodo, reminderAt: e.target.value ? new Date(e.target.value).toISOString() : undefined, notified: false }); markDirty() }} />
              </label>
              <label>
                项目
                <select value={editingTodo.projectId} onChange={e => { _setEditingTodo({ ...editingTodo, projectId: e.target.value }); markDirty() }}>
                  {projectList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label>
                优先级
                <select value={editingTodo.priority || 'medium'} onChange={e => { _setEditingTodo({ ...editingTodo, priority: e.target.value as Todo['priority'] }); markDirty() }}>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </label>
              <label>
                状态
                <select value={editingTodo.status || 'backlog'} onChange={e => { _setEditingTodo({ ...editingTodo, status: e.target.value as Todo['status'] }); markDirty() }}>
                  {BOARD_COLUMNS.map(column => <option key={column.id} value={column.id}>{column.title}</option>)}
                </select>
              </label>
              <label>
                重复规则
                <select value={editingTodo.repeatRule || 'none'} onChange={e => { _setEditingTodo({ ...editingTodo, repeatRule: e.target.value as Todo['repeatRule'] }); markDirty() }}>
                  <option value="none">不重复</option>
                  <option value="daily">每天</option>
                  <option value="weekly">每周</option>
                  <option value="monthly">每月</option>
                </select>
              </label>
              <label>
                预计耗时（分钟）
                <input type="number" min={0} value={editingTodo.estimatedMinutes ?? ''} onChange={e => { _setEditingTodo({ ...editingTodo, estimatedMinutes: e.target.value ? parseInt(e.target.value, 10) : undefined }); markDirty() }} />
              </label>
            </div>
            <label className="todo-form-tags-label">
              标签（用空格或回车分隔）
              <div className="todo-form-tags">
                {(editingTodo.tags || []).map(tag => (
                  <span key={tag} className="todo-tag removable">
                    {tag}
                    <span onClick={() => { _setEditingTodo({ ...editingTodo, tags: editingTodo.tags?.filter(t => t !== tag) }); markDirty() }}>×</span>
                  </span>
                ))}
                <input
                  placeholder="输入标签…"
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      const v = (e.target as HTMLInputElement).value.trim()
                      if (v && !(editingTodo.tags || []).includes(v)) {
                        _setEditingTodo({ ...editingTodo, tags: [...(editingTodo.tags || []), v] })
                        markDirty()
                      }
                      ;(e.target as HTMLInputElement).value = ''
                    }
                  }}
                />
              </div>
            </label>
            <div className="todo-form-subtasks">
              <div>
                <strong>子任务</strong>
                <button onClick={() => { _setEditingTodo({ ...editingTodo, subtasks: [...(editingTodo.subtasks || []), { id: generateId(), title: '新子任务', done: false }] }); markDirty() }}>添加</button>
              </div>
              {(editingTodo.subtasks || []).map(item => (
                <label key={item.id}>
                  <input type="checkbox" checked={item.done} onChange={e => updateSubtask(item.id, { done: e.target.checked })} />
                  <input value={item.title} onChange={e => updateSubtask(item.id, { title: e.target.value })} />
                  <span className="todo-subtask-delete" onClick={e => { e.preventDefault(); handleDeleteSubtask(item.id) }}>×</span>
                </label>
              ))}
            </div>
            <div className="todo-form-actions">
              <button onClick={closeEditor}>取消</button>
              <button onClick={() => { saveTodo(editingTodo); _setEditingTodo(null) }}>保存任务</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="todo-toast">
          <span>{toast.message}</span>
          {toast.undo && <button onClick={() => { toast.undo!(); dismissToast() }}>撤销</button>}
          <button className="toast-close" onClick={dismissToast}>×</button>
        </div>
      )}
    </div>
  )
}

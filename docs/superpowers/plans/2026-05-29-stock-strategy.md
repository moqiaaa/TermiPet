# 股票策略系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为股票模块增加策略定义、股票绑定、指标触发提醒功能

**Architecture:** 后端在 `electron/stock-logic.js` 中新增策略/条件/绑定三组 CRUD + 条件检查逻辑。建表加入 `electron/schema.js`。前端 `StockWindow.tsx` 新增策略 Tab，持仓详情增加绑定区域。`TodoReminder` 泛化为通用提醒组件，策略触发时通过已有 `todo-reminder` IPC 通道推送提醒。

**Tech Stack:** Electron IPC, MySQL (mysql2), React, TypeScript

---

### Task 1: 建表 — schema.js 新增三张表

**Files:**
- Modify: `electron/schema.js:132` (在 `}` 前追加建表语句)

- [ ] **Step 1: 在 schema.js 的 ensureSchema 函数末尾、闭合 `}` 之前添加三张表的 CREATE TABLE**

```js
  await query(`
    CREATE TABLE IF NOT EXISTS stock_strategy (
      id BIGINT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      direction TINYINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS stock_strategy_condition (
      id BIGINT PRIMARY KEY,
      strategy_id BIGINT NOT NULL,
      indicator_name VARCHAR(50) NOT NULL,
      operator VARCHAR(10) NOT NULL,
      threshold VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS stock_strategy_binding (
      id BIGINT PRIMARY KEY,
      strategy_id BIGINT NOT NULL,
      stock_code VARCHAR(20) NOT NULL,
      stock_name VARCHAR(50) NOT NULL,
      enabled TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
```

- [ ] **Step 2: 重启应用验证建表成功**

重启 Electron，检查 MySQL 中三张表已创建。

- [ ] **Step 3: Commit**

```bash
git add electron/schema.js
git commit -m "feat(stock): 新增策略/条件/绑定三张表的 schema"
```

---

### Task 2: 后端 CRUD — stock_strategy + stock_strategy_condition

**Files:**
- Modify: `electron/stock-logic.js` (在 `stock_indicator` 段之后、`module.exports` 之前添加)

- [ ] **Step 1: 在 stock-logic.js 中新增策略 CRUD 函数**

在 `deleteIndicator` 函数之后、`module.exports` 之前添加：

```js
// ========== stock_strategy ==========

async function getStrategies() {
  const strategies = await db.query('SELECT * FROM stock_strategy ORDER BY created_at DESC')
  for (const s of strategies) {
    const conditions = await db.query('SELECT * FROM stock_strategy_condition WHERE strategy_id = ? ORDER BY id', [s.id])
    const bindings = await db.query('SELECT COUNT(*) AS cnt FROM stock_strategy_binding WHERE strategy_id = ?', [s.id])
    s.conditions = conditions
    s.bindingCount = bindings[0].cnt
  }
  return strategies
}

async function getStrategyById(id) {
  const rows = await db.query('SELECT * FROM stock_strategy WHERE id = ?', [id])
  const strategy = rows[0] || null
  if (strategy) {
    strategy.conditions = await db.query('SELECT * FROM stock_strategy_condition WHERE strategy_id = ? ORDER BY id', [id])
    strategy.bindings = await db.query('SELECT * FROM stock_strategy_binding WHERE strategy_id = ? ORDER BY created_at DESC', [id])
  }
  return strategy
}

async function saveStrategy({ id, name, description, direction }) {
  if (!name || !direction) return null

  if (id) {
    await db.query(
      'UPDATE stock_strategy SET name=?, description=?, direction=?, updated_at=NOW() WHERE id=?',
      [name, description || null, direction, id]
    )
    return getStrategyById(id)
  }

  const newId = Date.now()
  await db.query(
    'INSERT INTO stock_strategy (id, name, description, direction, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
    [newId, name, description || null, direction]
  )
  return getStrategyById(newId)
}

async function deleteStrategy(id) {
  if (!id) return false
  await db.query('DELETE FROM stock_strategy_condition WHERE strategy_id = ?', [id])
  await db.query('DELETE FROM stock_strategy_binding WHERE strategy_id = ?', [id])
  const result = await db.query('DELETE FROM stock_strategy WHERE id = ?', [id])
  return result.affectedRows > 0
}

// ========== stock_strategy_condition ==========

async function saveCondition({ id, strategy_id, indicator_name, operator, threshold }) {
  if (!strategy_id || !indicator_name || !operator || threshold === undefined || threshold === null) return null

  if (id) {
    await db.query(
      'UPDATE stock_strategy_condition SET indicator_name=?, operator=?, threshold=? WHERE id=?',
      [indicator_name, operator, String(threshold), id]
    )
    const rows = await db.query('SELECT * FROM stock_strategy_condition WHERE id = ?', [id])
    return rows[0] || null
  }

  const newId = Date.now()
  await db.query(
    'INSERT INTO stock_strategy_condition (id, strategy_id, indicator_name, operator, threshold, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
    [newId, strategy_id, indicator_name, operator, String(threshold)]
  )
  const rows = await db.query('SELECT * FROM stock_strategy_condition WHERE id = ?', [newId])
  return rows[0] || null
}

async function deleteCondition(id) {
  if (!id) return false
  const result = await db.query('DELETE FROM stock_strategy_condition WHERE id = ?', [id])
  return result.affectedRows > 0
}
```

- [ ] **Step 2: 将新函数加入 module.exports**

更新 `module.exports`：

```js
module.exports = {
  getTrades, getTradeById, getTradeCount, saveTrade, deleteTrade,
  getPositions, getPositionById, savePosition, deletePosition,
  getIndicators, saveIndicator, deleteIndicator,
  getStrategies, getStrategyById, saveStrategy, deleteStrategy,
  saveCondition, deleteCondition
}
```

- [ ] **Step 3: Commit**

```bash
git add electron/stock-logic.js
git commit -m "feat(stock): 策略和条件的 CRUD 后端逻辑"
```

---

### Task 3: 后端 CRUD — stock_strategy_binding

**Files:**
- Modify: `electron/stock-logic.js` (在 Task 2 新增代码之后、`module.exports` 之前)

- [ ] **Step 1: 添加绑定 CRUD 函数**

在 `deleteCondition` 之后添加：

```js
// ========== stock_strategy_binding ==========

async function getBindingsByStrategy(strategyId) {
  return db.query('SELECT * FROM stock_strategy_binding WHERE strategy_id = ? ORDER BY created_at DESC', [strategyId])
}

async function getBindingsByStock(stockCode) {
  const bindings = await db.query(
    'SELECT b.*, s.name AS strategy_name, s.direction AS strategy_direction FROM stock_strategy_binding b JOIN stock_strategy s ON b.strategy_id = s.id WHERE b.stock_code = ? ORDER BY b.created_at DESC',
    [stockCode]
  )
  return bindings
}

async function saveBinding({ strategy_id, stock_code, stock_name }) {
  if (!strategy_id || !stock_code || !stock_name) return null
  const existing = await db.query(
    'SELECT * FROM stock_strategy_binding WHERE strategy_id = ? AND stock_code = ?',
    [strategy_id, stock_code]
  )
  if (existing.length > 0) return existing[0]

  const newId = Date.now()
  await db.query(
    'INSERT INTO stock_strategy_binding (id, strategy_id, stock_code, stock_name, enabled, created_at) VALUES (?, ?, ?, ?, 1, NOW())',
    [newId, strategy_id, stock_code, stock_name]
  )
  const rows = await db.query('SELECT * FROM stock_strategy_binding WHERE id = ?', [newId])
  return rows[0] || null
}

async function toggleBinding(id, enabled) {
  await db.query('UPDATE stock_strategy_binding SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id])
  const rows = await db.query('SELECT * FROM stock_strategy_binding WHERE id = ?', [id])
  return rows[0] || null
}

async function deleteBinding(id) {
  if (!id) return false
  const result = await db.query('DELETE FROM stock_strategy_binding WHERE id = ?', [id])
  return result.affectedRows > 0
}
```

- [ ] **Step 2: 更新 module.exports**

```js
module.exports = {
  getTrades, getTradeById, getTradeCount, saveTrade, deleteTrade,
  getPositions, getPositionById, savePosition, deletePosition,
  getIndicators, saveIndicator, deleteIndicator,
  getStrategies, getStrategyById, saveStrategy, deleteStrategy,
  saveCondition, deleteCondition,
  getBindingsByStrategy, getBindingsByStock, saveBinding, toggleBinding, deleteBinding
}
```

- [ ] **Step 3: Commit**

```bash
git add electron/stock-logic.js
git commit -m "feat(stock): 策略绑定的 CRUD 后端逻辑"
```

---

### Task 4: 后端 — 指标更新时的策略条件检查

**Files:**
- Modify: `electron/stock-logic.js` (新增 `checkStrategyConditions` 函数，修改 `saveIndicator`)

- [ ] **Step 1: 添加条件检查函数**

在绑定 CRUD 之后、`module.exports` 之前添加：

```js
// ========== strategy condition check ==========

function compareValues(indicatorValue, operator, threshold) {
  if (indicatorValue === null || indicatorValue === undefined || indicatorValue === '') return false

  const numVal = Number(indicatorValue)
  const numThreshold = Number(threshold)
  const bothNumeric = !isNaN(numVal) && !isNaN(numThreshold)

  if (bothNumeric) {
    switch (operator) {
      case '>': return numVal > numThreshold
      case '<': return numVal < numThreshold
      case '>=': return numVal >= numThreshold
      case '<=': return numVal <= numThreshold
      case '=': return numVal === numThreshold
      case '!=': return numVal !== numThreshold
      default: return false
    }
  }

  switch (operator) {
    case '=': return String(indicatorValue) === String(threshold)
    case '!=': return String(indicatorValue) !== String(threshold)
    default: return false
  }
}

async function checkStrategyConditions(stockCode) {
  const bindings = await db.query(
    'SELECT b.strategy_id, s.name AS strategy_name, s.direction FROM stock_strategy_binding b JOIN stock_strategy s ON b.strategy_id = s.id WHERE b.stock_code = ? AND b.enabled = 1',
    [stockCode]
  )
  if (bindings.length === 0) return []

  const indicators = await db.query('SELECT name, value FROM stock_indicator WHERE stock_code = ?', [stockCode])
  const indicatorMap = {}
  for (const ind of indicators) {
    indicatorMap[ind.name] = ind.value
  }

  const triggered = []

  for (const binding of bindings) {
    const conditions = await db.query(
      'SELECT * FROM stock_strategy_condition WHERE strategy_id = ?',
      [binding.strategy_id]
    )
    if (conditions.length === 0) continue

    const results = []
    let allMet = true

    for (const cond of conditions) {
      const currentValue = indicatorMap[cond.indicator_name]
      const met = compareValues(currentValue, cond.operator, cond.threshold)
      results.push({
        indicator_name: cond.indicator_name,
        operator: cond.operator,
        threshold: cond.threshold,
        current_value: currentValue ?? null,
        met,
      })
      if (!met) allMet = false
    }

    if (allMet) {
      triggered.push({
        strategy_name: binding.strategy_name,
        direction: binding.direction,
        conditions: results,
      })
    }
  }

  return triggered
}
```

- [ ] **Step 2: 修改 saveIndicator，保存后调用条件检查并返回触发结果**

将现有的 `saveIndicator` 函数替换为：

```js
async function saveIndicator({ id, stock_code, name, value, remark }) {
  if (!stock_code || !name) return null

  if (id) {
    await db.query(
      'UPDATE stock_indicator SET stock_code=?, name=?, value=?, remark=?, updated_at=NOW() WHERE id=?',
      [stock_code, name, value || null, remark || null, id]
    )
    const rows = await db.query('SELECT * FROM stock_indicator WHERE id = ?', [id])
    const saved = rows[0] || null
    const triggered = await checkStrategyConditions(stock_code)
    return { indicator: saved, triggered }
  }

  const newId = Date.now()
  await db.query(
    'INSERT INTO stock_indicator (id, stock_code, name, value, remark, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
    [newId, stock_code, name, value || null, remark || null]
  )
  const rows = await db.query('SELECT * FROM stock_indicator WHERE id = ?', [newId])
  const saved = rows[0] || null
  const triggered = await checkStrategyConditions(stock_code)
  return { indicator: saved, triggered }
}
```

- [ ] **Step 3: 更新 module.exports 加入 checkStrategyConditions**

```js
module.exports = {
  getTrades, getTradeById, getTradeCount, saveTrade, deleteTrade,
  getPositions, getPositionById, savePosition, deletePosition,
  getIndicators, saveIndicator, deleteIndicator,
  getStrategies, getStrategyById, saveStrategy, deleteStrategy,
  saveCondition, deleteCondition,
  getBindingsByStrategy, getBindingsByStock, saveBinding, toggleBinding, deleteBinding,
  checkStrategyConditions
}
```

- [ ] **Step 4: Commit**

```bash
git add electron/stock-logic.js
git commit -m "feat(stock): 指标保存后自动检查策略条件"
```

---

### Task 5: IPC 注册 — main.js 和 preload.js

**Files:**
- Modify: `electron/main.js:1431` (在 `delete-indicator` handler 之后)
- Modify: `electron/preload.js:122` (在 `deleteIndicator` 之后)

- [ ] **Step 1: 在 main.js 中注册策略相关 IPC handlers**

在 `ipcMain.handle('delete-indicator', ...)` 行之后添加：

```js
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
```

- [ ] **Step 2: 修改 main.js 中的 save-indicator handler，支持策略触发提醒**

将现有的 `save-indicator` handler 替换为：

```js
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
```

- [ ] **Step 3: 在 preload.js 中添加策略相关 API**

在 `deleteIndicator` 行之后添加：

```js
  // Stock strategy
  getStrategies: () => ipcRenderer.invoke('get-strategies'),
  getStrategyById: (id) => ipcRenderer.invoke('get-strategy-by-id', id),
  saveStrategy: (data) => ipcRenderer.invoke('save-strategy', data),
  deleteStrategy: (id) => ipcRenderer.invoke('delete-strategy', id),
  saveCondition: (data) => ipcRenderer.invoke('save-condition', data),
  deleteCondition: (id) => ipcRenderer.invoke('delete-condition', id),
  getBindingsByStrategy: (strategyId) => ipcRenderer.invoke('get-bindings-by-strategy', strategyId),
  getBindingsByStock: (stockCode) => ipcRenderer.invoke('get-bindings-by-stock', stockCode),
  saveBinding: (data) => ipcRenderer.invoke('save-binding', data),
  toggleBinding: (id, enabled) => ipcRenderer.invoke('toggle-binding', id, enabled),
  deleteBinding: (id) => ipcRenderer.invoke('delete-binding', id),
```

- [ ] **Step 4: Commit**

```bash
git add electron/main.js electron/preload.js
git commit -m "feat(stock): 注册策略相关 IPC handlers 和 preload API"
```

---

### Task 6: TypeScript 类型定义

**Files:**
- Modify: `src/types/pet.ts:230` (在 `StockIndicator` 接口之后)

- [ ] **Step 1: 添加策略相关类型**

在 `StockIndicator` 接口之后添加：

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/types/pet.ts
git commit -m "feat(stock): 添加策略相关 TypeScript 类型"
```

---

### Task 7: TodoReminder 泛化为通用提醒组件

**Files:**
- Modify: `src/components/TodoReminder.tsx`
- Modify: `src/App.tsx` (调整提醒处理逻辑)

- [ ] **Step 1: 修改 TodoReminder 支持不同提醒类型**

将 `src/components/TodoReminder.tsx` 完整替换为：

```tsx
import { useEffect, useRef } from 'react'
import type { Todo } from '../types/pet'

export type ReminderItem = {
  type: 'todo'
  todo: Todo
} | {
  type: 'strategy'
  id: string
  title: string
  note: string
  priority: string
  stock_code: string
}

interface ReminderProps {
  item: ReminderItem | null
  onDismiss: (id: string) => void
  onOpen: (item: ReminderItem) => void
  onSnooze: (id: string, minutes: number) => void
}

const AUTO_DISMISS_MS = 30000

function formatReminderTime(todo: Todo) {
  const value = todo.reminderAt || todo.dueDate
  if (!value) return '已到提醒时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '已到提醒时间'
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getItemId(item: ReminderItem): string {
  return item.type === 'todo' ? item.todo.id : item.id
}

export function TodoReminder({ item, onDismiss, onOpen, onSnooze }: ReminderProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!item) return

    timerRef.current = setTimeout(() => {
      onDismiss(getItemId(item))
    }, AUTO_DISMISS_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [item && getItemId(item), onDismiss])

  if (!item) return null

  const itemId = getItemId(item)

  if (item.type === 'strategy') {
    return (
      <div className="todo-reminder-overlay">
        <div className="todo-reminder-popover">
          <div className="todo-reminder-head">
            <div className="todo-reminder-icon">📈</div>
            <div>
              <div className="todo-reminder-title">策略触发</div>
            </div>
          </div>

          <div className="todo-reminder-task">
            <span>策略信号</span>
            <strong>{item.title}</strong>
            {item.note && <p style={{ whiteSpace: 'pre-line' }}>{item.note}</p>}
          </div>

          <div className="todo-reminder-actions">
            <button
              className="primary"
              onClick={() => { onDismiss(itemId); onOpen(item) }}
            >
              打开持仓
            </button>
            <button onClick={() => onDismiss(itemId)}>知道了</button>
          </div>
        </div>
      </div>
    )
  }

  const { todo } = item

  return (
    <div className="todo-reminder-overlay">
      <div className="todo-reminder-popover">
        <div className="todo-reminder-head">
          <div className="todo-reminder-icon">!</div>
          <div>
            <div className="todo-reminder-title">任务到期</div>
            <div className="todo-reminder-time">{formatReminderTime(todo)}</div>
          </div>
        </div>

        <div className="todo-reminder-task">
          <span>{todo.priority === 'high' ? '高优先级' : todo.priority === 'low' ? '低优先级' : '待办提醒'}</span>
          <strong>{todo.title}</strong>
          {todo.note && <p>{todo.note}</p>}
        </div>

        <div className="todo-reminder-snooze">
          <button onClick={() => onSnooze(todo.id, 10)}>10 分钟</button>
          <button onClick={() => onSnooze(todo.id, 30)}>30 分钟</button>
        </div>

        <div className="todo-reminder-actions">
          <button
            className="primary"
            onClick={() => { onDismiss(todo.id); onOpen(item) }}
          >
            打开任务
          </button>
          <button onClick={() => onDismiss(todo.id)}>知道了</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 修改 App.tsx 中的提醒状态和回调**

2a. 修改 import：

```tsx
import { TodoReminder, type ReminderItem } from './components/TodoReminder'
```

2b. 将 `todoReminder` state 类型从 `Todo | null` 改为 `ReminderItem | null`：

```tsx
const [todoReminder, setTodoReminder] = useState<ReminderItem | null>(null)
```

2c. 修改 `onTodoReminder` 监听，区分 todo 和 strategy 类型：

```tsx
const cleanupReminder = api.onTodoReminder?.((data: any) => {
  if (data.type === 'strategy') {
    setTodoReminder({
      type: 'strategy',
      id: data.id,
      title: data.title,
      note: data.note,
      priority: data.priority,
      stock_code: data.stock_code,
    })
  } else {
    setTodoReminder({ type: 'todo', todo: data as Todo })
  }
})
```

2d. 修改 `handleDismissReminder`：

```tsx
const handleDismissReminder = useCallback((id: string) => {
  if (todoReminder?.type === 'todo') {
    window.electronAPI?.dismissTodoReminder?.(id)
  }
  setTodoReminder(null)
}, [todoReminder])
```

2e. 修改 `handleOpenTodo` 为 `handleOpenReminder`，支持两种类型：

```tsx
const handleOpenReminder = useCallback((item: ReminderItem) => {
  if (item.type === 'todo') {
    window.electronAPI?.openTodoWindow?.()
  } else if (item.type === 'strategy') {
    window.electronAPI?.openStockWindow?.()
  }
}, [])
```

2f. `handleSnoozeReminder` 不变，strategy 类型不会调用它。

2g. 修改 TodoReminder JSX 调用：

```tsx
<TodoReminder
  item={todoReminder}
  onDismiss={handleDismissReminder}
  onOpen={handleOpenReminder}
  onSnooze={handleSnoozeReminder}
/>
```

- [ ] **Step 3: 验证现有 todo 提醒仍然正常工作**

重启应用，创建一个到期待办，确认提醒弹窗正常弹出和关闭。

- [ ] **Step 4: Commit**

```bash
git add src/components/TodoReminder.tsx src/App.tsx
git commit -m "refactor: TodoReminder 泛化为通用提醒，支持策略触发"
```

---

### Task 8: 前端 — 策略 Tab UI

**Files:**
- Modify: `src/components/StockWindow.tsx` (新增策略 Tab 及内容)

- [ ] **Step 1: 添加策略 Tab 类型和状态**

修改 Tab 类型和新增状态：

```tsx
type Tab = 'trades' | 'positions' | 'strategies'
```

在现有 state 区域添加：

```tsx
import type { StockTrade, StockPosition, StockIndicator, StockStrategy, StockStrategyCondition, StockStrategyBinding } from '../types/pet'

// Strategy state
const [strategies, setStrategies] = useState<StockStrategy[]>([])
const [selectedStrategy, setSelectedStrategy] = useState<StockStrategy | null>(null)
const [strategyForm, setStrategyForm] = useState({ name: '', description: '', direction: 1 })
const [showStrategyForm, setShowStrategyForm] = useState(false)
const [conditionForm, setConditionForm] = useState({ indicator_name: '', operator: '>', threshold: '' })
```

- [ ] **Step 2: 添加策略数据加载和 CRUD 函数**

```tsx
const loadStrategies = useCallback(async () => {
  const list = await window.electronAPI?.getStrategies()
  setStrategies(list || [])
}, [])

const handleSelectStrategy = async (s: StockStrategy) => {
  const full = await window.electronAPI?.getStrategyById(s.id)
  setSelectedStrategy(full || null)
}

const handleSaveStrategy = async () => {
  if (!strategyForm.name) return
  const saved = await window.electronAPI?.saveStrategy({
    id: selectedStrategy?.id,
    name: strategyForm.name,
    description: strategyForm.description || null,
    direction: strategyForm.direction,
  })
  setShowStrategyForm(false)
  loadStrategies()
  if (saved) handleSelectStrategy(saved)
}

const handleDeleteStrategy = async (id: number) => {
  await window.electronAPI?.deleteStrategy(id)
  if (selectedStrategy?.id === id) setSelectedStrategy(null)
  loadStrategies()
}

const handleAddCondition = async () => {
  if (!selectedStrategy || !conditionForm.indicator_name || !conditionForm.threshold) return
  await window.electronAPI?.saveCondition({
    strategy_id: selectedStrategy.id,
    indicator_name: conditionForm.indicator_name,
    operator: conditionForm.operator,
    threshold: conditionForm.threshold,
  })
  setConditionForm({ indicator_name: '', operator: '>', threshold: '' })
  handleSelectStrategy(selectedStrategy)
}

const handleDeleteCondition = async (id: number) => {
  await window.electronAPI?.deleteCondition(id)
  if (selectedStrategy) handleSelectStrategy(selectedStrategy)
}

const handleAddBinding = async (stockCode: string, stockName: string) => {
  if (!selectedStrategy) return
  await window.electronAPI?.saveBinding({
    strategy_id: selectedStrategy.id,
    stock_code: stockCode,
    stock_name: stockName,
  })
  handleSelectStrategy(selectedStrategy)
  loadStrategies()
}

const handleToggleBinding = async (id: number, enabled: boolean) => {
  await window.electronAPI?.toggleBinding(id, enabled)
  if (selectedStrategy) handleSelectStrategy(selectedStrategy)
}

const handleDeleteBinding = async (id: number) => {
  await window.electronAPI?.deleteBinding(id)
  if (selectedStrategy) handleSelectStrategy(selectedStrategy)
  loadStrategies()
}
```

- [ ] **Step 3: 修改 useEffect 加载逻辑，支持 strategies Tab**

```tsx
useEffect(() => {
  if (tab === 'trades') loadTrades()
  else if (tab === 'positions') loadPositions()
  else if (tab === 'strategies') loadStrategies()
}, [tab, loadTrades, loadPositions, loadStrategies])
```

- [ ] **Step 4: 在 Tab 栏添加"策略"按钮**

```tsx
<div className="stock-tabs">
  <button className={tab === 'trades' ? 'active' : ''} onClick={() => setTab('trades')}>交易记录</button>
  <button className={tab === 'positions' ? 'active' : ''} onClick={() => setTab('positions')}>持仓</button>
  <button className={tab === 'strategies' ? 'active' : ''} onClick={() => setTab('strategies')}>策略</button>
</div>
```

- [ ] **Step 5: 添加策略 Tab 的 JSX**

在 `{tab === 'positions' && (...)}` 块之后，OCR modal 之前添加：

```tsx
{tab === 'strategies' && (
  <div className="stock-strategies-panel">
    <div className="stock-filter-row">
      <button className="add-btn" onClick={() => {
        setStrategyForm({ name: '', description: '', direction: 1 })
        setShowStrategyForm(true)
        setSelectedStrategy(null)
      }}>+ 新建策略</button>
    </div>

    {showStrategyForm && (
      <div className="trade-form">
        <div className="trade-form-grid">
          <input value={strategyForm.name} onChange={e => setStrategyForm({ ...strategyForm, name: e.target.value })} placeholder="策略名称" />
          <div className="direction-toggle">
            <button className={strategyForm.direction === 1 ? 'active buy' : ''} onClick={() => setStrategyForm({ ...strategyForm, direction: 1 })}>买入信号</button>
            <button className={strategyForm.direction === 2 ? 'active sell' : ''} onClick={() => setStrategyForm({ ...strategyForm, direction: 2 })}>卖出信号</button>
          </div>
        </div>
        <textarea value={strategyForm.description} onChange={e => setStrategyForm({ ...strategyForm, description: e.target.value })} placeholder="策略描述" rows={2} />
        <div className="trade-form-actions">
          <button onClick={handleSaveStrategy}>保存</button>
          <button onClick={() => setShowStrategyForm(false)}>取消</button>
        </div>
      </div>
    )}

    <div className="positions-layout">
      <div className="strategy-list">
        {strategies.map(s => (
          <div
            key={s.id}
            className={`strategy-item ${selectedStrategy?.id === s.id ? 'selected' : ''}`}
            onClick={() => handleSelectStrategy(s)}
          >
            <div className="strategy-item-header">
              <span className="strategy-name">{s.name}</span>
              <span className={`direction-tag ${s.direction === 1 ? 'buy' : 'sell'}`}>{s.direction === 1 ? '买入' : '卖出'}</span>
            </div>
            <div className="strategy-item-meta">
              <span>{s.conditions?.length || 0} 个条件</span>
              <span>{s.bindingCount || 0} 只股票</span>
            </div>
          </div>
        ))}
        {strategies.length === 0 && <div className="empty-row">暂无策略</div>}
      </div>

      {selectedStrategy && (
        <div className="position-detail strategy-detail">
          <div className="strategy-detail-header">
            <h3>{selectedStrategy.name}</h3>
            <div>
              <button className="table-btn" onClick={() => {
                setStrategyForm({
                  name: selectedStrategy.name,
                  description: selectedStrategy.description || '',
                  direction: selectedStrategy.direction,
                })
                setShowStrategyForm(true)
              }}>编辑</button>
              <button className="table-btn danger" onClick={() => handleDeleteStrategy(selectedStrategy.id)}>删除</button>
            </div>
          </div>
          {selectedStrategy.description && <p className="position-notes">{selectedStrategy.description}</p>}

          <div className="indicators">
            <h4>条件</h4>
            {selectedStrategy.conditions?.map(c => (
              <div key={c.id} className="indicator-item">
                <span className="indicator-name">{c.indicator_name}</span>
                <span className="indicator-value">{c.operator} {c.threshold}</span>
                <button className="table-btn danger" onClick={() => handleDeleteCondition(c.id)}>×</button>
              </div>
            ))}
            <div className="condition-add-row">
              <input value={conditionForm.indicator_name} onChange={e => setConditionForm({ ...conditionForm, indicator_name: e.target.value })} placeholder="指标名" />
              <select value={conditionForm.operator} onChange={e => setConditionForm({ ...conditionForm, operator: e.target.value })}>
                <option value=">">{'>'}</option>
                <option value="<">{'<'}</option>
                <option value=">=">{'>='}</option>
                <option value="<=">{'<='}</option>
                <option value="=">{'='}</option>
                <option value="!=">{'!='}</option>
              </select>
              <input value={conditionForm.threshold} onChange={e => setConditionForm({ ...conditionForm, threshold: e.target.value })} placeholder="阈值" />
              <button className="add-btn" onClick={handleAddCondition}>+</button>
            </div>
          </div>

          <div className="indicators">
            <h4>绑定股票</h4>
            {selectedStrategy.bindings?.map(b => (
              <div key={b.id} className="indicator-item">
                <span className="indicator-name">{b.stock_name}({b.stock_code})</span>
                <label className="binding-toggle">
                  <input type="checkbox" checked={b.enabled === 1} onChange={e => handleToggleBinding(b.id, e.target.checked)} />
                  <span>{b.enabled ? '启用' : '暂停'}</span>
                </label>
                <button className="table-btn danger" onClick={() => handleDeleteBinding(b.id)}>×</button>
              </div>
            ))}
            <BindingAdder positions={positions} onAdd={handleAddBinding} onLoadPositions={loadPositions} />
          </div>
        </div>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 6: 添加 BindingAdder 子组件**

在 `StockWindow` 组件之前添加：

```tsx
function BindingAdder({ positions, onAdd, onLoadPositions }: {
  positions: StockPosition[]
  onAdd: (code: string, name: string) => void
  onLoadPositions: () => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => { onLoadPositions() }, [])

  const handleSelectPosition = (p: StockPosition) => {
    onAdd(p.stock_code, p.stock_name)
    setShowDropdown(false)
  }

  const handleManualAdd = () => {
    if (!code || !name) return
    onAdd(code, name)
    setCode('')
    setName('')
  }

  return (
    <div className="condition-add-row">
      <input value={code} onChange={e => setCode(e.target.value)} placeholder="股票代码" />
      <input value={name} onChange={e => setName(e.target.value)} placeholder="股票名称" />
      <button className="add-btn" onClick={handleManualAdd}>+</button>
      <button className="add-btn" onClick={() => setShowDropdown(!showDropdown)}>从持仓选</button>
      {showDropdown && positions.length > 0 && (
        <div className="binding-dropdown">
          {positions.map(p => (
            <div key={p.id} className="binding-dropdown-item" onClick={() => handleSelectPosition(p)}>
              {p.stock_name}({p.stock_code})
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/StockWindow.tsx
git commit -m "feat(stock): 策略 Tab UI — 策略列表、详情、条件、绑定管理"
```

---

### Task 9: 前端 — 持仓详情增加已绑定策略区域

**Files:**
- Modify: `src/components/StockWindow.tsx` (持仓 tab 的 position-detail 区域)

- [ ] **Step 1: 添加持仓绑定策略的 state 和加载逻辑**

在策略 state 区域添加：

```tsx
const [positionBindings, setPositionBindings] = useState<StockStrategyBinding[]>([])
```

修改 `handleSelectPosition`：

```tsx
const handleSelectPosition = async (pos: StockPosition) => {
  setSelectedPosition(pos)
  const inds = await window.electronAPI?.getIndicators(pos.stock_code)
  setIndicators(inds || [])
  const binds = await window.electronAPI?.getBindingsByStock(pos.stock_code)
  setPositionBindings(binds || [])
}
```

- [ ] **Step 2: 在持仓详情面板的指标区域之后，添加已绑定策略区域**

在 `{indicators.length > 0 && (...)}` 块之后添加：

```tsx
<div className="indicators">
  <h4>已绑定策略</h4>
  {positionBindings.length > 0 ? positionBindings.map(b => (
    <div key={b.id} className="indicator-item">
      <span className="indicator-name">{b.strategy_name}</span>
      <span className={`direction-tag ${b.strategy_direction === 1 ? 'buy' : 'sell'}`}>
        {b.strategy_direction === 1 ? '买入' : '卖出'}
      </span>
      <span className="indicator-value">{b.enabled ? '启用' : '暂停'}</span>
    </div>
  )) : <div className="empty-row">未绑定策略</div>}
</div>
```

- [ ] **Step 3: 清理 selectedPosition 时也清理 positionBindings**

修改 `handleDeletePosition`：

```tsx
const handleDeletePosition = async (id: number) => {
  await window.electronAPI?.deletePosition(id)
  if (selectedPosition?.id === id) {
    setSelectedPosition(null)
    setIndicators([])
    setPositionBindings([])
  }
  loadPositions()
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/StockWindow.tsx
git commit -m "feat(stock): 持仓详情面板显示已绑定策略"
```

---

### Task 10: CSS 样式

**Files:**
- Modify: `src/App.css` (在股票相关样式末尾追加)

- [ ] **Step 1: 添加策略相关 CSS**

在现有 stock 样式末尾追加：

```css
/* Strategy */
.strategy-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 220px;
  max-width: 260px;
}

.strategy-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  background: rgba(255,255,255,0.03);
  border: 1px solid transparent;
}

.strategy-item:hover {
  background: rgba(255,255,255,0.06);
}

.strategy-item.selected {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.15);
}

.strategy-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.strategy-name {
  font-weight: 500;
  font-size: 13px;
}

.strategy-item-meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  opacity: 0.5;
  margin-top: 3px;
}

.direction-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
}

.direction-tag.buy {
  background: rgba(232, 65, 66, 0.15);
  color: #e84142;
}

.direction-tag.sell {
  background: rgba(33, 150, 83, 0.15);
  color: #219953;
}

.strategy-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.strategy-detail-header h3 {
  margin: 0;
}

.condition-add-row {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-top: 6px;
  position: relative;
}

.condition-add-row input {
  flex: 1;
  min-width: 60px;
}

.condition-add-row select {
  width: 52px;
  padding: 4px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
  color: inherit;
  font-size: 12px;
}

.binding-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  cursor: pointer;
}

.binding-toggle input[type="checkbox"] {
  width: 14px;
  height: 14px;
}

.binding-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #2a2a2a;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  max-height: 160px;
  overflow-y: auto;
  z-index: 10;
}

.binding-dropdown-item {
  padding: 6px 10px;
  cursor: pointer;
  font-size: 12px;
}

.binding-dropdown-item:hover {
  background: rgba(255,255,255,0.08);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.css
git commit -m "feat(stock): 策略 UI 样式"
```

---

### Task 11: 集成测试 — 浏览器验证

**Files:** 无代码修改

- [ ] **Step 1: 重启应用，打开股票窗口**

- [ ] **Step 2: 验证策略 Tab**

1. 点击"策略" Tab，确认页面正常渲染
2. 点击"+ 新建策略"，输入策略名称、选择方向、填写描述，保存
3. 确认策略出现在左侧列表
4. 点击策略，确认右侧详情正确显示

- [ ] **Step 3: 验证条件管理**

1. 在策略详情中，添加条件（如 RSI > 70）
2. 确认条件显示在条件列表中
3. 删除条件，确认正常

- [ ] **Step 4: 验证绑定管理**

1. 添加一只股票绑定（手动输入或从持仓选择）
2. 确认绑定显示在绑定列表中
3. 切换启用/暂停，确认正常
4. 删除绑定，确认正常

- [ ] **Step 5: 验证触发提醒**

1. 创建一个策略，条件为某指标 > 某阈值
2. 绑定到一只有指标的股票
3. 在持仓 Tab 中更新该股票的指标值，使其满足条件
4. 确认 TodoReminder 弹窗弹出，显示策略触发信息
5. 点击"打开持仓"，确认跳转正常
6. 点击"知道了"，确认弹窗关闭

- [ ] **Step 6: 验证持仓详情绑定策略显示**

1. 在持仓 Tab 中选择一个已绑定策略的股票
2. 确认"已绑定策略"区域正确显示

- [ ] **Step 7: 验证 todo 提醒兼容性**

1. 创建一个带提醒时间的待办
2. 等待提醒触发，确认 TodoReminder 弹窗仍然正常工作

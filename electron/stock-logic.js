const db = require('./db')

// ========== stock_trade ==========

async function getTrades({ direction, keyword, dateRange, limit = 50, offset = 0 }) {
  let sql = 'SELECT * FROM stock_trade WHERE 1=1'
  const params = []

  if (direction) {
    sql += ' AND direction = ?'
    params.push(direction)
  }
  if (keyword) {
    sql += ' AND (stock_code LIKE ? OR stock_name LIKE ? OR reason LIKE ?)'
    const like = `%${keyword}%`
    params.push(like, like, like)
  }
  if (dateRange === 'today') {
    sql += ' AND trade_date = CURDATE()'
  } else if (dateRange === 'week') {
    sql += ' AND trade_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)'
  } else if (dateRange === 'month') {
    sql += ' AND trade_date >= DATE_FORMAT(CURDATE(), \'%Y-%m-01\')'
  }

  sql += ` ORDER BY trade_date DESC, id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`
  return db.query(sql, params)
}

async function getTradeById(id) {
  const rows = await db.query('SELECT * FROM stock_trade WHERE id = ?', [id])
  return rows[0] || null
}

async function getTradeCount({ direction, dateRange }) {
  let sql = 'SELECT COUNT(*) AS cnt FROM stock_trade WHERE 1=1'
  const params = []
  if (direction) {
    sql += ' AND direction = ?'
    params.push(direction)
  }
  if (dateRange === 'today') {
    sql += ' AND trade_date = CURDATE()'
  } else if (dateRange === 'week') {
    sql += ' AND trade_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)'
  } else if (dateRange === 'month') {
    sql += ' AND trade_date >= DATE_FORMAT(CURDATE(), \'%Y-%m-01\')'
  }
  const rows = await db.query(sql, params)
  return rows[0].cnt
}

async function saveTrade({ id, trade_date, stock_code, stock_name, direction, price, quantity, amount, reason, review, correct }) {
  if (!stock_code || !stock_name || !direction || !price || !quantity) return null

  if (id) {
    const oldTrade = await getTradeById(id)
    await db.query(
      'UPDATE stock_trade SET trade_date=?, stock_code=?, stock_name=?, direction=?, price=?, quantity=?, amount=?, reason=?, review=?, correct=?, updated_at=NOW() WHERE id=?',
      [trade_date || null, stock_code, stock_name, direction, price, quantity, amount || null, reason || null, review || null, correct ?? null, id]
    )
    await recalcPosition(stock_code)
    if (oldTrade && oldTrade.stock_code !== stock_code) {
      await recalcPosition(oldTrade.stock_code)
    }
    return getTradeById(id)
  }

  const newId = Date.now()
  await db.query(
    'INSERT INTO stock_trade (id, trade_date, stock_code, stock_name, direction, price, quantity, amount, reason, review, correct, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [newId, trade_date || null, stock_code, stock_name, direction, price, quantity, amount || null, reason || null, review || null, correct ?? null]
  )
  await recalcPosition(stock_code)
  return getTradeById(newId)
}

async function recalcPosition(stock_code) {
  const trades = await db.query(
    'SELECT direction, price, quantity, stock_name FROM stock_trade WHERE stock_code = ? ORDER BY trade_date, id',
    [stock_code]
  )

  let holdQty = 0
  let totalCost = 0
  let latestName = ''

  for (const t of trades) {
    latestName = t.stock_name || latestName
    if (t.direction === 1) {
      totalCost += Number(t.price) * Number(t.quantity)
      holdQty += Number(t.quantity)
    } else if (t.direction === 2) {
      const sellQty = Math.min(Number(t.quantity), holdQty)
      if (holdQty > 0) {
        totalCost -= (totalCost / holdQty) * sellQty
      }
      holdQty -= sellQty
    }
  }

  const posRows = await db.query('SELECT * FROM stock_position WHERE stock_code = ?', [stock_code])
  const pos = posRows[0]

  if (holdQty <= 0) {
    if (pos) await db.query('DELETE FROM stock_position WHERE id = ?', [pos.id])
    return
  }

  const costPrice = holdQty > 0 ? totalCost / holdQty : 0

  if (pos) {
    await db.query(
      'UPDATE stock_position SET stock_name=?, quantity=?, cost_price=?, updated_at=NOW() WHERE id=?',
      [latestName, holdQty, costPrice, pos.id]
    )
  } else {
    const newId = Date.now() + 1
    await db.query(
      'INSERT INTO stock_position (id, stock_code, stock_name, quantity, cost_price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [newId, stock_code, latestName, holdQty, costPrice]
    )
  }
}

async function deleteTrade(id) {
  if (!id) return false
  const trade = await getTradeById(id)
  const result = await db.query('DELETE FROM stock_trade WHERE id = ?', [id])
  if (result.affectedRows > 0 && trade) {
    await recalcPosition(trade.stock_code)
  }
  return result.affectedRows > 0
}

// ========== stock_position ==========

async function getPositions(keyword) {
  let sql = 'SELECT * FROM stock_position WHERE 1=1'
  const params = []
  if (keyword) {
    sql += ' AND (stock_code LIKE ? OR stock_name LIKE ? OR notes LIKE ?)'
    const like = `%${keyword}%`
    params.push(like, like, like)
  }
  sql += ' ORDER BY updated_at DESC'
  return db.query(sql, params)
}

async function getPositionById(id) {
  const rows = await db.query('SELECT * FROM stock_position WHERE id = ?', [id])
  return rows[0] || null
}

async function savePosition({ id, stock_code, stock_name, quantity, cost_price, notes, buy_point, sell_point }) {
  if (!stock_code || !stock_name || !quantity || !cost_price) return null

  if (id) {
    await db.query(
      'UPDATE stock_position SET stock_code=?, stock_name=?, quantity=?, cost_price=?, notes=?, buy_point=?, sell_point=?, updated_at=NOW() WHERE id=?',
      [stock_code, stock_name, quantity, cost_price, notes || null, buy_point || null, sell_point || null, id]
    )
    return getPositionById(id)
  }

  const newId = Date.now()
  await db.query(
    'INSERT INTO stock_position (id, stock_code, stock_name, quantity, cost_price, notes, buy_point, sell_point, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [newId, stock_code, stock_name, quantity, cost_price, notes || null, buy_point || null, sell_point || null]
  )
  return getPositionById(newId)
}

async function deletePosition(id) {
  if (!id) return false
  const result = await db.query('DELETE FROM stock_position WHERE id = ?', [id])
  return result.affectedRows > 0
}

// ========== stock_indicator ==========

async function getIndicators(stockCode) {
  return db.query('SELECT * FROM stock_indicator WHERE stock_code = ? ORDER BY id', [stockCode])
}

async function saveIndicator({ id, stock_code, name, value, remark }) {
  if (!stock_code || !name) return null
  if (id) {
    await db.query('UPDATE stock_indicator SET stock_code=?, name=?, value=?, remark=?, updated_at=NOW() WHERE id=?', [stock_code, name, value || null, remark || null, id])
    const rows = await db.query('SELECT * FROM stock_indicator WHERE id = ?', [id])
    const saved = rows[0] || null
    const triggered = await checkStrategyConditions(stock_code)
    return { indicator: saved, triggered }
  }
  const newId = Date.now()
  await db.query('INSERT INTO stock_indicator (id, stock_code, name, value, remark, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())', [newId, stock_code, name, value || null, remark || null])
  const rows = await db.query('SELECT * FROM stock_indicator WHERE id = ?', [newId])
  const saved = rows[0] || null
  const triggered = await checkStrategyConditions(stock_code)
  return { indicator: saved, triggered }
}

async function deleteIndicator(id) {
  if (!id) return false
  const result = await db.query('DELETE FROM stock_indicator WHERE id = ?', [id])
  return result.affectedRows > 0
}

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
    await db.query('UPDATE stock_strategy SET name=?, description=?, direction=?, updated_at=NOW() WHERE id=?', [name, description || null, direction, id])
    return getStrategyById(id)
  }
  const newId = Date.now()
  await db.query('INSERT INTO stock_strategy (id, name, description, direction, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())', [newId, name, description || null, direction])
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
    await db.query('UPDATE stock_strategy_condition SET indicator_name=?, operator=?, threshold=? WHERE id=?', [indicator_name, operator, String(threshold), id])
    const rows = await db.query('SELECT * FROM stock_strategy_condition WHERE id = ?', [id])
    return rows[0] || null
  }
  const newId = Date.now()
  await db.query('INSERT INTO stock_strategy_condition (id, strategy_id, indicator_name, operator, threshold, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [newId, strategy_id, indicator_name, operator, String(threshold)])
  const rows = await db.query('SELECT * FROM stock_strategy_condition WHERE id = ?', [newId])
  return rows[0] || null
}

async function deleteCondition(id) {
  if (!id) return false
  const result = await db.query('DELETE FROM stock_strategy_condition WHERE id = ?', [id])
  return result.affectedRows > 0
}

// ========== stock_strategy_binding ==========

async function getBindingsByStrategy(strategyId) {
  return db.query('SELECT * FROM stock_strategy_binding WHERE strategy_id = ? ORDER BY created_at DESC', [strategyId])
}

async function getBindingsByStock(stockCode) {
  return db.query(
    'SELECT b.*, s.name AS strategy_name, s.direction AS strategy_direction FROM stock_strategy_binding b JOIN stock_strategy s ON b.strategy_id = s.id WHERE b.stock_code = ? ORDER BY b.created_at DESC',
    [stockCode]
  )
}

async function saveBinding({ strategy_id, stock_code, stock_name }) {
  if (!strategy_id || !stock_code || !stock_name) return null
  const existing = await db.query('SELECT * FROM stock_strategy_binding WHERE strategy_id = ? AND stock_code = ?', [strategy_id, stock_code])
  if (existing.length > 0) return existing[0]
  const newId = Date.now()
  await db.query('INSERT INTO stock_strategy_binding (id, strategy_id, stock_code, stock_name, enabled, created_at) VALUES (?, ?, ?, ?, 1, NOW())', [newId, strategy_id, stock_code, stock_name])
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
  for (const ind of indicators) { indicatorMap[ind.name] = ind.value }
  const triggered = []
  for (const binding of bindings) {
    const conditions = await db.query('SELECT * FROM stock_strategy_condition WHERE strategy_id = ?', [binding.strategy_id])
    if (conditions.length === 0) continue
    const results = []
    let allMet = true
    for (const cond of conditions) {
      const currentValue = indicatorMap[cond.indicator_name]
      const met = compareValues(currentValue, cond.operator, cond.threshold)
      results.push({ indicator_name: cond.indicator_name, operator: cond.operator, threshold: cond.threshold, current_value: currentValue ?? null, met })
      if (!met) allMet = false
    }
    if (allMet) {
      triggered.push({ strategy_name: binding.strategy_name, direction: binding.direction, conditions: results })
    }
  }
  return triggered
}

module.exports = {
  getTrades, getTradeById, getTradeCount, saveTrade, deleteTrade,
  getPositions, getPositionById, savePosition, deletePosition,
  getIndicators, saveIndicator, deleteIndicator,
  getStrategies, getStrategyById, saveStrategy, deleteStrategy,
  saveCondition, deleteCondition,
  getBindingsByStrategy, getBindingsByStock, saveBinding, toggleBinding, deleteBinding,
  checkStrategyConditions
}

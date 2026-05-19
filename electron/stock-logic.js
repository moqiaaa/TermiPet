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
    await db.query(
      'UPDATE stock_trade SET trade_date=?, stock_code=?, stock_name=?, direction=?, price=?, quantity=?, amount=?, reason=?, review=?, correct=?, updated_at=NOW() WHERE id=?',
      [trade_date || null, stock_code, stock_name, direction, price, quantity, amount || null, reason || null, review || null, correct ?? null, id]
    )
    return getTradeById(id)
  }

  const newId = Date.now()
  await db.query(
    'INSERT INTO stock_trade (id, trade_date, stock_code, stock_name, direction, price, quantity, amount, reason, review, correct, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [newId, trade_date || null, stock_code, stock_name, direction, price, quantity, amount || null, reason || null, review || null, correct ?? null]
  )
  await syncPosition(stock_code, stock_name, direction, price, quantity)
  return getTradeById(newId)
}

async function syncPosition(stock_code, stock_name, direction, price, quantity) {
  const rows = await db.query('SELECT * FROM stock_position WHERE stock_code = ?', [stock_code])
  const pos = rows[0]

  if (direction === 1) {
    if (pos) {
      const newQty = pos.quantity + quantity
      const newCost = (pos.quantity * Number(pos.cost_price) + quantity * price) / newQty
      await db.query('UPDATE stock_position SET quantity=?, cost_price=?, updated_at=NOW() WHERE id=?', [newQty, newCost, pos.id])
    } else {
      const newId = Date.now() + 1
      await db.query(
        'INSERT INTO stock_position (id, stock_code, stock_name, quantity, cost_price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [newId, stock_code, stock_name, quantity, price]
      )
    }
  } else if (direction === 2 && pos) {
    const newQty = pos.quantity - quantity
    if (newQty <= 0) {
      await db.query('DELETE FROM stock_position WHERE id = ?', [pos.id])
    } else {
      await db.query('UPDATE stock_position SET quantity=?, updated_at=NOW() WHERE id=?', [newQty, pos.id])
    }
  }
}

async function deleteTrade(id) {
  if (!id) return false
  const result = await db.query('DELETE FROM stock_trade WHERE id = ?', [id])
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
    await db.query(
      'UPDATE stock_indicator SET stock_code=?, name=?, value=?, remark=?, updated_at=NOW() WHERE id=?',
      [stock_code, name, value || null, remark || null, id]
    )
    const rows = await db.query('SELECT * FROM stock_indicator WHERE id = ?', [id])
    return rows[0] || null
  }

  const newId = Date.now()
  await db.query(
    'INSERT INTO stock_indicator (id, stock_code, name, value, remark, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
    [newId, stock_code, name, value || null, remark || null]
  )
  const rows = await db.query('SELECT * FROM stock_indicator WHERE id = ?', [newId])
  return rows[0] || null
}

async function deleteIndicator(id) {
  if (!id) return false
  const result = await db.query('DELETE FROM stock_indicator WHERE id = ?', [id])
  return result.affectedRows > 0
}

module.exports = {
  getTrades, getTradeById, getTradeCount, saveTrade, deleteTrade,
  getPositions, getPositionById, savePosition, deletePosition,
  getIndicators, saveIndicator, deleteIndicator
}

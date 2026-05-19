const db = require('./db')

async function getCategories() {
  return db.query('SELECT id, parent_id, name, description, sort_order FROM diary_category ORDER BY sort_order, id')
}

async function getDiaries({ categoryId, keyword, limit = 50, offset = 0 }) {
  let sql = 'SELECT d.id, d.category_id, d.title, d.content, d.diary_date, d.tags, d.created_at, d.updated_at, c.name AS category_name FROM diary d LEFT JOIN diary_category c ON d.category_id = c.id WHERE 1=1'
  const params = []

  if (categoryId) {
    sql += ' AND d.category_id = ?'
    params.push(categoryId)
  }
  if (keyword) {
    sql += ' AND (d.title LIKE ? OR d.content LIKE ? OR d.tags LIKE ?)'
    const like = `%${keyword}%`
    params.push(like, like, like)
  }

  sql += ` ORDER BY d.diary_date DESC, d.id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`

  return db.query(sql, params)
}

async function getDiaryById(id) {
  const rows = await db.query(
    'SELECT d.*, c.name AS category_name FROM diary d LEFT JOIN diary_category c ON d.category_id = c.id WHERE d.id = ?',
    [id]
  )
  return rows[0] || null
}

async function getDiaryCount(categoryId) {
  let sql = 'SELECT COUNT(*) AS cnt FROM diary'
  const params = []
  if (categoryId) {
    sql += ' WHERE category_id = ?'
    params.push(categoryId)
  }
  const rows = await db.query(sql, params)
  return rows[0].cnt
}

async function saveDiary({ id, category_id, title, content, diary_date, tags }) {
  if (!title || !content) return null

  if (id) {
    await db.query(
      'UPDATE diary SET category_id=?, title=?, content=?, diary_date=?, tags=?, updated_at=NOW() WHERE id=?',
      [category_id || null, title, content, diary_date || null, tags || null, id]
    )
    return getDiaryById(id)
  }

  const newId = Date.now()
  await db.query(
    'INSERT INTO diary (id, category_id, title, content, diary_date, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [newId, category_id || null, title, content, diary_date || null, tags || null]
  )
  return getDiaryById(newId)
}

async function deleteDiary(id) {
  if (!id) return false
  const result = await db.query('DELETE FROM diary WHERE id = ?', [id])
  return result.affectedRows > 0
}

module.exports = { getCategories, getDiaries, getDiaryById, getDiaryCount, saveDiary, deleteDiary }

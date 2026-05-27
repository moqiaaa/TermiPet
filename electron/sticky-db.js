const { query } = require('./db')

function rowToFrontend(row) {
  let blocks = []
  if (row.blocks_json) {
    try {
      blocks = JSON.parse(row.blocks_json)
    } catch { blocks = [] }
  }
  // backward compat: if no blocks but has content, create a single text block
  if (blocks.length === 0 && row.content) {
    blocks = [{ type: 'text', content: row.content }]
  }
  return {
    id: row.id,
    title: row.title,
    content: row.content || '',
    blocks,
    color: row.color || 'default',
    pinned: !!row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  }
}

async function getStickyNotes() {
  const rows = await query('SELECT * FROM sticky_note ORDER BY updated_at DESC')
  return rows.map(rowToFrontend)
}

async function saveStickyNote(note) {
  if (!note || typeof note.id !== 'string' || !note.id) return null

  const now = Date.now()
  // Derive plain text content from blocks for backward compat
  const plainContent = (note.blocks || [])
    .filter(b => b.type === 'text')
    .map(b => b.content)
    .join('\n')
  const blocksJson = JSON.stringify(note.blocks || [])

  await query(
    `INSERT INTO sticky_note (id, title, content, blocks_json, color, pinned, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       content = VALUES(content),
       blocks_json = VALUES(blocks_json),
       color = VALUES(color),
       pinned = VALUES(pinned),
       updated_at = VALUES(updated_at)`,
    [
      note.id,
      note.title || '',
      plainContent,
      blocksJson,
      note.color || 'default',
      note.pinned ? 1 : 0,
      note.createdAt || now,
      now,
    ]
  )

  return getStickyNotes()
}

async function deleteStickyNote(id) {
  if (typeof id !== 'string' || !id) return null
  await query('DELETE FROM sticky_note WHERE id = ?', [id])
  return getStickyNotes()
}

module.exports = { getStickyNotes, saveStickyNote, deleteStickyNote }

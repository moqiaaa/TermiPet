const { query } = require('./db')

function rowToFrontend(row) {
  return {
    id: row.id,
    sceneName: row.scene_name || '',
    rawText: row.raw_text || '',
    summary: row.summary || '',
    todoSummary: row.todo_summary || '',
    audioPath: row.audio_path || '',
    duration: row.duration || 0,
    createdAt: row.created_at,
  }
}

async function getRecordings(limit = 50, offset = 0) {
  const rows = await query(
    'SELECT * FROM recording ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [Number(limit) || 50, Number(offset) || 0]
  )
  return rows.map(rowToFrontend)
}

async function getRecordingById(id) {
  const rows = await query('SELECT * FROM recording WHERE id = ?', [id])
  if (rows.length === 0) return null
  return rowToFrontend(rows[0])
}

async function saveRecording(rec) {
  const result = await query(
    `INSERT INTO recording (scene_name, raw_text, summary, todo_summary, audio_path, duration, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      rec.sceneName || '',
      rec.rawText || '',
      rec.summary || '',
      rec.todoSummary || '',
      rec.audioPath || '',
      rec.duration || 0,
      rec.createdAt || Date.now(),
    ]
  )
  return result.insertId
}

async function deleteRecording(id) {
  await query('DELETE FROM recording WHERE id = ?', [id])
}

module.exports = { getRecordings, getRecordingById, saveRecording, deleteRecording }

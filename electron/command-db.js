const { query } = require('./db')

// -- snake_case DB row -> camelCase frontend object --

function commandRowToFrontend(row) {
  return {
    id: row.id,
    name: row.name,
    command: row.command,
    description: row.description || undefined,
    pinned: !!row.pinned,
    isCustom: !!row.is_custom,
  }
}

async function getCommands() {
  const rows = await query('SELECT * FROM command ORDER BY created_at')
  return rows.map(commandRowToFrontend)
}

async function saveCommand(cmd) {
  await query(
    `INSERT INTO command (id, name, command, description, pinned, is_custom)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       command = VALUES(command),
       description = VALUES(description),
       pinned = VALUES(pinned),
       is_custom = VALUES(is_custom)`,
    [
      cmd.id,
      cmd.name,
      cmd.command,
      cmd.description || null,
      cmd.pinned ? 1 : 0,
      cmd.isCustom !== undefined ? (cmd.isCustom ? 1 : 0) : 1,
    ]
  )
}

async function deleteCommand(id) {
  await query('DELETE FROM command WHERE id = ?', [id])
}

module.exports = { getCommands, saveCommand, deleteCommand }

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

async function saveCommands(commands) {
  // Replace all: delete existing, insert new
  await query('DELETE FROM command')

  if (commands && commands.length > 0) {
    for (const cmd of commands) {
      await query(
        `INSERT INTO command (id, name, command, description, pinned, is_custom)
         VALUES (?, ?, ?, ?, ?, ?)`,
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
  }
}

module.exports = { getCommands, saveCommands }

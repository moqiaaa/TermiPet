const { getConfig, setConfig } = require('./config-db')
const { saveModeShortcutConfig } = require('./shortcut-db')
const { query } = require('./db')

async function migrateFromStore(store) {
  // Check if already migrated
  const migrated = await getConfig('migrated_from_store')
  if (migrated === true || migrated === 'true') {
    return false
  }

  console.log('[migrate] Starting migration from electron-store to MySQL...')

  // -- Migrate projects --
  const projects = store.get('projects') || []
  for (const p of projects) {
    await query(
      `INSERT INTO project (id, name, color, created_at)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         color = VALUES(color)`,
      [p.id, p.name, p.color || null, p.createdAt || 0]
    )
  }
  console.log(`[migrate] Migrated ${projects.length} projects`)

  // -- Migrate todos --
  const todos = store.get('todos') || []
  for (const t of todos) {
    const subtasksStr = t.subtasks ? JSON.stringify(t.subtasks) : null
    await query(
      `INSERT INTO todo (id, title, done, project_id, due_date, reminder_at, note, notified,
        priority, status, repeat_rule, estimated_minutes, subtasks, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         done = VALUES(done),
         project_id = VALUES(project_id)`,
      [
        t.id,
        t.title,
        t.done ? 1 : 0,
        t.projectId || null,
        t.dueDate || null,
        t.reminderAt || null,
        t.note || null,
        t.notified ? 1 : 0,
        t.priority || null,
        t.status || 'backlog',
        t.repeatRule || null,
        t.estimatedMinutes ?? null,
        subtasksStr,
        t.completedAt ?? null,
        t.createdAt || Date.now(),
        t.updatedAt ?? null,
      ]
    )
  }
  console.log(`[migrate] Migrated ${todos.length} todos`)

  // -- Migrate scenes --
  const scenes = store.get('scenes') || []
  for (const s of scenes) {
    await query(
      `INSERT INTO scene (id, name, summary_prompt, todo_prompt)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         summary_prompt = VALUES(summary_prompt),
         todo_prompt = VALUES(todo_prompt)`,
      [s.id, s.name, s.summaryPrompt || null, s.todoPrompt || null]
    )
  }
  const defaultSceneId = store.get('defaultSceneId')
  if (defaultSceneId) {
    await setConfig('defaultSceneId', defaultSceneId)
  }
  console.log(`[migrate] Migrated ${scenes.length} scenes`)

  // -- Migrate mode shortcut config --
  const modeShortcutConfig = store.get('modeShortcutConfig')
  if (modeShortcutConfig) {
    await saveModeShortcutConfig(modeShortcutConfig)
    console.log('[migrate] Migrated modeShortcutConfig')
  }

  // -- Migrate commands (from commands.json file, not electron-store) --
  // Commands are stored in a separate JSON file, not in electron-store.
  // The migration for commands is skipped here; main.js will handle loading
  // default commands into the DB if the command table is empty.

  // -- Migrate misc app_config values --
  const floatBall = store.get('floatBall')
  if (floatBall) {
    await setConfig('floatBall', floatBall)
  }

  const alicloud = store.get('alicloud')
  if (alicloud) {
    await setConfig('alicloud', alicloud)
  }

  const modeShortcutMigrated_v2 = store.get('modeShortcutMigrated_v2')
  if (modeShortcutMigrated_v2 !== undefined) {
    await setConfig('modeShortcutMigrated_v2', modeShortcutMigrated_v2)
  }

  // Mark as migrated
  await setConfig('migrated_from_store', true)
  console.log('[migrate] Migration complete. Flag set.')

  return true
}

module.exports = { migrateFromStore }

const { query } = require('./db')

// -- snake_case DB row -> camelCase frontend object --

function todoRowToFrontend(row) {
  let subtasks = null
  if (row.subtasks) {
    try {
      subtasks = typeof row.subtasks === 'string'
        ? JSON.parse(row.subtasks)
        : row.subtasks
    } catch {
      subtasks = null
    }
  }
  return {
    id: row.id,
    title: row.title,
    done: !!row.done,
    projectId: row.project_id,
    dueDate: row.due_date || undefined,
    reminderAt: row.reminder_at || undefined,
    note: row.note || undefined,
    notified: !!row.notified,
    priority: row.priority || undefined,
    status: row.status || undefined,
    repeatRule: row.repeat_rule || undefined,
    estimatedMinutes: row.estimated_minutes ?? undefined,
    subtasks: subtasks || undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  }
}

function projectRowToFrontend(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  }
}

// -- Todos --

async function getTodos() {
  const rows = await query('SELECT * FROM todo ORDER BY created_at DESC')
  return rows.map(todoRowToFrontend)
}

async function saveTodo(todo) {
  if (!todo || typeof todo.id !== 'string' || !todo.id) return null
  if (typeof todo.title !== 'string' || !todo.title.trim()) return null

  const subtasksStr = todo.subtasks ? JSON.stringify(todo.subtasks) : null

  await query(
    `INSERT INTO todo (id, title, done, project_id, due_date, reminder_at, note, notified,
      priority, status, repeat_rule, estimated_minutes, subtasks, completed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       done = VALUES(done),
       project_id = VALUES(project_id),
       due_date = VALUES(due_date),
       reminder_at = VALUES(reminder_at),
       note = VALUES(note),
       notified = VALUES(notified),
       priority = VALUES(priority),
       status = VALUES(status),
       repeat_rule = VALUES(repeat_rule),
       estimated_minutes = VALUES(estimated_minutes),
       subtasks = VALUES(subtasks),
       completed_at = VALUES(completed_at),
       updated_at = VALUES(updated_at)`,
    [
      todo.id,
      todo.title,
      todo.done ? 1 : 0,
      todo.projectId || null,
      todo.dueDate || null,
      todo.reminderAt || null,
      todo.note || null,
      todo.notified ? 1 : 0,
      todo.priority || null,
      todo.status || 'backlog',
      todo.repeatRule || null,
      todo.estimatedMinutes ?? null,
      subtasksStr,
      todo.completedAt ?? null,
      todo.createdAt,
      todo.updatedAt ?? null,
    ]
  )

  return getTodos()
}

async function deleteTodo(id) {
  if (typeof id !== 'string' || !id) return null
  await query('DELETE FROM todo WHERE id = ?', [id])
  return getTodos()
}

// -- Projects --

async function getProjects() {
  const rows = await query('SELECT * FROM project ORDER BY created_at')
  return rows.map(projectRowToFrontend)
}

async function saveProject(project) {
  if (!project || typeof project.id !== 'string' || !project.id) return null
  if (typeof project.name !== 'string' || !project.name.trim()) return null
  if (project.id === 'inbox') return null

  await query(
    `INSERT INTO project (id, name, color, created_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       color = VALUES(color)`,
    [
      project.id,
      project.name,
      project.color || null,
      project.createdAt,
    ]
  )

  return getProjects()
}

async function deleteProject(id) {
  if (typeof id !== 'string' || !id || id === 'inbox') return null

  const existing = await query('SELECT id FROM project WHERE id = ?', [id])
  if (existing.length === 0) return null

  // Reset todos with this project_id to 'inbox'
  await query(
    'UPDATE todo SET project_id = ? WHERE project_id = ?',
    ['inbox', id]
  )

  await query('DELETE FROM project WHERE id = ?', [id])

  const projects = await getProjects()
  const todos = await getTodos()
  return { projects, todos }
}

module.exports = {
  getTodos,
  saveTodo,
  deleteTodo,
  getProjects,
  saveProject,
  deleteProject,
}

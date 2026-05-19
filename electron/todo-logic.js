function saveTodo(todos, todo) {
  if (!todo || typeof todo.id !== 'string' || !todo.id) return null
  if (typeof todo.title !== 'string' || !todo.title.trim()) return null
  const idx = todos.findIndex(t => t.id === todo.id)
  if (idx >= 0) return todos.map((t, i) => i === idx ? { ...t, ...todo } : t)
  return [...todos, todo]
}

function deleteTodo(todos, id) {
  if (typeof id !== 'string' || !id) return null
  return todos.filter(t => t.id !== id)
}

function saveProject(projects, project) {
  if (!project || typeof project.id !== 'string' || !project.id) return null
  if (typeof project.name !== 'string' || !project.name.trim()) return null
  if (project.id === 'inbox') return null
  const idx = projects.findIndex(p => p.id === project.id)
  if (idx >= 0) return projects.map((p, i) => i === idx ? { ...p, ...project } : p)
  return [...projects, project]
}

function deleteProject(projects, todos, id) {
  if (typeof id !== 'string' || !id || id === 'inbox') return null
  if (!projects.some(p => p.id === id)) return null
  return {
    projects: projects.filter(p => p.id !== id),
    todos: todos.map(t => t.projectId === id ? { ...t, projectId: 'inbox' } : t)
  }
}

module.exports = { saveTodo, deleteTodo, saveProject, deleteProject }

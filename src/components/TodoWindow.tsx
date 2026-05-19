import { useState, useEffect, useCallback } from 'react'
import type { Todo, Project } from '../types/pet'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function TodoWindow() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  const loadData = useCallback(async () => {
    const api = window.electronAPI
    if (!api) return
    const [t, p] = await Promise.all([api.getTodos(), api.getProjects()])
    setTodos(t || [])
    setProjects(p || [])
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredTodos = selectedProjectId
    ? todos.filter(t => t.projectId === selectedProjectId)
    : todos

  const activeTodos = filteredTodos.filter(t => !t.done)
  const doneTodos = filteredTodos.filter(t => t.done)

  const handleAddTodo = async () => {
    if (!newTitle.trim()) return
    const todo: Todo = {
      id: generateId(),
      title: newTitle.trim(),
      done: false,
      projectId: selectedProjectId || 'inbox',
      createdAt: Date.now(),
    }
    await window.electronAPI?.saveTodo(todo)
    setNewTitle('')
    loadData()
  }

  const handleToggleDone = async (todo: Todo) => {
    await window.electronAPI?.saveTodo({ ...todo, done: !todo.done })
    loadData()
  }

  const handleDeleteTodo = async (id: string) => {
    await window.electronAPI?.deleteTodo(id)
    loadData()
  }

  const handleSaveEdit = async () => {
    if (!editingTodo) return
    await window.electronAPI?.saveTodo(editingTodo)
    setEditingTodo(null)
    loadData()
  }

  const handleAddProject = async () => {
    if (!newProjectName.trim()) return
    const project: Project = {
      id: generateId(),
      name: newProjectName.trim(),
      color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
      createdAt: Date.now(),
    }
    await window.electronAPI?.saveProject(project)
    setNewProjectName('')
    setShowProjectForm(false)
    loadData()
  }

  const handleDeleteProject = async (id: string) => {
    await window.electronAPI?.deleteProject(id)
    if (selectedProjectId === id) setSelectedProjectId(null)
    loadData()
  }

  return (
    <div className="sub-window todo-window">
      <div className="sub-window-sidebar">
        <h3>项目</h3>
        <ul className="project-list">
          <li
            className={`project-item ${selectedProjectId === null ? 'active' : ''}`}
            onClick={() => setSelectedProjectId(null)}
          >
            全部 <span className="badge">{todos.length}</span>
          </li>
          {projects.map(p => (
            <li
              key={p.id}
              className={`project-item ${selectedProjectId === p.id ? 'active' : ''}`}
              onClick={() => setSelectedProjectId(p.id)}
            >
              <span className="project-dot" style={{ background: p.color }} />
              {p.name}
              <span className="badge">{todos.filter(t => t.projectId === p.id).length}</span>
              {p.id !== 'inbox' && (
                <button
                  className="delete-btn-sm"
                  onClick={e => { e.stopPropagation(); handleDeleteProject(p.id) }}
                >×</button>
              )}
            </li>
          ))}
        </ul>
        {showProjectForm ? (
          <div className="project-form">
            <input
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              placeholder="项目名称"
              onKeyDown={e => e.key === 'Enter' && handleAddProject()}
              autoFocus
            />
            <button onClick={handleAddProject}>添加</button>
            <button onClick={() => setShowProjectForm(false)}>取消</button>
          </div>
        ) : (
          <button className="add-project-btn" onClick={() => setShowProjectForm(true)}>+ 新建项目</button>
        )}
      </div>

      <div className="sub-window-main">
        <h2>待办事项</h2>

        <div className="todo-input-row">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="添加新待办..."
            onKeyDown={e => e.key === 'Enter' && handleAddTodo()}
          />
          <button onClick={handleAddTodo}>添加</button>
        </div>

        {editingTodo && (
          <div className="todo-edit-modal">
            <div className="todo-edit-content">
              <h3>编辑待办</h3>
              <input
                value={editingTodo.title}
                onChange={e => setEditingTodo({ ...editingTodo, title: e.target.value })}
              />
              <textarea
                value={editingTodo.note || ''}
                onChange={e => setEditingTodo({ ...editingTodo, note: e.target.value })}
                placeholder="备注..."
                rows={3}
              />
              <input
                type="date"
                value={editingTodo.dueDate || ''}
                onChange={e => setEditingTodo({ ...editingTodo, dueDate: e.target.value })}
              />
              <select
                value={editingTodo.projectId}
                onChange={e => setEditingTodo({ ...editingTodo, projectId: e.target.value })}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="todo-edit-actions">
                <button onClick={handleSaveEdit}>保存</button>
                <button onClick={() => setEditingTodo(null)}>取消</button>
              </div>
            </div>
          </div>
        )}

        <div className="todo-list">
          {activeTodos.map(todo => (
            <div key={todo.id} className="todo-item">
              <input
                type="checkbox"
                checked={false}
                onChange={() => handleToggleDone(todo)}
              />
              <span className="todo-title" onClick={() => setEditingTodo(todo)}>{todo.title}</span>
              {todo.dueDate && <span className="todo-due">{todo.dueDate}</span>}
              <button className="delete-btn-sm" onClick={() => handleDeleteTodo(todo.id)}>×</button>
            </div>
          ))}
        </div>

        {doneTodos.length > 0 && (
          <>
            <h3 className="done-header">已完成 ({doneTodos.length})</h3>
            <div className="todo-list done">
              {doneTodos.map(todo => (
                <div key={todo.id} className="todo-item done">
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => handleToggleDone(todo)}
                  />
                  <span className="todo-title">{todo.title}</span>
                  <button className="delete-btn-sm" onClick={() => handleDeleteTodo(todo.id)}>×</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import type { Diary, DiaryCategory } from '../types/pet'

export function DiaryWindow() {
  const [categories, setCategories] = useState<DiaryCategory[]>([])
  const [diaries, setDiaries] = useState<Diary[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>()
  const [keyword, setKeyword] = useState('')
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', diary_date: '', tags: '', category_id: undefined as number | undefined })

  const loadCategories = useCallback(async () => {
    const cats = await window.electronAPI?.getDiaryCategories()
    setCategories(cats || [])
  }, [])

  const loadDiaries = useCallback(async () => {
    const list = await window.electronAPI?.getDiaries({
      categoryId: selectedCategoryId,
      keyword: keyword || undefined,
      limit: 100,
      offset: 0,
    })
    setDiaries(list || [])
  }, [selectedCategoryId, keyword])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { loadDiaries() }, [loadDiaries])

  const handleSelectDiary = async (id: number) => {
    const diary = await window.electronAPI?.getDiaryById(id)
    setSelectedDiary(diary)
    setEditing(false)
  }

  const handleNew = () => {
    setSelectedDiary(null)
    setForm({
      title: '',
      content: '',
      diary_date: new Date().toISOString().slice(0, 10),
      tags: '',
      category_id: selectedCategoryId,
    })
    setEditing(true)
  }

  const handleEdit = () => {
    if (!selectedDiary) return
    setForm({
      title: selectedDiary.title,
      content: selectedDiary.content,
      diary_date: selectedDiary.diary_date || '',
      tags: selectedDiary.tags || '',
      category_id: selectedDiary.category_id ?? undefined,
    })
    setEditing(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    const saved = await window.electronAPI?.saveDiary({
      id: selectedDiary?.id,
      category_id: form.category_id ?? null,
      title: form.title,
      content: form.content,
      diary_date: form.diary_date || null,
      tags: form.tags || null,
    })
    if (saved) {
      setSelectedDiary(saved)
      setEditing(false)
      loadDiaries()
    }
  }

  const handleDelete = async () => {
    if (!selectedDiary) return
    await window.electronAPI?.deleteDiary(selectedDiary.id)
    setSelectedDiary(null)
    setEditing(false)
    loadDiaries()
  }

  return (
    <div className="sub-window diary-window">
      <div className="sub-window-sidebar">
        <h3>分类</h3>
        <ul className="project-list">
          <li
            className={`project-item ${selectedCategoryId === undefined ? 'active' : ''}`}
            onClick={() => setSelectedCategoryId(undefined)}
          >
            全部
          </li>
          {categories.map(c => (
            <li
              key={c.id}
              className={`project-item ${selectedCategoryId === c.id ? 'active' : ''}`}
              onClick={() => setSelectedCategoryId(c.id)}
            >
              {c.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="diary-list-panel">
        <div className="diary-list-header">
          <input
            className="diary-search"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="搜索..."
          />
          <button className="add-btn" onClick={handleNew}>+ 新建</button>
        </div>
        <ul className="diary-list">
          {diaries.map(d => (
            <li
              key={d.id}
              className={`diary-list-item ${selectedDiary?.id === d.id ? 'active' : ''}`}
              onClick={() => handleSelectDiary(d.id)}
            >
              <div className="diary-list-title">{d.title}</div>
              <div className="diary-list-meta">
                {d.diary_date || d.created_at?.slice(0, 10)}
                {d.category_name && ` · ${d.category_name}`}
              </div>
            </li>
          ))}
          {diaries.length === 0 && <li className="diary-empty">暂无日记</li>}
        </ul>
      </div>

      <div className="diary-detail-panel">
        {editing ? (
          <div className="diary-form">
            <input
              className="diary-form-title"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="标题"
            />
            <div className="diary-form-row">
              <input
                type="date"
                value={form.diary_date}
                onChange={e => setForm({ ...form, diary_date: e.target.value })}
              />
              <select
                value={form.category_id ?? ''}
                onChange={e => setForm({ ...form, category_id: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">无分类</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                value={form.tags}
                onChange={e => setForm({ ...form, tags: e.target.value })}
                placeholder="标签（逗号分隔）"
              />
            </div>
            <textarea
              className="diary-form-content"
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              placeholder="写点什么..."
              rows={15}
            />
            <div className="diary-form-actions">
              <button onClick={handleSave}>保存</button>
              <button onClick={() => setEditing(false)}>取消</button>
            </div>
          </div>
        ) : selectedDiary ? (
          <div className="diary-detail">
            <h2>{selectedDiary.title}</h2>
            <div className="diary-detail-meta">
              {selectedDiary.diary_date}
              {selectedDiary.category_name && ` · ${selectedDiary.category_name}`}
              {selectedDiary.tags && ` · ${selectedDiary.tags}`}
            </div>
            <div className="diary-detail-content">{selectedDiary.content}</div>
            <div className="diary-detail-actions">
              <button onClick={handleEdit}>编辑</button>
              <button className="danger-btn" onClick={handleDelete}>删除</button>
            </div>
          </div>
        ) : (
          <div className="diary-empty-detail">选择或新建一篇日记</div>
        )}
      </div>
    </div>
  )
}

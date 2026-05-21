import { useState, useEffect } from 'react'
import type { PetMetadata, Settings, Command, Scene } from '../types/pet'
import { PetSelector } from './PetSelector'
import { ModeShortcutSettings } from './ModeShortcutSettings'

type SettingsTab = 'about' | 'pet' | 'personality' | 'model' | 'commands' | 'shortcuts' | 'recording' | 'prompts' | 'appearance'

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'about', label: '关于' },
  { key: 'pet', label: '宠物' },
  { key: 'personality', label: '性格' },
  { key: 'model', label: '模型' },
  { key: 'commands', label: '命令' },
  { key: 'shortcuts', label: '快捷栏' },
  { key: 'recording', label: '录音' },
  { key: 'prompts', label: '提示词' },
  { key: 'appearance', label: '外观' },
]

interface SystemPrompt {
  key: string
  name: string
  prompt: string
}

const DEFAULT_PROMPTS: SystemPrompt[] = [
  {
    key: 'ocr_trade',
    name: 'OCR 交易识别',
    prompt: '你是一个股票交易截图识别助手。从截图中提取交易信息，返回 JSON 格式，字段包括：stock_name(证券名称), stock_code(证券代码), direction(买卖方向，买入=1，卖出=2), price(成交价格，数字), quantity(成交数量，数字), trade_time(成交时间)。只返回 JSON，不要其他文字。',
  },
]

const PERSONALITIES = [
  { value: 'happy', label: '快乐' },
  { value: 'coding', label: '编程' },
  { value: 'gentle', label: '温柔' },
  { value: 'focused', label: '专注' },
  { value: 'angry', label: '暴躁' },
  { value: 'lazy', label: '慵懒' },
  { value: 'energetic', label: '活力' },
  { value: 'wise', label: '智慧' },
  { value: 'sarcastic', label: '毒舌' },
]

const PROVIDERS = [
  { value: 'ollama', label: 'Ollama' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google' },
  { value: 'custom', label: '自定义' },
]

const SKINS = [
  { value: 'glass', label: '毛玻璃' },
  { value: 'dark', label: '深色' },
  { value: 'pixel', label: '像素' },
]

const LANGUAGES = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
]

const DEFAULT_SETTINGS: Settings = {
  language: 'zh-CN',
  skin: 'glass',
  petName: '',
  ownerName: '',
  personality: 'happy',
  customPrompt: '',
  chatProvider: 'ollama',
  ollamaModel: '',
  apiKeys: {},
}

export function SettingsWindow() {
  const [tab, setTab] = useState<SettingsTab>('about')
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [pets, setPets] = useState<PetMetadata[]>([])
  const [selectedPetId, setSelectedPetId] = useState('')
  const [commands, setCommands] = useState<Command[]>([])
  const [showPetSelector, setShowPetSelector] = useState(false)
  const [testStatus, setTestStatus] = useState('')
  const [scenes, setScenes] = useState<Scene[]>([])
  const [defaultSceneId, setDefaultSceneId] = useState('')
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null)
  const [draftScene, setDraftScene] = useState<Scene | null>(null)
  const [prompts, setPrompts] = useState<SystemPrompt[]>(DEFAULT_PROMPTS)
  const [editingPromptKey, setEditingPromptKey] = useState<string | null>(null)

  useEffect(() => {
    window.electronAPI?.getSettings?.().then((s) => {
      if (s) setSettings(s)
    }).catch(() => {})

    window.electronAPI?.getPets?.().then(setPets).catch(() => {})
    window.electronAPI?.getSelectedPet?.().then(setSelectedPetId).catch(() => {})
    window.electronAPI?.getCommands?.().then(setCommands).catch(() => {})
    window.electronAPI?.getScenes?.().then((data) => {
      if (data) {
        setScenes(data.scenes)
        setDefaultSceneId(data.defaultSceneId)
      }
    }).catch(() => {})
    window.electronAPI?.storeGet?.('system_prompts').then((stored) => {
      if (Array.isArray(stored) && stored.length > 0) {
        const merged = DEFAULT_PROMPTS.map(dp => {
          const found = (stored as SystemPrompt[]).find(s => s.key === dp.key)
          return found ? { ...dp, prompt: found.prompt } : dp
        })
        const custom = (stored as SystemPrompt[]).filter(s => !DEFAULT_PROMPTS.some(dp => dp.key === s.key))
        setPrompts([...merged, ...custom])
      }
    }).catch(() => {})
  }, [])

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    window.electronAPI?.saveSettings?.(updated)
  }

  const handlePetSelect = async (pet: PetMetadata) => {
    setSelectedPetId(pet.id)
    setShowPetSelector(false)
    await window.electronAPI?.setSelectedPet?.(pet.id)
  }

  const handleBack = () => {
    window.location.hash = '#/'
  }

  const handleAddCommand = () => {
    const name = prompt('命令名称：')
    if (!name) return
    const command = prompt('命令内容：')
    if (!command) return

    const newCmd: Command = {
      id: Date.now().toString(),
      name,
      command,
      pinned: false,
      isCustom: true,
    }
    setCommands([...commands, newCmd])
    window.electronAPI?.saveCommand?.(newCmd)
  }

  const handleDeleteCommand = (id: string) => {
    setCommands(commands.filter((c) => c.id !== id))
    window.electronAPI?.deleteCommand?.(id)
  }

  const handleTogglePin = (id: string) => {
    const cmd = commands.find((c) => c.id === id)
    if (!cmd) return
    const updated = { ...cmd, pinned: !cmd.pinned }
    setCommands(commands.map((c) => c.id === id ? updated : c))
    window.electronAPI?.saveCommand?.(updated)
  }

  const handleTestConnection = () => {
    setTestStatus('测试中……')
    setTimeout(() => setTestStatus('连接成功'), 1500)
  }

  const handleAddScene = () => {
    if (draftScene) return
    const id = `scene-${Date.now().toString(36)}`
    setDraftScene({ id, name: '', summaryPrompt: '', todoPrompt: '' })
    setEditingSceneId(null)
  }

  const handleSaveDraft = () => {
    if (!draftScene || !draftScene.name.trim()) return
    const saved = { ...draftScene, name: draftScene.name.trim() }
    setScenes([...scenes, saved])
    window.electronAPI?.saveScene?.(saved)
    setEditingSceneId(saved.id)
    setDraftScene(null)
  }

  const handleCancelDraft = () => {
    setDraftScene(null)
  }

  const handleDeleteScene = (id: string) => {
    setScenes(scenes.filter((s) => s.id !== id))
    window.electronAPI?.deleteScene?.(id)
    if (defaultSceneId === id) {
      const newDefault = scenes.find((s) => s.id !== id)?.id || ''
      setDefaultSceneId(newDefault)
      window.electronAPI?.setDefaultScene?.(newDefault)
    }
    if (editingSceneId === id) setEditingSceneId(null)
  }

  const handleUpdateScene = (id: string, field: keyof Scene, value: string) => {
    const scene = scenes.find((s) => s.id === id)
    if (!scene) return
    const updated = { ...scene, [field]: value }
    setScenes(scenes.map((s) => s.id === id ? updated : s))
    window.electronAPI?.saveScene?.(updated)
  }

  const savePrompts = (updated: SystemPrompt[]) => {
    setPrompts(updated)
    window.electronAPI?.storeSet?.('system_prompts', updated)
  }

  const handleUpdatePrompt = (key: string, prompt: string) => {
    const updated = prompts.map(p => p.key === key ? { ...p, prompt } : p)
    savePrompts(updated)
  }

  const handleAddPrompt = () => {
    const name = window.prompt('提示词名称：')
    if (!name) return
    const key = `custom_${Date.now().toString(36)}`
    const updated = [...prompts, { key, name, prompt: '' }]
    savePrompts(updated)
    setEditingPromptKey(key)
  }

  const handleDeletePrompt = (key: string) => {
    if (DEFAULT_PROMPTS.some(p => p.key === key)) return
    const updated = prompts.filter(p => p.key !== key)
    savePrompts(updated)
    if (editingPromptKey === key) setEditingPromptKey(null)
  }

  const handleResetPrompt = (key: string) => {
    const defaultPrompt = DEFAULT_PROMPTS.find(p => p.key === key)
    if (!defaultPrompt) return
    handleUpdatePrompt(key, defaultPrompt.prompt)
  }

  return (
    <div className="settings-window">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={handleBack}>← 返回</button>
        <span className="settings-title">设置</span>
      </div>

      <div className="settings-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`settings-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="settings-content">
        {tab === 'about' && (
          <div className="settings-section">
            <div className="about-logo">🐾</div>
            <h2 className="about-name">TermiPet</h2>
            <div className="about-version">v0.1.0</div>
            <p className="about-desc">
              桌面编程伙伴宠物。陪伴你编程，监控 Claude 状态，
              管理命令，聊天互动。
            </p>
          </div>
        )}

        {tab === 'pet' && (
          <div className="settings-section">
            <div className="settings-field">
              <label>当前宠物</label>
              <div className="settings-pet-current">
                <span>{pets.find((p) => p.id === selectedPetId)?.displayName || '未选择'}</span>
                <button className="settings-btn" onClick={() => setShowPetSelector(true)}>
                  更换
                </button>
              </div>
            </div>
            {showPetSelector && (
              <PetSelector
                pets={pets}
                selectedPetId={selectedPetId}
                onSelect={handlePetSelect}
                onClose={() => setShowPetSelector(false)}
              />
            )}
          </div>
        )}

        {tab === 'personality' && (
          <div className="settings-section">
            <div className="settings-field">
              <label>宠物名字</label>
              <input
                className="settings-input"
                value={settings.petName}
                onChange={(e) => updateSetting('petName', e.target.value)}
                placeholder="给宠物起个名字"
              />
            </div>
            <div className="settings-field">
              <label>主人名字</label>
              <input
                className="settings-input"
                value={settings.ownerName}
                onChange={(e) => updateSetting('ownerName', e.target.value)}
                placeholder="你的名字"
              />
            </div>
            <div className="settings-field">
              <label>性格</label>
              <select
                className="settings-select"
                value={settings.personality}
                onChange={(e) => updateSetting('personality', e.target.value)}
              >
                {PERSONALITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="settings-field">
              <label>自定义提示词</label>
              <textarea
                className="settings-textarea"
                value={settings.customPrompt}
                onChange={(e) => updateSetting('customPrompt', e.target.value)}
                placeholder="自定义宠物的行为提示词……"
                rows={4}
              />
            </div>
          </div>
        )}

        {tab === 'model' && (
          <div className="settings-section">
            <div className="settings-field">
              <label>AI 提供商</label>
              <select
                className="settings-select"
                value={settings.chatProvider}
                onChange={(e) => updateSetting('chatProvider', e.target.value)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            {settings.chatProvider === 'ollama' && (
              <div className="settings-field">
                <label>Ollama 模型</label>
                <input
                  className="settings-input"
                  value={settings.ollamaModel}
                  onChange={(e) => updateSetting('ollamaModel', e.target.value)}
                  placeholder="例如: llama3"
                />
              </div>
            )}
            {settings.chatProvider !== 'ollama' && (
              <div className="settings-field">
                <label>API Key</label>
                <input
                  className="settings-input"
                  type="password"
                  value={settings.apiKeys[settings.chatProvider] || ''}
                  onChange={(e) => {
                    const keys = { ...settings.apiKeys, [settings.chatProvider]: e.target.value }
                    updateSetting('apiKeys', keys)
                  }}
                  placeholder="输入 API Key"
                />
              </div>
            )}
            <div className="settings-field">
              <button className="settings-btn" onClick={handleTestConnection}>
                测试连接
              </button>
              {testStatus && <span className="settings-test-status">{testStatus}</span>}
            </div>
          </div>
        )}

        {tab === 'commands' && (
          <div className="settings-section">
            <div className="settings-field-header">
              <label>命令列表</label>
              <button className="settings-btn-small" onClick={handleAddCommand}>+ 添加</button>
            </div>
            <div className="settings-command-list">
              {commands.length === 0 && (
                <div className="settings-empty">暂无命令</div>
              )}
              {commands.map((cmd) => (
                <div key={cmd.id} className="settings-command-item">
                  <button
                    className={`settings-pin-btn ${cmd.pinned ? 'pinned' : ''}`}
                    onClick={() => handleTogglePin(cmd.id)}
                    title={cmd.pinned ? '取消置顶' : '置顶'}
                  >
                    {cmd.pinned ? '⭐' : '☆'}
                  </button>
                  <div className="settings-command-info">
                    <span className="settings-command-name">{cmd.name}</span>
                    <span className="settings-command-text">{cmd.command}</span>
                  </div>
                  {cmd.isCustom && (
                    <button
                      className="settings-delete-btn"
                      onClick={() => handleDeleteCommand(cmd.id)}
                      title="删除"
                    >
                      🗑
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'shortcuts' && (
          <div className="settings-section">
            <ModeShortcutSettings />
          </div>
        )}

        {tab === 'recording' && (
          <div className="settings-section">
            <div className="settings-field">
              <label>默认场景</label>
              <select
                className="settings-select"
                value={defaultSceneId}
                onChange={(e) => {
                  setDefaultSceneId(e.target.value)
                  window.electronAPI?.setDefaultScene?.(e.target.value)
                }}
              >
                {scenes.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="settings-field-header">
              <label>场景列表</label>
              <button
                className="settings-btn-small"
                onClick={handleAddScene}
                disabled={!!draftScene}
              >+ 添加</button>
            </div>
            <div className="settings-command-list">
              {scenes.length === 0 && !draftScene && (
                <div className="settings-empty">暂无场景</div>
              )}
              {scenes.map((scene) => (
                <div key={scene.id} className="settings-scene-item">
                  <div
                    className="settings-scene-header"
                    onClick={() => setEditingSceneId(editingSceneId === scene.id ? null : scene.id)}
                  >
                    <span className="settings-scene-name">
                      {defaultSceneId === scene.id && <span className="settings-scene-default">默认</span>}
                      {scene.name}
                    </span>
                    <div className="settings-scene-actions">
                      <button
                        className="settings-delete-btn"
                        onClick={(e) => { e.stopPropagation(); handleDeleteScene(scene.id) }}
                        title="删除"
                      >🗑</button>
                      <span className="settings-scene-arrow">{editingSceneId === scene.id ? '▾' : '▸'}</span>
                    </div>
                  </div>
                  {editingSceneId === scene.id && (
                    <div className="settings-scene-edit">
                      <div className="settings-field">
                        <label>场景名称</label>
                        <input
                          className="settings-input"
                          value={scene.name}
                          onChange={(e) => handleUpdateScene(scene.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className="settings-field">
                        <label>总结 Prompt</label>
                        <textarea
                          className="settings-textarea"
                          value={scene.summaryPrompt}
                          onChange={(e) => handleUpdateScene(scene.id, 'summaryPrompt', e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="settings-field">
                        <label>待办提取 Prompt</label>
                        <textarea
                          className="settings-textarea"
                          value={scene.todoPrompt}
                          onChange={(e) => handleUpdateScene(scene.id, 'todoPrompt', e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {draftScene && (
                <div className="settings-scene-item">
                  <div className="settings-scene-edit">
                    <div className="settings-field">
                      <label>场景名称</label>
                      <input
                        className="settings-input"
                        placeholder="输入场景名称"
                        value={draftScene.name}
                        onChange={(e) => setDraftScene({ ...draftScene, name: e.target.value })}
                        autoFocus
                      />
                    </div>
                    <div className="settings-field">
                      <label>总结 Prompt</label>
                      <textarea
                        className="settings-textarea"
                        value={draftScene.summaryPrompt}
                        onChange={(e) => setDraftScene({ ...draftScene, summaryPrompt: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="settings-field">
                      <label>待办提取 Prompt</label>
                      <textarea
                        className="settings-textarea"
                        value={draftScene.todoPrompt}
                        onChange={(e) => setDraftScene({ ...draftScene, todoPrompt: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="settings-scene-draft-actions">
                      <button
                        className="settings-btn-small"
                        onClick={handleSaveDraft}
                        disabled={!draftScene.name.trim()}
                      >保存</button>
                      <button
                        className="settings-btn-small settings-btn-cancel"
                        onClick={handleCancelDraft}
                      >取消</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'prompts' && (
          <div className="settings-section">
            <div className="settings-field-header">
              <label>系统提示词</label>
              <button className="settings-btn-small" onClick={handleAddPrompt}>+ 添加</button>
            </div>
            <p className="settings-hint">管理各功能模块的系统提示词，点击展开编辑</p>
            <div className="settings-command-list">
              {prompts.map((p) => (
                <div key={p.key} className="settings-scene-item">
                  <div
                    className="settings-scene-header"
                    onClick={() => setEditingPromptKey(editingPromptKey === p.key ? null : p.key)}
                  >
                    <span className="settings-scene-name">
                      {DEFAULT_PROMPTS.some(dp => dp.key === p.key) && <span className="settings-scene-default">内置</span>}
                      {p.name}
                    </span>
                    <div className="settings-scene-actions">
                      {!DEFAULT_PROMPTS.some(dp => dp.key === p.key) && (
                        <button
                          className="settings-delete-btn"
                          onClick={(e) => { e.stopPropagation(); handleDeletePrompt(p.key) }}
                          title="删除"
                        >🗑</button>
                      )}
                      <span className="settings-scene-arrow">{editingPromptKey === p.key ? '▾' : '▸'}</span>
                    </div>
                  </div>
                  {editingPromptKey === p.key && (
                    <div className="settings-scene-edit">
                      <div className="settings-field">
                        <label>提示词内容</label>
                        <textarea
                          className="settings-textarea"
                          value={p.prompt}
                          onChange={(e) => handleUpdatePrompt(p.key, e.target.value)}
                          rows={6}
                          placeholder="输入系统提示词..."
                        />
                      </div>
                      {DEFAULT_PROMPTS.some(dp => dp.key === p.key) && (
                        <button className="settings-btn-small" onClick={() => handleResetPrompt(p.key)}>
                          恢复默认
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'appearance' && (
          <div className="settings-section">
            <div className="settings-field">
              <label>皮肤</label>
              <select
                className="settings-select"
                value={settings.skin}
                onChange={(e) => updateSetting('skin', e.target.value)}
              >
                {SKINS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="settings-field">
              <label>语言</label>
              <select
                className="settings-select"
                value={settings.language}
                onChange={(e) => updateSetting('language', e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

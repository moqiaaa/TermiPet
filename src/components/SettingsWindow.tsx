import { useState, useEffect } from 'react'
import type { PetMetadata, Settings, Command } from '../types/pet'
import { PetSelector } from './PetSelector'
import { ModeShortcutSettings } from './ModeShortcutSettings'

type SettingsTab = 'about' | 'pet' | 'personality' | 'model' | 'commands' | 'shortcuts' | 'appearance'

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'about', label: '关于' },
  { key: 'pet', label: '宠物' },
  { key: 'personality', label: '性格' },
  { key: 'model', label: '模型' },
  { key: 'commands', label: '命令' },
  { key: 'shortcuts', label: '快捷栏' },
  { key: 'appearance', label: '外观' },
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

  useEffect(() => {
    window.electronAPI?.getSettings?.().then((s) => {
      if (s) setSettings(s)
    }).catch(() => {})

    window.electronAPI?.getPets?.().then(setPets).catch(() => {})
    window.electronAPI?.getSelectedPet?.().then(setSelectedPetId).catch(() => {})
    window.electronAPI?.getCommands?.().then(setCommands).catch(() => {})
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
    const updated = [...commands, newCmd]
    setCommands(updated)
    window.electronAPI?.saveCommands?.(updated)
  }

  const handleDeleteCommand = (id: string) => {
    const updated = commands.filter((c) => c.id !== id)
    setCommands(updated)
    window.electronAPI?.saveCommands?.(updated)
  }

  const handleTogglePin = (id: string) => {
    const updated = commands.map((c) =>
      c.id === id ? { ...c, pinned: !c.pinned } : c
    )
    setCommands(updated)
    window.electronAPI?.saveCommands?.(updated)
  }

  const handleTestConnection = () => {
    setTestStatus('测试中……')
    // Simulate test - in real implementation this would call electronAPI
    setTimeout(() => setTestStatus('连接成功'), 1500)
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

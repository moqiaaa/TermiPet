import { useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useLocale } from '../../locales';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../styles/themes';
import type { ChatProvider } from '../../types/chat';

const providers: { id: ChatProvider; label: string; icon: string }[] = [
  { id: 'ollama', label: 'Ollama', icon: '🦙' },
  { id: 'openai', label: 'OpenAI', icon: '🤖' },
  { id: 'google', label: 'Google Gemini', icon: '🔮' },
  { id: 'custom', label: 'Custom API', icon: '⚙️' },
];

export default function ModelTab() {
  const { t } = useLocale();
  const skin = useSettingsStore((s) => s.skin);
  const theme = getTheme(skin);
  const modelConfig = useChatStore((s) => s.modelConfig);
  const setModelConfig = useChatStore((s) => s.setModelConfig);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: theme.border.radiusSm,
    border: `1px solid ${theme.border.color}`,
    background: theme.bg.input,
    color: theme.text.primary,
    fontSize: theme.font.size.md,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <div>
      <h2 style={{ fontSize: theme.font.size.lg, marginBottom: 16 }}>
        {t('model.title')}
      </h2>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: theme.font.size.sm, color: theme.text.secondary, display: 'block', marginBottom: 8 }}>
          {t('model.providerSource')}
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {providers.map((p) => {
            const isSelected = modelConfig.provider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setModelConfig({ provider: p.id })}
                style={{
                  padding: '8px 16px',
                  borderRadius: theme.border.radiusSm,
                  border: isSelected
                    ? `2px solid ${theme.accent.primary}`
                    : `1px solid ${theme.border.color}`,
                  background: isSelected ? theme.bg.active : theme.bg.card,
                  cursor: 'pointer',
                  fontSize: theme.font.size.sm,
                  fontFamily: 'inherit',
                  color: theme.text.primary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: theme.font.size.sm, color: theme.text.secondary, display: 'block', marginBottom: 4 }}>
            {t('model.selectModel')}
          </label>
          <input
            value={modelConfig.model}
            onChange={(e) => setModelConfig({ model: e.target.value })}
            placeholder={modelConfig.provider === 'ollama' ? 'llama3.2' : 'gpt-4o-mini'}
            style={inputStyle}
          />
        </div>

        {modelConfig.provider !== 'ollama' && (
          <div>
            <label style={{ fontSize: theme.font.size.sm, color: theme.text.secondary, display: 'block', marginBottom: 4 }}>
              API Key
            </label>
            <input
              type="password"
              value={modelConfig.apiKey}
              onChange={(e) => setModelConfig({ apiKey: e.target.value })}
              placeholder="sk-..."
              style={inputStyle}
            />
          </div>
        )}

        {(modelConfig.provider === 'ollama' || modelConfig.provider === 'custom') && (
          <div>
            <label style={{ fontSize: theme.font.size.sm, color: theme.text.secondary, display: 'block', marginBottom: 4 }}>
              Base URL
            </label>
            <input
              value={modelConfig.baseUrl}
              onChange={(e) => setModelConfig({ baseUrl: e.target.value })}
              placeholder={modelConfig.provider === 'ollama' ? 'http://localhost:11434' : 'https://api.example.com/v1'}
              style={inputStyle}
            />
          </div>
        )}

        <button
          onClick={() => {
            setTestStatus('testing');
            setTimeout(() => setTestStatus('success'), 1500);
          }}
          style={{
            padding: '10px 20px',
            borderRadius: theme.border.radiusSm,
            border: 'none',
            background: theme.accent.primary,
            color: theme.text.inverse,
            cursor: 'pointer',
            fontSize: theme.font.size.md,
            fontWeight: 600,
            fontFamily: 'inherit',
            alignSelf: 'flex-start',
          }}
        >
          {testStatus === 'testing' ? t('common.loading') : t('model.testConnection')}
        </button>
      </div>
    </div>
  );
}

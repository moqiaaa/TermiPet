import { useState } from 'react';
import { useCommandStore } from '../../stores/commandStore';
import { useLocale } from '../../locales';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../styles/themes';

export default function CommandsTab() {
  const { t } = useLocale();
  const skin = useSettingsStore((s) => s.skin);
  const theme = getTheme(skin);
  const commands = useCommandStore((s) => s.commands);
  const pinnedIds = useCommandStore((s) => s.pinnedIds);
  const addCommand = useCommandStore((s) => s.addCommand);
  const removeCommand = useCommandStore((s) => s.removeCommand);
  const togglePin = useCommandStore((s) => s.togglePin);

  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newSummary, setNewSummary] = useState('');

  const handleAdd = () => {
    if (newTitle.trim() && newText.trim()) {
      addCommand({
        id: `custom-${Date.now()}`,
        title: newTitle.trim(),
        text: newText.trim(),
        summary: newSummary.trim(),
        source: 'custom',
      });
      setNewTitle('');
      setNewText('');
      setNewSummary('');
      setShowAdd(false);
    }
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: theme.font.size.lg, margin: 0 }}>{t('command.title')}</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            padding: '6px 16px',
            borderRadius: theme.border.radiusSm,
            border: `1px solid ${theme.accent.primary}`,
            background: 'transparent',
            color: theme.accent.primary,
            cursor: 'pointer',
            fontSize: theme.font.size.sm,
            fontFamily: 'inherit',
          }}
        >
          {showAdd ? t('common.cancel') : `+ ${t('command.add')}`}
        </button>
      </div>

      {showAdd && (
        <div style={{
          padding: 16,
          borderRadius: theme.border.radius,
          background: theme.bg.card,
          border: `1px solid ${theme.border.color}`,
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div>
            <label style={{ fontSize: theme.font.size.sm, color: theme.text.secondary, display: 'block', marginBottom: 4 }}>
              {t('command.nameLabel')}
            </label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('command.namePlaceholder')}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: theme.font.size.sm, color: theme.text.secondary, display: 'block', marginBottom: 4 }}>
              {t('command.contentLabel')}
            </label>
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="claude --help"
              style={{ ...inputStyle, fontFamily: theme.font.mono }}
            />
          </div>
          <div>
            <label style={{ fontSize: theme.font.size.sm, color: theme.text.secondary, display: 'block', marginBottom: 4 }}>
              {t('command.descriptionLabel')}
            </label>
            <input
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              placeholder={t('command.descriptionPlaceholder')}
              style={inputStyle}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim() || !newText.trim()}
            style={{
              padding: '8px 20px',
              borderRadius: theme.border.radiusSm,
              border: 'none',
              background: theme.accent.primary,
              color: theme.text.inverse,
              cursor: newTitle.trim() && newText.trim() ? 'pointer' : 'not-allowed',
              fontSize: theme.font.size.md,
              fontWeight: 600,
              fontFamily: 'inherit',
              opacity: newTitle.trim() && newText.trim() ? 1 : 0.5,
              alignSelf: 'flex-end',
            }}
          >
            {t('common.save')}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {commands.map((cmd) => (
          <div
            key={cmd.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: theme.border.radiusSm,
              background: theme.bg.card,
              border: `1px solid ${theme.border.color}`,
              gap: 10,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: theme.font.size.sm }}>{cmd.title}</div>
              <div style={{
                fontSize: theme.font.size.xs,
                color: theme.text.muted,
                fontFamily: theme.font.mono,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {cmd.text}
              </div>
            </div>
            <button
              onClick={() => togglePin(cmd.id)}
              title={pinnedIds.includes(cmd.id) ? t('command.unpin') : t('command.pin')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 16,
                padding: 4,
                opacity: pinnedIds.includes(cmd.id) ? 1 : 0.4,
              }}
            >
              📌
            </button>
            {cmd.source === 'custom' && (
              <button
                onClick={() => removeCommand(cmd.id)}
                title={t('command.delete')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: 4,
                  color: theme.accent.danger,
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

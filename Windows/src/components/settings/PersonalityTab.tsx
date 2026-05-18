import { usePetStore } from '../../stores/petStore';
import { useLocale } from '../../locales';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../styles/themes';

const presetIds = [
  'happy', 'codingPartner', 'gentleCoach', 'focused', 'angry',
  'lazy', 'energetic', 'wise', 'sarcastic', 'custom',
];

export default function PersonalityTab() {
  const { t } = useLocale();
  const skin = useSettingsStore((s) => s.skin);
  const theme = getTheme(skin);
  const personality = usePetStore((s) => s.personality);
  const updatePersonality = usePetStore((s) => s.updatePersonality);

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
        {t('settings.personality')}
      </h2>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: theme.font.size.sm, color: theme.text.secondary, display: 'block', marginBottom: 4 }}>
            {t('personality.petName')}
          </label>
          <input
            value={personality.petName}
            onChange={(e) => updatePersonality({ petName: e.target.value })}
            placeholder={t('personality.petNamePlaceholder')}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: theme.font.size.sm, color: theme.text.secondary, display: 'block', marginBottom: 4 }}>
            {t('personality.ownerName')}
          </label>
          <input
            value={personality.ownerName}
            onChange={(e) => updatePersonality({ ownerName: e.target.value })}
            placeholder={t('personality.ownerNamePlaceholder')}
            style={inputStyle}
          />
        </div>
      </div>

      <h3 style={{ fontSize: theme.font.size.md, marginBottom: 12, color: theme.text.secondary }}>
        {t('personality.presetSection')}
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 8,
        marginBottom: 20,
      }}>
        {presetIds.map((id) => {
          const isSelected = personality.selectedPreset === id;
          return (
            <button
              key={id}
              onClick={() => updatePersonality({ selectedPreset: id })}
              style={{
                padding: '10px 8px',
                borderRadius: theme.border.radiusSm,
                border: isSelected
                  ? `2px solid ${theme.accent.primary}`
                  : `1px solid ${theme.border.color}`,
                background: isSelected ? theme.bg.active : theme.bg.card,
                cursor: 'pointer',
                textAlign: 'center',
                transition: `all ${theme.transition.fast}`,
                fontFamily: 'inherit',
                color: theme.text.primary,
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 4 }}>
                {t(`personality.${id}.emoji`)}
              </div>
              <div style={{ fontSize: theme.font.size.xs, fontWeight: isSelected ? 600 : 400 }}>
                {t(`personality.${id}`)}
              </div>
            </button>
          );
        })}
      </div>

      {personality.selectedPreset === 'custom' && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: theme.font.size.sm, color: theme.text.secondary, display: 'block', marginBottom: 4 }}>
            {t('personality.customPrompt')}
          </label>
          <textarea
            value={personality.customPrompt}
            onChange={(e) => updatePersonality({ customPrompt: e.target.value })}
            rows={5}
            style={{
              ...inputStyle,
              resize: 'vertical',
              minHeight: 100,
            }}
          />
        </div>
      )}

      <div>
        <label style={{ fontSize: theme.font.size.sm, color: theme.text.secondary, display: 'block', marginBottom: 4 }}>
          {t('personality.constraints')}
        </label>
        <input
          value={personality.constraints}
          onChange={(e) => updatePersonality({ constraints: e.target.value })}
          placeholder={t('personality.constraintPlaceholder')}
          style={inputStyle}
        />
      </div>
    </div>
  );
}

import { useSettingsStore } from '../../stores/settingsStore';
import { useLocale } from '../../locales';
import { getTheme, themes } from '../../styles/themes';
import type { AppSkin } from '../../types/settings';

const skinOptions: { id: AppSkin; preview: string }[] = [
  { id: 'glass', preview: '🪟' },
  { id: 'dark', preview: '🌙' },
  { id: 'pixel', preview: '👾' },
];

export default function AppearanceTab() {
  const { t } = useLocale();
  const skin = useSettingsStore((s) => s.skin);
  const setSkin = useSettingsStore((s) => s.setSkin);
  const theme = getTheme(skin);

  return (
    <div>
      <h2 style={{ fontSize: theme.font.size.lg, marginBottom: 20 }}>
        {t('skin.pickerTitle')}
      </h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {skinOptions.map((option) => {
          const optionTheme = themes[option.id];
          const isSelected = skin === option.id;
          return (
            <button
              key={option.id}
              onClick={() => setSkin(option.id)}
              style={{
                width: 180,
                padding: 20,
                borderRadius: theme.border.radiusLg,
                border: isSelected
                  ? `2px solid ${theme.accent.primary}`
                  : `1px solid ${theme.border.color}`,
                background: optionTheme.bg.primary,
                cursor: 'pointer',
                textAlign: 'center',
                transition: `all ${theme.transition.fast}`,
                boxShadow: isSelected ? theme.shadow.glow : 'none',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>{option.preview}</div>
              <div style={{
                fontSize: theme.font.size.md,
                fontWeight: 600,
                color: isSelected ? theme.accent.primary : optionTheme.text.primary,
                marginBottom: 4,
              }}>
                {t(`skin.${option.id}`)}
              </div>
              <div style={{
                fontSize: theme.font.size.xs,
                color: optionTheme.text.muted,
              }}>
                {t(`skin.${option.id}.desc`)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

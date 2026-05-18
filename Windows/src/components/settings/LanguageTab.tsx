import { useSettingsStore } from '../../stores/settingsStore';
import { useLocale } from '../../locales';
import { getTheme } from '../../styles/themes';
import type { AppLanguage } from '../../types/settings';

const languages: { id: AppLanguage; flag: string; native: string; english: string }[] = [
  { id: 'zh-CN', flag: '🇨🇳', native: '简体中文', english: 'Simplified Chinese' },
  { id: 'zh-TW', flag: '🇹🇼', native: '繁體中文', english: 'Traditional Chinese' },
  { id: 'en', flag: '🇺🇸', native: 'English', english: 'English' },
  { id: 'ja', flag: '🇯🇵', native: '日本語', english: 'Japanese' },
  { id: 'ko', flag: '🇰🇷', native: '한국어', english: 'Korean' },
];

export default function LanguageTab() {
  const { t } = useLocale();
  const skin = useSettingsStore((s) => s.skin);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const theme = getTheme(skin);

  return (
    <div>
      <h2 style={{ fontSize: theme.font.size.lg, marginBottom: 8 }}>
        {t('language.title')}
      </h2>
      <p style={{ color: theme.text.muted, fontSize: theme.font.size.sm, marginBottom: 20 }}>
        {t('language.restartNote')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {languages.map((lang) => {
          const isSelected = language === lang.id;
          return (
            <button
              key={lang.id}
              onClick={() => setLanguage(lang.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: theme.border.radius,
                border: isSelected
                  ? `2px solid ${theme.accent.primary}`
                  : `1px solid ${theme.border.color}`,
                background: isSelected ? theme.bg.active : theme.bg.card,
                cursor: 'pointer',
                textAlign: 'left',
                transition: `all ${theme.transition.fast}`,
                fontFamily: 'inherit',
                color: theme.text.primary,
              }}
            >
              <span style={{ fontSize: 24 }}>{lang.flag}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: theme.font.size.md }}>
                  {lang.native}
                </div>
                <div style={{ fontSize: theme.font.size.xs, color: theme.text.muted }}>
                  {lang.english}
                </div>
              </div>
              {isSelected && (
                <span style={{ marginLeft: 'auto', color: theme.accent.primary }}>✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

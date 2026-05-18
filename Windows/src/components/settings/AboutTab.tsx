import { useLocale } from '../../locales';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../styles/themes';

export default function AboutTab() {
  const { t } = useLocale();
  const skin = useSettingsStore((s) => s.skin);
  const theme = getTheme(skin);

  const socialLinks = [
    { key: 'github', icon: '/github.png', url: 'https://github.com/nicepkg/TermiPet' },
    { key: 'twitter', icon: '/x.png', url: 'https://x.com/nicepkg' },
    { key: 'instagram', icon: '/instagram.png', url: 'https://instagram.com/nicepkg' },
  ];

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
      <img
        src="/icon.png"
        alt="TermiPet"
        style={{ width: 80, height: 80, borderRadius: theme.border.radiusLg, marginBottom: 16 }}
      />
      <h1 style={{ fontSize: theme.font.size.xl, margin: '0 0 4px', fontWeight: 700 }}>
        {t('app.name')}
      </h1>
      <p style={{ color: theme.text.secondary, fontSize: theme.font.size.md, margin: '0 0 8px' }}>
        {t('app.title')}
      </p>
      <p style={{ color: theme.text.muted, fontSize: theme.font.size.sm, margin: '0 0 24px' }}>
        {t('about.version')} 1.0.0
      </p>
      <p style={{
        color: theme.text.secondary,
        fontSize: theme.font.size.sm,
        lineHeight: 1.6,
        margin: '0 0 32px',
        padding: '0 20px',
      }}>
        {t('app.description')}
      </p>

      <h3 style={{ fontSize: theme.font.size.md, margin: '0 0 16px', color: theme.text.secondary }}>
        {t('app.socialMedia')}
      </h3>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 32 }}>
        {socialLinks.map((link) => (
          <a
            key={link.key}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: theme.border.radius,
              background: theme.bg.card,
              border: `1px solid ${theme.border.color}`,
              transition: `all ${theme.transition.fast}`,
              cursor: 'pointer',
            }}
          >
            <img src={link.icon} alt={link.key} style={{ width: 24, height: 24 }} />
          </a>
        ))}
      </div>

      <p style={{ color: theme.text.muted, fontSize: theme.font.size.xs }}>
        {t('app.developerName')}
      </p>
      <p style={{ color: theme.text.muted, fontSize: theme.font.size.xs, marginTop: 4 }}>
        Apache 2.0 License
      </p>
    </div>
  );
}

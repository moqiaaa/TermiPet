import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useLocale } from '../../locales';
import { getTheme } from '../../styles/themes';
import type { SettingsTab } from '../../types/settings';
import AboutTab from './AboutTab';
import AppearanceTab from './AppearanceTab';
import LanguageTab from './LanguageTab';
import CommandsTab from './CommandsTab';
import PetTab from './PetTab';
import PersonalityTab from './PersonalityTab';
import ModelTab from './ModelTab';

const tabs: { id: SettingsTab; icon: string }[] = [
  { id: 'about', icon: 'ℹ️' },
  { id: 'appearance', icon: '🎨' },
  { id: 'language', icon: '🌐' },
  { id: 'commands', icon: '⌨️' },
  { id: 'pet', icon: '🐾' },
  { id: 'personality', icon: '💬' },
  { id: 'model', icon: '🤖' },
];

export default function SettingsWindow() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('about');
  const skin = useSettingsStore((s) => s.skin);
  const theme = getTheme(skin);
  const { t } = useLocale();

  const renderContent = () => {
    switch (activeTab) {
      case 'about': return <AboutTab />;
      case 'appearance': return <AppearanceTab />;
      case 'language': return <LanguageTab />;
      case 'commands': return <CommandsTab />;
      case 'pet': return <PetTab />;
      case 'personality': return <PersonalityTab />;
      case 'model': return <ModelTab />;
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      background: theme.bg.primary,
      fontFamily: theme.font.body,
      color: theme.text.primary,
    }}>
      {/* Sidebar */}
      <div style={{
        width: 188,
        minWidth: 188,
        background: theme.bg.secondary,
        borderRight: `1px solid ${theme.border.color}`,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 0',
      }}>
        <div style={{
          padding: '0 16px 16px',
          fontSize: theme.font.size.lg,
          fontWeight: 700,
        }}>
          {t('settings.title')}
        </div>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              border: 'none',
              cursor: 'pointer',
              fontSize: theme.font.size.md,
              color: activeTab === tab.id ? theme.text.accent : theme.text.secondary,
              background: activeTab === tab.id ? theme.bg.active : 'transparent',
              borderLeft: activeTab === tab.id ? `3px solid ${theme.accent.primary}` : '3px solid transparent',
              textAlign: 'left',
              width: '100%',
              transition: `all ${theme.transition.fast}`,
              fontFamily: 'inherit',
            }}
          >
            <span>{tab.icon}</span>
            <span>{t(`settings.${tab.id}`)}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 24,
      }}>
        {renderContent()}
      </div>
    </div>
  );
}

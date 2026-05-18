import { useEffect } from 'react';
import { useSettingsStore } from './stores/settingsStore';
import { getTheme, applyThemeCSSVars } from './styles/themes';
import FloatingPetRoot from './components/pet/FloatingPetRoot';
import SettingsWindow from './components/settings/SettingsWindow';

function App() {
  const skin = useSettingsStore((s) => s.skin);
  const theme = getTheme(skin);

  const isSettingsWindow = window.location.pathname === '/settings'
    || window.location.hash === '#/settings';

  useEffect(() => {
    applyThemeCSSVars(theme);
  }, [theme]);

  if (isSettingsWindow) {
    return <SettingsWindow />;
  }

  return <FloatingPetRoot />;
}

export default App

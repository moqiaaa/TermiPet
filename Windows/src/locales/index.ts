import { useMemo } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import type { AppLanguage } from '../types/settings';
import zhCN from './zh-CN';
import zhTW from './zh-TW';
import en from './en';
import ja from './ja';
import ko from './ko';

const locales: Record<AppLanguage, Record<string, string>> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en,
  ja,
  ko,
};

function translate(
  table: Record<string, string>,
  fallback: Record<string, string>,
  key: string,
  params?: Record<string, string>
): string {
  let text = table[key] ?? fallback[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }
  return text;
}

export function useLocale() {
  const language = useSettingsStore((s) => s.language);

  return useMemo(() => {
    const table = locales[language] ?? locales['zh-CN'];
    const fallback = locales['zh-CN'];

    const t = (key: string, params?: Record<string, string>): string =>
      translate(table, fallback, key, params);

    return { t, language };
  }, [language]);
}

export { locales };

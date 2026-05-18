export type AppSkin = 'glass' | 'dark' | 'pixel';
export type AppLanguage = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko';
export type SettingsTab = 'about' | 'appearance' | 'language' | 'commands' | 'pet' | 'personality' | 'model';

export interface UsageQuota {
  service: string;
  label: string;
  percentage: number;
  windowLabel: string;
  resetDate: string;
  status: 'valid' | 'expired' | 'not_found';
}

export interface TerminalPreview {
  appName: string;
  status: 'idle' | 'running' | 'error' | 'warning' | 'unavailable';
  title: string;
  summary: string;
  detail: string;
}

export type AgentState = 'idle' | 'working' | 'waiting' | 'compacting' | 'stopped' | 'error';

export interface PomodoroConfig {
  focusMinutes: number;
  breakMinutes: number;
}

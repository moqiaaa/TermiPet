export interface FloatingCommand {
  id: string;
  title: string;
  text: string;
  summary: string;
  source: 'default' | 'custom';
}

export interface CommandConfiguration {
  commands: FloatingCommand[];
  pinnedIds: string[];
  customOrder: string[];
  primaryAction: 'toggle' | 'insert';
}

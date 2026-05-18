export type ChatProvider = 'ollama' | 'openai' | 'google' | 'custom';

export interface ChatModelConfig {
  provider: ChatProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

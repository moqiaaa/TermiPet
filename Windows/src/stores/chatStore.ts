import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { ChatMessage, ChatModelConfig } from '../types/chat';

interface ChatState {
  messages: ChatMessage[];
  modelConfig: ChatModelConfig;
  isStreaming: boolean;

  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  sendMessage: (content: string) => Promise<void>;
  setModelConfig: (config: Partial<ChatModelConfig>) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  modelConfig: {
    provider: 'ollama',
    model: '',
    apiKey: '',
    baseUrl: 'http://localhost:11434',
  },
  isStreaming: false,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  clearMessages: () => set({ messages: [] }),

  sendMessage: async (content) => {
    const { modelConfig, messages } = get();

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isStreaming: true,
    }));

    try {
      const response = await invoke<string>('send_chat_message', {
        messages: [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        })),
        provider: modelConfig.provider,
        model: modelConfig.model,
        apiKey: modelConfig.apiKey,
        baseUrl: modelConfig.baseUrl,
      });

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isStreaming: false,
      }));
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
      };

      set((state) => ({
        messages: [...state.messages, errorMessage],
        isStreaming: false,
      }));
    }
  },

  setModelConfig: (config) =>
    set((state) => ({
      modelConfig: { ...state.modelConfig, ...config },
    })),
}));

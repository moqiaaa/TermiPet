import { create } from 'zustand';
import type { AgentState, TerminalPreview, UsageQuota, PomodoroConfig } from '../types/settings';

type PomodoroPhase = 'idle' | 'focus' | 'break';
type PomodoroStatus = 'idle' | 'running' | 'paused';

interface PomodoroState {
  phase: PomodoroPhase;
  status: PomodoroStatus;
  remainingSeconds: number;
  config: PomodoroConfig;
  timerId: ReturnType<typeof setInterval> | null;
}

interface AppState {
  chatIsOpen: boolean;
  pomodoro: PomodoroState;
  agentState: AgentState;
  terminalPreview: TerminalPreview | null;
  quotas: UsageQuota[];
  isDragging: boolean;
  position: { x: number; y: number };

  toggleChat: () => void;
  startPomodoro: () => void;
  pausePomodoro: () => void;
  resetPomodoro: () => void;
  setAgentState: (state: AgentState) => void;
  updatePreview: (preview: TerminalPreview | null) => void;
  setQuotas: (quotas: UsageQuota[]) => void;
  setDragging: (dragging: boolean) => void;
  setPosition: (position: { x: number; y: number }) => void;
}

const DEFAULT_POMODORO_CONFIG: PomodoroConfig = {
  focusMinutes: 25,
  breakMinutes: 5,
};

export const useAppStore = create<AppState>((set, get) => ({
  chatIsOpen: false,
  pomodoro: {
    phase: 'idle',
    status: 'idle',
    remainingSeconds: DEFAULT_POMODORO_CONFIG.focusMinutes * 60,
    config: DEFAULT_POMODORO_CONFIG,
    timerId: null,
  },
  agentState: 'idle',
  terminalPreview: null,
  quotas: [],
  isDragging: false,
  position: { x: 100, y: 100 },

  toggleChat: () => set((state) => ({ chatIsOpen: !state.chatIsOpen })),

  startPomodoro: () => {
    const { pomodoro } = get();

    // Clear any existing timer
    if (pomodoro.timerId) {
      clearInterval(pomodoro.timerId);
    }

    const phase = pomodoro.phase === 'idle' ? 'focus' : pomodoro.phase;
    const remainingSeconds =
      pomodoro.status === 'paused'
        ? pomodoro.remainingSeconds
        : phase === 'focus'
          ? pomodoro.config.focusMinutes * 60
          : pomodoro.config.breakMinutes * 60;

    const timerId = setInterval(() => {
      const current = get().pomodoro;
      if (current.remainingSeconds <= 1) {
        // Timer done - switch phase
        if (current.timerId) clearInterval(current.timerId);
        const nextPhase = current.phase === 'focus' ? 'break' : 'focus';
        const nextSeconds =
          nextPhase === 'focus'
            ? current.config.focusMinutes * 60
            : current.config.breakMinutes * 60;
        set({
          pomodoro: {
            ...current,
            phase: nextPhase,
            status: 'idle',
            remainingSeconds: nextSeconds,
            timerId: null,
          },
        });
      } else {
        set({
          pomodoro: {
            ...current,
            remainingSeconds: current.remainingSeconds - 1,
          },
        });
      }
    }, 1000);

    set({
      pomodoro: {
        ...pomodoro,
        phase,
        status: 'running',
        remainingSeconds,
        timerId,
      },
    });
  },

  pausePomodoro: () => {
    const { pomodoro } = get();
    if (pomodoro.timerId) {
      clearInterval(pomodoro.timerId);
    }
    set({
      pomodoro: {
        ...pomodoro,
        status: 'paused',
        timerId: null,
      },
    });
  },

  resetPomodoro: () => {
    const { pomodoro } = get();
    if (pomodoro.timerId) {
      clearInterval(pomodoro.timerId);
    }
    set({
      pomodoro: {
        phase: 'idle',
        status: 'idle',
        remainingSeconds: pomodoro.config.focusMinutes * 60,
        config: pomodoro.config,
        timerId: null,
      },
    });
  },

  setAgentState: (agentState) => set({ agentState }),

  updatePreview: (preview) => set({ terminalPreview: preview }),

  setQuotas: (quotas) => set({ quotas }),

  setDragging: (dragging) => set({ isDragging: dragging }),

  setPosition: (position) => set({ position }),
}));

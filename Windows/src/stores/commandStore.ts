import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FloatingCommand } from '../types/command';

interface CommandState {
  commands: FloatingCommand[];
  pinnedIds: string[];
  customOrder: string[];
  primaryAction: 'toggle' | 'insert';
  isExpanded: boolean;

  addCommand: (command: FloatingCommand) => void;
  removeCommand: (id: string) => void;
  togglePin: (id: string) => void;
  reorder: (orderedIds: string[]) => void;
  setExpanded: (expanded: boolean) => void;
}

export const useCommandStore = create<CommandState>()(
  persist(
    (set) => ({
      commands: [],
      pinnedIds: [],
      customOrder: [],
      primaryAction: 'toggle',
      isExpanded: false,

      addCommand: (command) =>
        set((state) => ({
          commands: [...state.commands, command],
          customOrder: [...state.customOrder, command.id],
        })),

      removeCommand: (id) =>
        set((state) => ({
          commands: state.commands.filter((c) => c.id !== id),
          pinnedIds: state.pinnedIds.filter((pid) => pid !== id),
          customOrder: state.customOrder.filter((oid) => oid !== id),
        })),

      togglePin: (id) =>
        set((state) => ({
          pinnedIds: state.pinnedIds.includes(id)
            ? state.pinnedIds.filter((pid) => pid !== id)
            : [...state.pinnedIds, id],
        })),

      reorder: (orderedIds) => set({ customOrder: orderedIds }),

      setExpanded: (expanded) => set({ isExpanded: expanded }),
    }),
    {
      name: 'termipet-commands',
    }
  )
);

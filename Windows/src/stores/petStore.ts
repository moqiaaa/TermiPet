import { create } from 'zustand';
import type { PetPackage, PetPersonalityConfig } from '../types/pet';
import { PetAction } from '../types/pet';

interface PetState {
  selectedPetId: string;
  petPackages: PetPackage[];
  currentAction: PetAction;
  personality: PetPersonalityConfig;

  selectPet: (id: string) => void;
  loadPackages: () => void;
  setAction: (action: PetAction) => void;
  updatePersonality: (config: Partial<PetPersonalityConfig>) => void;
}

// Built-in pets that are bundled with the app
const BUILTIN_PETS: PetPackage[] = [
  {
    metadata: {
      id: 'mochi',
      displayName: 'Mochi',
      description: 'A realistic silver-white round-faced cat pet.',
      spritesheetPath: 'spritesheet.webp',
    },
    basePath: '/pets/mochi',
    isBuiltIn: true,
  },
  {
    metadata: {
      id: 'wizard-claude',
      displayName: 'Wizard Claude',
      description: 'A pixel-art orange wizard pet with a navy hat and cloak.',
      spritesheetPath: 'spritesheet.webp',
    },
    basePath: '/pets/wizard-claude',
    isBuiltIn: true,
  },
  {
    metadata: {
      id: 'rainbow-terminal-cat',
      displayName: 'Rainbow Terminal Cat',
      description: 'A compact rainbow-gradient pixel cat curled beside a tiny terminal.',
      spritesheetPath: 'spritesheet.webp',
    },
    basePath: '/pets/rainbow-terminal-cat',
    isBuiltIn: true,
  },
  {
    metadata: {
      id: 'Clippy',
      displayName: 'Clippy',
      description: 'The classic Microsoft Clippy assistant.',
      spritesheetPath: 'spritesheet.webp',
    },
    basePath: '/pets/Clippy',
    isBuiltIn: false,
  },
  {
    metadata: {
      id: 'jumao',
      displayName: 'Jumao',
      description: 'An adorable orange cat.',
      spritesheetPath: 'spritesheet.webp',
    },
    basePath: '/pets/jumao',
    isBuiltIn: false,
  },
  {
    metadata: {
      id: 'rocky',
      displayName: 'Rocky',
      description: 'A tough little rock pet.',
      spritesheetPath: 'spritesheet.webp',
    },
    basePath: '/pets/rocky',
    isBuiltIn: false,
  },
];

export const usePetStore = create<PetState>((set, get) => ({
  selectedPetId: 'mochi',
  petPackages: BUILTIN_PETS,
  currentAction: PetAction.Idle,
  personality: {
    petName: '',
    ownerName: '',
    selectedPreset: 'happy',
    customPrompt: '',
    constraints: '',
  },

  selectPet: (id) => set({ selectedPetId: id }),

  loadPackages: async () => {
    // Try to load from Tauri backend, fall back to built-ins
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const packages = await invoke('get_pet_packages') as PetPackage[];
      if (packages && packages.length > 0) {
        set({ petPackages: packages });
        if (!get().selectedPetId) {
          set({ selectedPetId: packages[0].metadata.id });
        }
      }
    } catch {
      // Not in Tauri environment or error, keep built-in pets
    }
  },

  setAction: (action) => set({ currentAction: action }),

  updatePersonality: (config) =>
    set((state) => ({
      personality: { ...state.personality, ...config },
    })),
}));

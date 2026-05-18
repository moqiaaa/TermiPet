export interface PetMetadata {
  id: string;
  displayName: string;
  description: string;
  spritesheetPath: string;
}

export interface PetPackage {
  metadata: PetMetadata;
  basePath: string;
  isBuiltIn: boolean;
}

export interface PetSpritesheetGrid {
  actions: number; // 9 actions
  framesPerAction: number[];
  frameWidth: number;
  frameHeight: number;
  columns: number;
}

// 9 pet actions matching Mac version
export enum PetAction {
  Idle = 0,
  Run = 1,
  Walk = 2,
  Sit = 3,
  Error = 4,
  Celebrate = 5,
  Sleep = 6,
  Working = 7,
  Waiting = 8,
}

export interface PersonalityPreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  systemPrompt: string;
}

export interface PetPersonalityConfig {
  petName: string;
  ownerName: string;
  selectedPreset: string;
  customPrompt: string;
  constraints: string;
}

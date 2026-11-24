export interface User {
  id: number;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ProjectRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface ProjectMember {
  id: number;
  userId: number;
  projectId: number;
  role: ProjectRole;
  user?: User;
  createdAt?: string;
}

export interface ProjectPresets {
  speakers?: string[];
  characters?: string[];
  backgrounds?: string[];
  bgm?: string[];
  se?: string[];
}

export interface ProjectAssetsResponse {
  files: {
    characters: string[];
    bg: string[];
    bgm: string[];
    se: string[];
  };
  presets: ProjectPresets;
}

export interface Project {
  id: number;
  name: string;
  myRole?: ProjectRole;
  presets?: ProjectPresets;
  members?: ProjectMember[];
  scenarios?: Scenario[];
  _count?: {
    members?: number;
    scenarios?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Scenario {
  id: number;
  name: string;
  projectId: number;
  events?: Event[];
  createdAt?: string;
  updatedAt?: string;
}

export type CharacterSlot = "pos1" | "pos2" | "pos3" | "pos4" | "pos5" | "pos6" | "pos7";

export const CHARACTER_SLOTS: { key: CharacterSlot; label: string; shortLabel: string }[] = [
  { key: "pos1", label: "ポジション 1 (左端)", shortLabel: "1:左端" },
  { key: "pos2", label: "ポジション 2 (左)", shortLabel: "2:左" },
  { key: "pos3", label: "ポジション 3 (中左)", shortLabel: "3:中左" },
  { key: "pos4", label: "ポジション 4 (中央)", shortLabel: "4:中央" },
  { key: "pos5", label: "ポジション 5 (中右)", shortLabel: "5:中右" },
  { key: "pos6", label: "ポジション 6 (右)", shortLabel: "6:右" },
  { key: "pos7", label: "ポジション 7 (右端)", shortLabel: "7:右端" },
];

export type EventDataMap = {
  text: {
    speaker?: string;
    text: string;
    positions?: Partial<Record<CharacterSlot, string>>;
  };
  bg_change: {
    image: string;
    effect?: string;
  };
  bgm_play: {
    bgmId: string;
    option?: string;
  };
  sound_effect: {
    seId: string;
  };
  selection: {
    choices: string[];
  };
  custom: {
    params: string[];
  };
};

export type EventType = keyof EventDataMap;

export type EventPayload = {
  [K in EventType]: {
    eventType: K;
    data: EventDataMap[K];
  };
}[EventType];

export type Event = {
  id: number;
  scenarioId: number;
  orderIndex: number;
  createdAt?: string;
  updatedAt?: string;
} & EventPayload;

export type DraftEvent = {
  [K in EventType]: {
    eventType: K;
    data: Partial<EventDataMap[K]>;
  };
}[EventType];

export interface AuthResponse {
  user: User;
}

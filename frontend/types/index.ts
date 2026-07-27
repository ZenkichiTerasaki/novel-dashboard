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

export interface Project {
  id: number;
  name: string;
  members?: ProjectMember[];
  scenarios?: Scenario[];
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

export interface Event {
  id: number;
  scenarioId: number;
  orderIndex: number;
  eventType: string;
  param1: string | null;
  param2: string | null;
  param3: string | null;
  param4: string | null;
  param5: string | null;
  param6: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  access_token: string;
}

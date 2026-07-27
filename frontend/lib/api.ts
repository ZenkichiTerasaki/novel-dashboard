import { AuthResponse, Event, Project, Scenario, User } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const TOKEN_KEY = "novel_dashboard_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function removeToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// 共通リクエスト関数
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401) {
      removeToken();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    const errorData = await res.json().catch(() => ({}));
    const message = Array.isArray(errorData.message)
      ? errorData.message.join(", ")
      : errorData.message || `エラーが発生しました (${res.status})`;
    throw new Error(message);
  }

  // 204 No Content 等
  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

// ---------------- 認証 API ----------------

export async function registerUser(data: { name: string; email: string; password: string }): Promise<User> {
  return apiFetch<User>("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function loginUser(data: { email: string; password: string }): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (response.access_token) {
    setToken(response.access_token);
  }
  return response;
}

export function logoutUser(): void {
  removeToken();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

// JWT デコード（簡易）
export function parseJwtPayload(token: string): { userId?: number; email?: string; exp?: number } | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// ---------------- プロジェクト API ----------------

export async function getProjects(): Promise<Project[]> {
  return apiFetch<Project[]>("/projects");
}

export async function getProject(id: number): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`);
}

export async function createProject(name: string): Promise<Project> {
  return apiFetch<Project>("/projects", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function updateProject(id: number, name: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function deleteProject(id: number): Promise<{ message?: string }> {
  return apiFetch<{ message?: string }>(`/projects/${id}`, {
    method: "DELETE",
  });
}

// ---------------- シナリオ API ----------------

export async function getScenarios(projectId: number): Promise<Scenario[]> {
  return apiFetch<Scenario[]>(`/projects/${projectId}/scenarios`);
}

export async function getScenario(id: number): Promise<Scenario> {
  return apiFetch<Scenario>(`/scenarios/${id}`);
}

export async function createScenario(projectId: number, name: string): Promise<Scenario> {
  return apiFetch<Scenario>(`/projects/${projectId}/scenarios`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function updateScenario(id: number, name: string): Promise<Scenario> {
  return apiFetch<Scenario>(`/scenarios/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function deleteScenario(id: number): Promise<{ message?: string }> {
  return apiFetch<{ message?: string }>(`/scenarios/${id}`, {
    method: "DELETE",
  });
}

// ---------------- イベント API ----------------

export async function getEvents(scenarioId: number): Promise<Event[]> {
  return apiFetch<Event[]>(`/scenarios/${scenarioId}/events`);
}

export async function createEvent(
  scenarioId: number,
  data: {
    eventType: string;
    orderIndex?: number;
    param1?: string;
    param2?: string;
    param3?: string;
    param4?: string;
    param5?: string;
    param6?: string;
  }
): Promise<Event> {
  return apiFetch<Event>(`/scenarios/${scenarioId}/events`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEvent(
  id: number,
  data: {
    eventType?: string;
    orderIndex?: number;
    param1?: string | null;
    param2?: string | null;
    param3?: string | null;
    param4?: string | null;
    param5?: string | null;
    param6?: string | null;
  }
): Promise<Event> {
  return apiFetch<Event>(`/events/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteEvent(id: number): Promise<{ message?: string }> {
  return apiFetch<{ message?: string }>(`/events/${id}`, {
    method: "DELETE",
  });
}

export async function reorderEvents(scenarioId: number, eventIds: number[]): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/scenarios/${scenarioId}/events/order`, {
    method: "PATCH",
    body: JSON.stringify({ eventIds }),
  });
}
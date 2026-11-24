import {
  AuthResponse,
  DraftEvent,
  Event,
  Project,
  ProjectAssetsResponse,
  ProjectMember,
  ProjectPresets,
  ProjectRole,
  Scenario,
  User,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface ApiFetchOptions extends RequestInit {
  skipAuthRedirect?: boolean;
}

// 共通リクエスト関数（HttpOnly Cookie 認証）
async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { skipAuthRedirect, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401 && !skipAuthRedirect) {
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/register")
      ) {
        window.location.href = "/login";
      }
    }
    const errorData = await res.json().catch(() => ({}));
    const message = Array.isArray(errorData.message)
      ? errorData.message.join(", ")
      : errorData.message || `エラーが発生しました (${res.status})`;
    throw new Error(message);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

// ---------------- 認証 API (HttpOnly Cookie + サーバー側セッション) ----------------

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  return apiFetch<User>("/users", {
    method: "POST",
    body: JSON.stringify(data),
    skipAuthRedirect: true,
  });
}

export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
    skipAuthRedirect: true,
  });
}

export async function getMe(): Promise<User | null> {
  try {
    return await apiFetch<User>("/auth/me", {
      skipAuthRedirect: true,
    });
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await apiFetch<{ message: string }>("/auth/logout", {
      method: "POST",
      skipAuthRedirect: true,
    });
  } catch {
    // すでに失効済みでもクライアント側はログイン画面へ遷移する
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

export async function updateProject(
  id: number,
  name: string,
  presets?: ProjectPresets
): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name, ...(presets !== undefined ? { presets } : {}) }),
  });
}

export async function deleteProject(id: number): Promise<{ message?: string }> {
  return apiFetch<{ message?: string }>(`/projects/${id}`, {
    method: "DELETE",
  });
}

// ---------------- プロジェクトメンバー管理 API ----------------

export async function getProjectMembers(
  projectId: number
): Promise<ProjectMember[]> {
  return apiFetch<ProjectMember[]>(`/projects/${projectId}/members`);
}

export async function inviteProjectMember(
  projectId: number,
  email: string,
  role: "EDITOR" | "VIEWER"
): Promise<ProjectMember> {
  return apiFetch<ProjectMember>(`/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export async function updateProjectMemberRole(
  projectId: number,
  memberId: number,
  role: ProjectRole
): Promise<ProjectMember> {
  return apiFetch<ProjectMember>(`/projects/${projectId}/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function removeProjectMember(
  projectId: number,
  memberId: number
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `/projects/${projectId}/members/${memberId}`,
    {
      method: "DELETE",
    }
  );
}

// ---------------- アセット & プリセット管理 API (Next.js Route + Backend連携) ----------------

export async function getProjectAssets(
  projectId: number
): Promise<ProjectAssetsResponse> {
  const res = await fetch(`/api/projects/${projectId}/assets`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "アセット情報の取得に失敗しました");
  }
  return res.json();
}

export async function saveProjectPresets(
  projectId: number,
  presets: ProjectPresets,
  projectName?: string
): Promise<ProjectAssetsResponse> {
  // 1. ローカル presets.json に保存（認証・EDITOR以上ロール検証付き）
  const localRes = await fetch(`/api/projects/${projectId}/assets`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ presets }),
  });
  if (!localRes.ok) {
    const err = await localRes.json().catch(() => ({}));
    throw new Error(err.message || "プリセットの保存に失敗しました");
  }

  // 2. バックエンドDB (Project.presets) にも同期
  try {
    await apiFetch(`/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...(projectName ? { name: projectName } : {}),
        presets,
      }),
    });
  } catch {
    // すでにローカル側保存済みのため継続
  }

  return localRes.json();
}

export async function uploadProjectAssetFile(
  projectId: number,
  category: "characters" | "bg" | "bgm" | "se",
  file: File
): Promise<ProjectAssetsResponse> {
  const formData = new FormData();
  formData.append("category", category);
  formData.append("file", file);

  const res = await fetch(`/api/projects/${projectId}/assets`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "ファイルのアップロードに失敗しました");
  }
  return res.json();
}

export async function deleteProjectAssetFile(
  projectId: number,
  category: "characters" | "bg" | "bgm" | "se",
  filename: string
): Promise<ProjectAssetsResponse> {
  const res = await fetch(
    `/api/projects/${projectId}/assets?category=${encodeURIComponent(category)}&filename=${encodeURIComponent(filename)}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "ファイルの削除に失敗しました");
  }
  return res.json();
}

// ---------------- シナリオ API ----------------

export async function getScenarios(projectId: number): Promise<Scenario[]> {
  return apiFetch<Scenario[]>(`/projects/${projectId}/scenarios`);
}

export async function getScenario(id: number): Promise<Scenario> {
  return apiFetch<Scenario>(`/scenarios/${id}`);
}

export async function createScenario(
  projectId: number,
  name: string
): Promise<Scenario> {
  return apiFetch<Scenario>(`/projects/${projectId}/scenarios`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function updateScenario(
  id: number,
  name: string
): Promise<Scenario> {
  return apiFetch<Scenario>(`/scenarios/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function deleteScenario(
  id: number
): Promise<{ message?: string }> {
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
  data: DraftEvent & { orderIndex?: number }
): Promise<Event> {
  return apiFetch<Event>(`/scenarios/${scenarioId}/events`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEvent(
  id: number,
  data: Partial<DraftEvent> & { orderIndex?: number }
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

export async function reorderEvents(
  scenarioId: number,
  eventIds: number[]
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `/scenarios/${scenarioId}/events/order`,
    {
      method: "PATCH",
      body: JSON.stringify({ eventIds }),
    }
  );
}

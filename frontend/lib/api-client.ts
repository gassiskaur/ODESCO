import type {
  MessageData,
  OperationType,
  ResearchCollection,
  ResearchMessage,
  ResearchSession,
  UserPublic,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_KEY = "research_agent_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore — non-JSON error body
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---------- Auth ----------

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserPublic;
}

export const authApi = {
  register: (email: string, password: string, name?: string) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

// ---------- Sessions / Messages / Collections ----------

export const researchApi = {
  listSessions: () => request<ResearchSession[]>("/api/sessions"),

  createSession: (title?: string) =>
    request<ResearchSession>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ title: title || "New research session" }),
    }),

  deleteSession: (sessionId: string) =>
    request<{ status: string }>(`/api/sessions/${sessionId}`, { method: "DELETE" }),

  getMessages: (sessionId: string) =>
    request<ResearchMessage[]>(`/api/sessions/${sessionId}/messages`),

  postMessage: (
    sessionId: string,
    message: string,
    operation: OperationType = "auto",
    selectedPapers?: string[]
  ) =>
    request<ResearchMessage>(`/api/sessions/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        message,
        operation,
        selected_papers: selectedPapers,
      }),
    }),

  getCollection: (sessionId: string, collectionId: string) =>
    request<ResearchCollection>(`/api/sessions/${sessionId}/collections/${collectionId}`),
};

export { ApiError };
export type { MessageData };

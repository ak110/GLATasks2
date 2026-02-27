/**
 * @fileoverview FastAPI バックエンド呼び出し
 */

import fs from "node:fs";

const FASTAPI_URL = process.env.FASTAPI_URL ?? "http://app:8000";

let _internalApiKey: string | null = null;

function getInternalApiKey(): string {
  if (!_internalApiKey) {
    if (process.env.INTERNAL_API_KEY) {
      _internalApiKey = process.env.INTERNAL_API_KEY;
    } else {
      const keyFile = process.env.DATA_DIR
        ? `${process.env.DATA_DIR}/.internal_api_key`
        : null;
      if (!keyFile)
        throw new Error("INTERNAL_API_KEY or DATA_DIR env var is required");
      _internalApiKey = Buffer.from(fs.readFileSync(keyFile)).toString("hex");
    }
  }
  return _internalApiKey;
}

function authHeaders(userId: number): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-api-key": getInternalApiKey(),
    "x-user-id": String(userId),
  };
}

export type ListInfo = {
  id: number;
  title: string;
  last_updated: string;
};

export type TaskInfo = {
  id: number;
  title: string;
  notes: string;
  status: string;
};

export type TaskPatchResult = {
  status: string;
  completed: string | null;
  list_id: number;
  title: string;
  notes: string;
};

export type UserInfo = {
  id: number;
  user: string;
};

export async function validateCredentials(
  user: string,
  password: string,
): Promise<UserInfo | null> {
  const res = await fetch(`${FASTAPI_URL}/auth/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getInternalApiKey(),
    },
    body: JSON.stringify({ user, password }),
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`auth/validate failed: ${res.status}`);
  return res.json() as Promise<UserInfo>;
}

export async function registerUser(
  userId: string,
  password: string,
): Promise<UserInfo> {
  const res = await fetch(`${FASTAPI_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getInternalApiKey(),
    },
    body: JSON.stringify({ user_id: userId, password }),
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(detail?.detail ?? `auth/register failed: ${res.status}`);
  }
  return res.json() as Promise<UserInfo>;
}

export async function getLists(
  userId: number,
  showType: string,
): Promise<ListInfo[]> {
  const res = await fetch(`${FASTAPI_URL}/lists/api/${showType}`, {
    headers: authHeaders(userId),
  });
  if (!res.ok) throw new Error(`getLists failed: ${res.status}`);
  return res.json() as Promise<ListInfo[]>;
}

export type GetTasksResult =
  | { status: 304 }
  | { status: 200; data: TaskInfo[]; lastModified: string };

export async function getListTasks(
  userId: number,
  listId: number,
  showType: string,
  ifModifiedSince?: string,
): Promise<GetTasksResult> {
  const headers: Record<string, string> = authHeaders(userId);
  if (ifModifiedSince) headers["If-Modified-Since"] = ifModifiedSince;
  const res = await fetch(
    `${FASTAPI_URL}/lists/api/${listId}/tasks/${showType}`,
    { headers },
  );
  if (res.status === 304) return { status: 304 };
  if (!res.ok) throw new Error(`getListTasks failed: ${res.status}`);
  const data = (await res.json()) as TaskInfo[];
  const lastModified =
    res.headers.get("Last-Modified") ?? new Date().toISOString();
  return { status: 200, data, lastModified };
}

export async function postList(userId: number, title: string): Promise<void> {
  const res = await fetch(`${FASTAPI_URL}/lists/post`, {
    method: "POST",
    headers: authHeaders(userId),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`postList failed: ${res.status}`);
}

export async function clearList(userId: number, listId: number): Promise<void> {
  const res = await fetch(`${FASTAPI_URL}/lists/${listId}/clear/`, {
    method: "POST",
    headers: authHeaders(userId),
  });
  if (!res.ok) throw new Error(`clearList failed: ${res.status}`);
}

export async function renameList(
  userId: number,
  listId: number,
  title: string,
): Promise<void> {
  const res = await fetch(`${FASTAPI_URL}/lists/${listId}/rename/`, {
    method: "POST",
    headers: authHeaders(userId),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`renameList failed: ${res.status}`);
}

export async function deleteList(
  userId: number,
  listId: number,
): Promise<void> {
  const res = await fetch(`${FASTAPI_URL}/lists/${listId}/delete/`, {
    method: "POST",
    headers: authHeaders(userId),
  });
  if (!res.ok) throw new Error(`deleteList failed: ${res.status}`);
}

export async function hideList(userId: number, listId: number): Promise<void> {
  const res = await fetch(`${FASTAPI_URL}/lists/${listId}/hide/`, {
    method: "POST",
    headers: authHeaders(userId),
  });
  if (!res.ok) throw new Error(`hideList failed: ${res.status}`);
}

export async function showList(userId: number, listId: number): Promise<void> {
  const res = await fetch(`${FASTAPI_URL}/lists/${listId}/show/`, {
    method: "POST",
    headers: authHeaders(userId),
  });
  if (!res.ok) throw new Error(`showList failed: ${res.status}`);
}

export async function postTask(
  userId: number,
  listId: number,
  text: string,
): Promise<void> {
  const res = await fetch(`${FASTAPI_URL}/tasks/${listId}`, {
    method: "POST",
    headers: authHeaders(userId),
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`postTask failed: ${res.status}`);
}

export async function patchTask(
  userId: number,
  listId: number,
  taskId: number,
  data: Record<string, unknown>,
): Promise<TaskPatchResult> {
  const res = await fetch(`${FASTAPI_URL}/tasks/api/${listId}/${taskId}`, {
    method: "PATCH",
    headers: authHeaders(userId),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`patchTask failed: ${res.status}`);
  return res.json() as Promise<TaskPatchResult>;
}

/**
 * @fileoverview DB 直接アクセスによるビジネスロジック（Drizzle ORM）
 */

import bcrypt from "bcryptjs";
import { and, desc, eq } from "drizzle-orm";

import { getDb } from "./db";
import { lists, tasks, users } from "./schema";

// ── 型定義 ──

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

export type GetTasksResult =
  | { status: 304 }
  | { status: 200; data: TaskInfo[]; lastModified: string };

// ── 定数 ──

const STATUS_NAMES: Record<number, string> = {
  0: "needsAction",
  1: "completed",
  2: "hidden",
};
const STATUS_IDS: Record<string, number> = {
  needsAction: 0,
  completed: 1,
  hidden: 2,
};

// ── 日時変換ヘルパー ──

/**
 * DB の TIMESTAMP 型から読み込んだ Date を UTC ISO 文字列に変換する。
 *
 * TIMESTAMP 型は内部的に UTC で保存され、mysql2 が Date オブジェクトとして返す。
 * toISOString() でそのまま UTC 表現になる。
 */
function toUtcIso(dt: Date): string {
  return dt.toISOString();
}

/**
 * クライアントから受け取った UTC ISO 文字列を DB に保存する Date に変換する。
 *
 * new Date(isoString) で UTC ミリ秒の Date を生成し、
 * TIMESTAMP 型に INSERT すると MariaDB が UTC として格納する。
 */
function fromUtcIso(isoStr: string): Date {
  return new Date(isoStr);
}

// ── タスクの title/notes 分割 ──

function splitTitle(text: string): string {
  return text
    .split("\n", 1)[0]
    .replace(/^[\r\n]+/, "")
    .trimEnd();
}

function splitNotes(text: string): string {
  const idx = text.indexOf("\n");
  return idx === -1
    ? ""
    : text
        .slice(idx + 1)
        .replace(/^[\r\n]+/, "")
        .trimEnd();
}

// ── 所有権チェック ──

async function getOwnedList(listId: number, userId: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(lists)
    .where(and(eq(lists.id, listId), eq(lists.user_id, userId)))
    .limit(1);
  if (rows.length === 0) throw new Error("not_found_or_forbidden");
  return rows[0];
}

// ── 認証 ──

/** ログイン認証。成功時にユーザー情報を返し、失敗時に null を返す。 */
export async function validateCredentials(
  user: string,
  password: string,
): Promise<UserInfo | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.user, user))
    .limit(1);
  if (rows.length === 0) return null;
  const row = rows[0];
  const ok = await bcrypt.compare(password, row.pass_hash);
  if (!ok) return null;
  await db
    .update(users)
    .set({ last_login: new Date() })
    .where(eq(users.id, row.id));
  return { id: row.id, user: row.user };
}

/** ユーザー登録。バリデーション失敗時は Error を throw する。 */
export async function registerUser(
  userId: string,
  password: string,
): Promise<UserInfo> {
  if (!/^[a-zA-Z0-9]{4,32}$/.test(userId)) {
    throw new Error("ユーザーIDは4～32文字の英数字としてください。");
  }
  if (password.length === 0) {
    throw new Error("パスワードは必須です。");
  }
  const db = getDb();
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.user, userId))
    .limit(1);
  if (existing.length > 0) {
    throw new Error("既に存在するユーザーIDです。");
  }
  const passHash = await bcrypt.hash(password, 10);
  const result = await db
    .insert(users)
    .values({ user: userId, pass_hash: passHash, joined: new Date() });
  return { id: Number(result[0].insertId), user: userId };
}

// ── リスト操作 ──

/** リスト一覧を取得する。 */
export async function getLists(
  userId: number,
  showType: string,
): Promise<ListInfo[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(lists)
    .where(eq(lists.user_id, userId))
    .orderBy(lists.title);
  return rows
    .filter((r) => (showType === "list" ? r.status !== "hidden" : true))
    .map((r) => ({
      id: r.id,
      title: r.title,
      last_updated: toUtcIso(r.last_updated),
    }));
}

/** リストのタスク一覧を取得する（If-Modified-Since キャッシュ対応）。 */
export async function getListTasks(
  userId: number,
  listId: number,
  showType: string,
  ifModifiedSince?: string,
): Promise<GetTasksResult> {
  const list = await getOwnedList(listId, userId);

  if (ifModifiedSince) {
    try {
      const clientMs = new Date(ifModifiedSince).getTime();
      const serverMs = list.last_updated.getTime();
      if (serverMs <= clientMs) return { status: 304 };
    } catch {
      // パースに失敗した場合は通常のレスポンスを返す
    }
  }

  const db = getDb();
  const allTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.list_id, listId))
    .orderBy(desc(tasks.updated));

  const data: TaskInfo[] = allTasks
    .filter((t) => {
      const status = STATUS_NAMES[t.status_id] ?? "needsAction";
      if (showType === "all") return true;
      if (showType === "list") return status !== "hidden";
      if (showType === "hidden") return status === "hidden";
      return true;
    })
    .map((t) => ({
      id: t.id,
      title: splitTitle(t.text),
      notes: splitNotes(t.text),
      status: STATUS_NAMES[t.status_id] ?? "needsAction",
    }));

  const lastModified = toUtcIso(list.last_updated);
  return { status: 200, data, lastModified };
}

/** リストを作成する。 */
export async function postList(userId: number, title: string): Promise<void> {
  if (title.length === 0) throw new Error("タイトルは必須です。");
  const db = getDb();
  await db.insert(lists).values({
    title,
    user_id: userId,
    status: "show",
    last_updated: new Date(),
  });
}

/** 完了済みタスクを非表示にする。 */
export async function clearList(userId: number, listId: number): Promise<void> {
  await getOwnedList(listId, userId);
  const db = getDb();
  await db
    .update(tasks)
    .set({ status_id: STATUS_IDS["hidden"] })
    .where(
      and(
        eq(tasks.list_id, listId),
        eq(tasks.status_id, STATUS_IDS["completed"]),
      ),
    );
  await db
    .update(lists)
    .set({ last_updated: new Date() })
    .where(eq(lists.id, listId));
}

/** リスト名を変更する。 */
export async function renameList(
  userId: number,
  listId: number,
  title: string,
): Promise<void> {
  if (title.length === 0) throw new Error("タイトルは必須です。");
  await getOwnedList(listId, userId);
  const db = getDb();
  await db
    .update(lists)
    .set({ title, last_updated: new Date() })
    .where(eq(lists.id, listId));
}

/** リストとその全タスクを削除する。 */
export async function deleteList(
  userId: number,
  listId: number,
): Promise<void> {
  await getOwnedList(listId, userId);
  const db = getDb();
  await db.delete(tasks).where(eq(tasks.list_id, listId));
  await db.delete(lists).where(eq(lists.id, listId));
}

/** リストを非表示にする。 */
export async function hideList(userId: number, listId: number): Promise<void> {
  await getOwnedList(listId, userId);
  const db = getDb();
  await db.update(lists).set({ status: "hidden" }).where(eq(lists.id, listId));
}

/** リストを再表示する。 */
export async function showList(userId: number, listId: number): Promise<void> {
  await getOwnedList(listId, userId);
  const db = getDb();
  await db.update(lists).set({ status: "active" }).where(eq(lists.id, listId));
}

// ── タスク操作 ──

/** タスクを追加する。 */
export async function postTask(
  userId: number,
  listId: number,
  text: string,
): Promise<void> {
  await getOwnedList(listId, userId);
  const cleanText = text.replace(/^[\r\n]+/, "").trimEnd();
  const db = getDb();
  const now = new Date();
  await db.insert(tasks).values({
    list_id: listId,
    status_id: 0,
    text: cleanText,
    created: now,
    updated: now,
  });
  await db.update(lists).set({ last_updated: now }).where(eq(lists.id, listId));
}

/** タスクを更新する（部分更新）。 */
export async function patchTask(
  userId: number,
  listId: number,
  taskId: number,
  data: Record<string, unknown>,
): Promise<TaskPatchResult> {
  await getOwnedList(listId, userId);

  const db = getDb();
  const taskRows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.list_id, listId)))
    .limit(1);
  if (taskRows.length === 0) throw new Error("task_not_found");
  const task = taskRows[0];

  const updates: Record<string, unknown> = {};

  if ("text" in data) {
    updates.text = data.text;
    if (!data.keep_order) updates.updated = new Date();
  }
  if ("status" in data) {
    const newStatus = data.status as string;
    const oldStatus = STATUS_NAMES[task.status_id] ?? "needsAction";
    if (oldStatus === "needsAction" && newStatus === "completed") {
      updates.completed = new Date();
    }
    updates.status_id = STATUS_IDS[newStatus];
  }
  if ("completed" in data) {
    updates.completed =
      data.completed === null ? null : fromUtcIso(data.completed as string);
  }

  let targetListId = listId;
  if ("move_to" in data) {
    const moveTo = Number(data.move_to);
    if (moveTo !== listId) {
      await getOwnedList(moveTo, userId);
      updates.list_id = moveTo;
      targetListId = moveTo;
      await db
        .update(lists)
        .set({ last_updated: new Date() })
        .where(eq(lists.id, moveTo));
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.update(tasks).set(updates).where(eq(tasks.id, taskId));
  }
  await db
    .update(lists)
    .set({ last_updated: new Date() })
    .where(eq(lists.id, listId));

  // 更新後のタスクを再取得
  const updated = (
    await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)
  )[0];
  return {
    status: STATUS_NAMES[updated.status_id] ?? "needsAction",
    completed: updated.completed ? toUtcIso(updated.completed) : null,
    list_id: targetListId,
    title: splitTitle(updated.text),
    notes: splitNotes(updated.text),
  };
}

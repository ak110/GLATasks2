/**
 * @fileoverview DB 直接アクセスによるビジネスロジック（Drizzle ORM）
 */

import bcrypt from "bcryptjs";
import { and, asc, eq, inArray, like, max, min } from "drizzle-orm";

import { getDb } from "./db";
import { lists, tasks, timers, users } from "./schema";

// ── 型定義 ──

export type ListInfo = {
  id: number;
  title: string;
  sort_order: number;
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

export type TimerInfo = {
  id: number;
  name: string;
  base_seconds: number;
  adjust_minutes: number;
  running: boolean;
  remaining_seconds: number;
  started_at: string | null;
  sort_order: number;
};

export type SearchTaskResult = TaskInfo & {
  listId: number;
  listTitle: string;
};

export type GetTasksResult =
  | { status: 304 }
  | { status: 200; data: TaskInfo[]; lastModified: string };

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

/** リスト一覧を取得する。タイトル昇順で返す。 */
export async function getLists(
  userId: number,
  showType: string,
): Promise<ListInfo[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(lists)
    .where(eq(lists.user_id, userId))
    .orderBy(asc(lists.title));
  return rows
    .filter((r) => {
      if (showType === "active") return r.status === "active";
      if (showType === "archived") return r.status === "archived";
      return true; // "all"
    })
    .map((r) => ({
      id: r.id,
      title: r.title,
      sort_order: r.sort_order,
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
    .orderBy(asc(tasks.sort_order));

  const data: TaskInfo[] = allTasks
    .filter((t) => {
      if (showType === "all") return true;
      if (showType === "active") return t.status !== "archived";
      if (showType === "archived") return t.status === "archived";
      return true;
    })
    .map((t) => ({
      id: t.id,
      title: splitTitle(t.text),
      notes: splitNotes(t.text),
      status: t.status,
    }));

  const lastModified = toUtcIso(list.last_updated);
  return { status: 200, data, lastModified };
}

/** リストを作成する。sort_order は既存の最小値 - 1000（先頭追加）。 */
export async function postList(userId: number, title: string): Promise<void> {
  if (title.length === 0) throw new Error("タイトルは必須です。");
  const db = getDb();
  // 現在の最小 sort_order を取得
  const [{ minOrder }] = await db
    .select({ minOrder: min(lists.sort_order) })
    .from(lists)
    .where(eq(lists.user_id, userId));
  const sortOrder = (minOrder ?? 1000) - 1000;
  await db.insert(lists).values({
    title,
    user_id: userId,
    status: "active",
    sort_order: sortOrder,
    last_updated: new Date(),
  });
}

/** 完了済みタスクを archived にする。 */
export async function clearList(userId: number, listId: number): Promise<void> {
  await getOwnedList(listId, userId);
  const db = getDb();
  await db
    .update(tasks)
    .set({ status: "archived" })
    .where(and(eq(tasks.list_id, listId), eq(tasks.status, "completed")));
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

/** リストを archived にする。 */
export async function archiveList(
  userId: number,
  listId: number,
): Promise<void> {
  await getOwnedList(listId, userId);
  const db = getDb();
  await db
    .update(lists)
    .set({ status: "archived" })
    .where(eq(lists.id, listId));
}

/** リストを active に戻す。 */
export async function unarchiveList(
  userId: number,
  listId: number,
): Promise<void> {
  await getOwnedList(listId, userId);
  const db = getDb();
  await db.update(lists).set({ status: "active" }).where(eq(lists.id, listId));
}

// ── タスク操作 ──

/** タスクを追加する。sort_order は既存の最小値 - 1000（先頭追加）。 */
export async function postTask(
  userId: number,
  listId: number,
  text: string,
): Promise<void> {
  await getOwnedList(listId, userId);
  const cleanText = text.trimEnd();
  const db = getDb();
  const now = new Date();
  // 現在の最小 sort_order を取得
  const [{ minOrder }] = await db
    .select({ minOrder: min(tasks.sort_order) })
    .from(tasks)
    .where(eq(tasks.list_id, listId));
  const sortOrder = (minOrder ?? 1000) - 1000;
  await db.insert(tasks).values({
    list_id: listId,
    status: "active",
    text: cleanText,
    sort_order: sortOrder,
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
    updates.text = (data.text as string).trimEnd();
    // keep_order=true の場合は sort_order を維持、false の場合は先頭に移動
    if (!data.keep_order) {
      const [{ minOrder }] = await db
        .select({ minOrder: min(tasks.sort_order) })
        .from(tasks)
        .where(eq(tasks.list_id, listId));
      const currentMin = minOrder ?? task.sort_order;
      if (task.sort_order > currentMin) {
        updates.sort_order = currentMin - 1000;
      }
    }
    updates.updated = new Date();
  }
  if ("status" in data) {
    const newStatus = data.status as string;
    if (task.status === "active" && newStatus === "completed") {
      updates.completed = new Date();
    }
    updates.status = newStatus;
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
      // 移動先リストの先頭に配置
      const [{ minOrder }] = await db
        .select({ minOrder: min(tasks.sort_order) })
        .from(tasks)
        .where(eq(tasks.list_id, moveTo));
      updates.sort_order = (minOrder ?? 1000) - 1000;
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
    status: updated.status,
    completed: updated.completed ? toUtcIso(updated.completed) : null,
    list_id: targetListId,
    title: splitTitle(updated.text),
    notes: splitNotes(updated.text),
  };
}

/** 全リスト横断でタスクを LIKE 検索する */
export async function searchTasks(
  userId: number,
  query: string,
): Promise<SearchTaskResult[]> {
  const db = getDb();
  // ユーザーの active リストを取得
  const userLists = await db
    .select()
    .from(lists)
    .where(and(eq(lists.user_id, userId), eq(lists.status, "active")));
  if (userLists.length === 0) return [];

  // LIKE 用にワイルドカードをエスケープ
  const escaped = query.replace(/[%_]/g, "\\$&");
  const pattern = `%${escaped}%`;

  const listIds = userLists.map((l) => l.id);
  const rows = await db
    .select()
    .from(tasks)
    .where(and(inArray(tasks.list_id, listIds), like(tasks.text, pattern)))
    .orderBy(asc(tasks.sort_order));

  // listId → title のマップ
  const listMap = new Map(userLists.map((l) => [l.id, l.title]));
  return rows
    .filter((t) => t.status !== "archived")
    .map((t) => ({
      id: t.id,
      title: splitTitle(t.text),
      notes: splitNotes(t.text),
      status: t.status,
      listId: t.list_id,
      listTitle: listMap.get(t.list_id) ?? "",
    }));
}

/** タスクの並び順を更新する */
export async function reorderTasks(
  userId: number,
  listId: number,
  taskIds: number[],
): Promise<void> {
  await getOwnedList(listId, userId);
  const db = getDb();
  // taskIds の順に sort_order を 0, 1000, 2000... で再割当
  for (let i = 0; i < taskIds.length; i++) {
    await db
      .update(tasks)
      .set({ sort_order: i * 1000 })
      .where(and(eq(tasks.id, taskIds[i]), eq(tasks.list_id, listId)));
  }
  await db
    .update(lists)
    .set({ last_updated: new Date() })
    .where(eq(lists.id, listId));
}

/** タイマーの並び順を更新する（全件一致を検証） */
export async function reorderTimers(
  userId: number,
  timerIds: number[],
): Promise<void> {
  const db = getDb();
  // ユーザーの全タイマーIDを取得して全件一致を検証
  const owned = await db
    .select({ id: timers.id })
    .from(timers)
    .where(eq(timers.user_id, userId));
  const ownedIds = new Set(owned.map((r) => r.id));
  if (
    timerIds.length !== ownedIds.size ||
    !timerIds.every((id) => ownedIds.has(id))
  ) {
    throw new Error("invalid_timer_ids");
  }
  // timerIds の順に sort_order を 0, 1000, 2000... で再割当
  for (let i = 0; i < timerIds.length; i++) {
    await db
      .update(timers)
      .set({ sort_order: i * 1000 })
      .where(and(eq(timers.id, timerIds[i]), eq(timers.user_id, userId)));
  }
}

// ── タイマー操作 ──

/** タイマーの所有権チェック */
async function getOwnedTimer(timerId: number, userId: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(timers)
    .where(and(eq(timers.id, timerId), eq(timers.user_id, userId)))
    .limit(1);
  if (rows.length === 0) throw new Error("not_found_or_forbidden");
  return rows[0];
}

/**
 * running 中のタイマーが 0 以下なら自動停止する。
 * 全クライアントが閉じていても DB の正しさを保証する。
 */
async function autoStopIfExpired(
  timer: typeof timers.$inferSelect,
): Promise<typeof timers.$inferSelect> {
  if (!timer.running || !timer.started_at) return timer;
  const elapsed = Math.floor((Date.now() - timer.started_at.getTime()) / 1000);
  const remaining = timer.remaining_seconds - elapsed;
  if (remaining > 0) return timer;
  // 期限切れ → 自動停止
  const db = getDb();
  await db
    .update(timers)
    .set({
      running: 0,
      remaining_seconds: 0,
      started_at: null,
      updated: new Date(),
    })
    .where(eq(timers.id, timer.id));
  return { ...timer, running: 0, remaining_seconds: 0, started_at: null };
}

/** DB の timer 行を TimerInfo に変換する */
function toTimerInfo(row: typeof timers.$inferSelect): TimerInfo {
  return {
    id: row.id,
    name: row.name,
    base_seconds: row.base_seconds,
    adjust_minutes: row.adjust_minutes,
    running: row.running === 1,
    remaining_seconds: row.remaining_seconds,
    started_at: row.started_at ? toUtcIso(row.started_at) : null,
    sort_order: row.sort_order,
  };
}

/** タイマー一覧取得 + サーバー時刻返却 */
export async function getTimers(
  userId: number,
): Promise<{ timers: TimerInfo[]; server_time: string }> {
  const db = getDb();
  const rows = await db
    .select()
    .from(timers)
    .where(eq(timers.user_id, userId))
    .orderBy(timers.sort_order, timers.created);
  // 期限切れタイマーを自動停止
  const processed = await Promise.all(rows.map(autoStopIfExpired));
  return {
    timers: processed.map(toTimerInfo),
    server_time: new Date().toISOString(),
  };
}

/** タイマーを作成する（sort_order は既存の最大値 + 1000 で末尾追加） */
export async function createTimer(
  userId: number,
  name: string,
  baseSeconds: number,
  adjustMinutes: number,
): Promise<void> {
  const db = getDb();
  const now = new Date();
  // 現在の最大 sort_order を取得
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(timers.sort_order) })
    .from(timers)
    .where(eq(timers.user_id, userId));
  const sortOrder = (maxOrder ?? 0) + 1000;
  await db.insert(timers).values({
    user_id: userId,
    name,
    base_seconds: baseSeconds,
    adjust_minutes: adjustMinutes,
    remaining_seconds: baseSeconds,
    sort_order: sortOrder,
    created: now,
    updated: now,
  });
}

/** タイマー設定を変更する */
export async function updateTimer(
  userId: number,
  timerId: number,
  data: { name?: string; base_seconds?: number; adjust_minutes?: number },
): Promise<void> {
  await getOwnedTimer(timerId, userId);
  const db = getDb();
  const updates: Record<string, unknown> = { updated: new Date() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.base_seconds !== undefined) updates.base_seconds = data.base_seconds;
  if (data.adjust_minutes !== undefined)
    updates.adjust_minutes = data.adjust_minutes;
  await db.update(timers).set(updates).where(eq(timers.id, timerId));
}

/** タイマーを削除する */
export async function deleteTimer(
  userId: number,
  timerId: number,
): Promise<void> {
  await getOwnedTimer(timerId, userId);
  const db = getDb();
  await db.delete(timers).where(eq(timers.id, timerId));
}

/** タイマーを開始する */
export async function startTimer(
  userId: number,
  timerId: number,
): Promise<void> {
  const timer = await getOwnedTimer(timerId, userId);
  if (timer.running) return;
  if (timer.remaining_seconds <= 0) return;
  const db = getDb();
  await db
    .update(timers)
    .set({ running: 1, started_at: new Date(), updated: new Date() })
    .where(eq(timers.id, timerId));
}

/** タイマーを一時停止する */
export async function pauseTimer(
  userId: number,
  timerId: number,
): Promise<void> {
  const timer = await getOwnedTimer(timerId, userId);
  if (!timer.running || !timer.started_at) return;
  const elapsed = Math.floor((Date.now() - timer.started_at.getTime()) / 1000);
  const remaining = Math.max(0, timer.remaining_seconds - elapsed);
  const db = getDb();
  await db
    .update(timers)
    .set({
      running: 0,
      remaining_seconds: remaining,
      started_at: null,
      updated: new Date(),
    })
    .where(eq(timers.id, timerId));
}

/** タイマーをリセットする（base_seconds に戻す） */
export async function resetTimer(
  userId: number,
  timerId: number,
): Promise<void> {
  const timer = await getOwnedTimer(timerId, userId);
  const db = getDb();
  await db
    .update(timers)
    .set({
      running: 0,
      remaining_seconds: timer.base_seconds,
      started_at: null,
      updated: new Date(),
    })
    .where(eq(timers.id, timerId));
}

/** タイマーの残り時間を延長/削減する */
export async function adjustTimer(
  userId: number,
  timerId: number,
  minutes: number,
): Promise<void> {
  const timer = await getOwnedTimer(timerId, userId);
  let currentRemaining = timer.remaining_seconds;
  // running 中は経過時間を考慮
  if (timer.running && timer.started_at) {
    const elapsed = Math.floor(
      (Date.now() - timer.started_at.getTime()) / 1000,
    );
    currentRemaining -= elapsed;
  }
  const newRemaining = Math.max(0, currentRemaining + minutes * 60);
  const db = getDb();
  if (timer.running && timer.started_at) {
    // running 中: started_at を現在時刻にリセットし、remaining_seconds を新しい値に
    await db
      .update(timers)
      .set({
        remaining_seconds: newRemaining,
        started_at: newRemaining > 0 ? new Date() : null,
        running: newRemaining > 0 ? 1 : 0,
        updated: new Date(),
      })
      .where(eq(timers.id, timerId));
  } else {
    await db
      .update(timers)
      .set({ remaining_seconds: newRemaining, updated: new Date() })
      .where(eq(timers.id, timerId));
  }
}

/**
 * タイマーを停止する（0秒到達時）。
 * startedAt が指定された場合、タイマーがリセット/再開されていないことを確認する。
 * これにより、遅延した stop リクエストが新しいセッションを上書きするのを防ぐ。
 */
export async function stopTimer(
  userId: number,
  timerId: number,
  startedAt?: string | null,
): Promise<void> {
  const timer = await getOwnedTimer(timerId, userId);
  // started_at が指定された場合、タイマーがリセット/再開されていないことを確認
  if (startedAt !== undefined) {
    const currentStartedAt = timer.started_at
      ? timer.started_at.toISOString()
      : null;
    if (currentStartedAt !== startedAt) return;
  }
  if (!timer.running) return;
  const db = getDb();
  await db
    .update(timers)
    .set({
      running: 0,
      remaining_seconds: 0,
      started_at: null,
      updated: new Date(),
    })
    .where(eq(timers.id, timerId));
}

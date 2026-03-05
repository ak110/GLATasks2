/**
 * @fileoverview Zod バリデーションスキーマ定義
 */

import { z } from "zod";

// ── 共通スキーマ ──

export const TaskStatusSchema = z.enum(["active", "completed", "archived"]);
export const ShowTypeSchema = z.enum(["active", "archived", "all"]);
export const ListStatusSchema = z.enum(["active", "archived"]);

// ── 検索スキーマ ──

export const SearchTasksSchema = z.object({
  query: z.string().min(1).max(255),
});

// ── タスク操作スキーマ ──

export const CreateTaskSchema = z.object({
  listId: z.number().int().positive(),
  text: z.string().min(1, "タスク内容は必須です").max(10000),
});

export const UpdateTaskSchema = z
  .object({
    listId: z.number().int().positive(),
    taskId: z.number().int().positive(),
    text: z.string().min(1).max(10000).optional(),
    status: TaskStatusSchema.optional(),
    completed: z.string().datetime().nullable().optional(),
    move_to: z.number().int().positive().optional(),
    keep_order: z.boolean().default(false),
  })
  .refine(
    (data) =>
      data.text !== undefined ||
      data.status !== undefined ||
      data.move_to !== undefined,
    { message: "更新する項目が指定されていません" },
  );

// ── リスト操作スキーマ ──

export const CreateListSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(255),
});

export const UpdateListSchema = z.object({
  listId: z.number().int().positive(),
  title: z.string().min(1, "タイトルは必須です").max(255),
});

export const GetListTasksSchema = z.object({
  listId: z.number().int().positive(),
  showType: ShowTypeSchema,
  ifModifiedSince: z.string().datetime().optional(),
});

// ── タイマー操作スキーマ ──

export const CreateTimerSchema = z.object({
  name: z.string().trim().max(255),
  base_seconds: z.number().int().positive("ベース時間は正の整数が必要です"),
  adjust_minutes: z.number().int().min(1).max(999).default(5),
});

export const UpdateTimerSchema = z.object({
  timerId: z.number().int().positive(),
  name: z.string().trim().max(255).optional(),
  base_seconds: z.number().int().positive().optional(),
  adjust_minutes: z.number().int().min(1).max(999).optional(),
});

export const TimerIdSchema = z.object({
  timerId: z.number().int().positive(),
});

export const TimerStopSchema = z.object({
  timerId: z.number().int().positive(),
  // アラーム発火時の started_at。リセット/再開されていないことを確認するために使用
  started_at: z.string().datetime().nullable().optional(),
});

export const AdjustTimerSchema = z.object({
  timerId: z.number().int().positive(),
  minutes: z.number().int(),
});

// ── 認証スキーマ ──

export const RegisterUserSchema = z.object({
  userId: z
    .string()
    .regex(
      /^[a-zA-Z0-9]{4,32}$/,
      "ユーザーIDは4～32文字の英数字としてください",
    ),
  password: z.string().min(1, "パスワードは必須です"),
});

export const LoginSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(1),
});

// ── 並び替えスキーマ ──

export const ReorderTasksSchema = z.object({
  listId: z.number().int().positive(),
  taskIds: z.array(z.number().int().positive()),
});

export const ReorderListsSchema = z.object({
  listIds: z.array(z.number().int().positive()),
});

// ── 型エクスポート ──

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type ShowType = z.infer<typeof ShowTypeSchema>;
export type ListStatus = z.infer<typeof ListStatusSchema>;

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type CreateListInput = z.infer<typeof CreateListSchema>;
export type UpdateListInput = z.infer<typeof UpdateListSchema>;
export type GetListTasksInput = z.infer<typeof GetListTasksSchema>;
export type CreateTimerInput = z.infer<typeof CreateTimerSchema>;
export type UpdateTimerInput = z.infer<typeof UpdateTimerSchema>;
export type AdjustTimerInput = z.infer<typeof AdjustTimerSchema>;
export type TimerStopInput = z.infer<typeof TimerStopSchema>;
export type SearchTasksInput = z.infer<typeof SearchTasksSchema>;
export type ReorderTasksInput = z.infer<typeof ReorderTasksSchema>;
export type ReorderListsInput = z.infer<typeof ReorderListsSchema>;
export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * @fileoverview Zod バリデーションスキーマ定義
 */

import { z } from "zod";

// ── 共通スキーマ ──

export const TaskStatusSchema = z.enum(["needsAction", "completed", "hidden"]);
export const ShowTypeSchema = z.enum(["list", "hidden", "all"]);
export const ListStatusSchema = z.enum(["show", "hidden", "active"]);

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

// ── 型エクスポート ──

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type ShowType = z.infer<typeof ShowTypeSchema>;
export type ListStatus = z.infer<typeof ListStatusSchema>;

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type CreateListInput = z.infer<typeof CreateListSchema>;
export type UpdateListInput = z.infer<typeof UpdateListSchema>;
export type GetListTasksInput = z.infer<typeof GetListTasksSchema>;
export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

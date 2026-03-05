/**
 * @fileoverview tRPC ルーター定義と暗号化ミドルウェア
 */

import { initTRPC, TRPCError } from "@trpc/server";
import type { RequestEvent } from "@sveltejs/kit";
import {
  CreateListSchema,
  CreateTaskSchema,
  CreateTimerSchema,
  GetListTasksSchema,
  RegisterUserSchema,
  ShowTypeSchema,
  UpdateListSchema,
  UpdateTaskSchema,
  UpdateTimerSchema,
  TimerIdSchema,
  TimerStopSchema,
  AdjustTimerSchema,
  LoginSchema,
  SearchTasksSchema,
  ReorderTasksSchema,
} from "$lib/schemas";
import * as api from "./api";
import { decryptToString, encryptObject } from "./crypto";
import { sendEvent } from "./sse";

// ── Context 型定義 ──

interface Context {
  event: RequestEvent;
  userId: number | null;
  encryptKey: string;
}

// ── tRPC 初期化 ──

const t = initTRPC.context<Context>().create();

// ── ミドルウェア ──

/**
 * 認証必須ミドルウェア
 */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "ログインが必要です",
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

/**
 * 暗号化ミドルウェア: 入力を復号化し、出力を暗号化する
 */
const withEncryption = t.middleware(async ({ getRawInput, next }) => {
  // getRawInput() で生の入力を取得（tRPC v11 API）
  const rawInput = await getRawInput();

  // 入力が暗号化されている場合は復号化
  let decryptedInput = rawInput;
  if (
    typeof rawInput === "object" &&
    rawInput !== null &&
    "encrypted" in rawInput &&
    typeof (rawInput as Record<string, unknown>).encrypted === "string"
  ) {
    try {
      const decryptedStr = await decryptToString(
        (rawInput as Record<string, unknown>).encrypted as string,
      );
      decryptedInput = JSON.parse(decryptedStr);
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Failed to decrypt input",
        cause: error,
      });
    }
  }

  // 次のミドルウェア/プロシージャを実行（復号化した入力を渡す）
  const result = await next({
    getRawInput: async () => decryptedInput,
  });

  // 出力を暗号化して返す（result を直接変更し型推論を保持する）
  if (result.ok) {
    (result as unknown as Record<string, unknown>).data = {
      encrypted: await encryptObject(result.data),
    };
  }

  return result;
});

// ── プロシージャ定義 ──

const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(isAuthed);
const encryptedProcedure = protectedProcedure.use(withEncryption);

// ── ルーター定義 ──

export const appRouter = t.router({
  // ── 認証 ──
  auth: t.router({
    login: publicProcedure.input(LoginSchema).mutation(async ({ input }) => {
      const user = await api.validateCredentials(input.userId, input.password);
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "ユーザーIDまたはパスワードが間違っています",
        });
      }
      return user;
    }),

    register: publicProcedure
      .input(RegisterUserSchema)
      .mutation(async ({ input }) => {
        return api.registerUser(input.userId, input.password);
      }),
  }),

  // ── リスト操作 ──
  lists: t.router({
    list: encryptedProcedure
      .input(ShowTypeSchema)
      .query(async ({ ctx, input }) => {
        return api.getLists(ctx.userId, input);
      }),

    create: encryptedProcedure
      .input(CreateListSchema)
      .mutation(async ({ ctx, input }) => {
        await api.postList(ctx.userId, input.title);
        sendEvent(ctx.userId, "lists:updated");
        return { success: true };
      }),

    rename: encryptedProcedure
      .input(UpdateListSchema)
      .mutation(async ({ ctx, input }) => {
        await api.renameList(ctx.userId, input.listId, input.title);
        sendEvent(ctx.userId, "lists:updated");
        return { success: true };
      }),

    delete: encryptedProcedure
      .input(UpdateListSchema.pick({ listId: true }))
      .mutation(async ({ ctx, input }) => {
        await api.deleteList(ctx.userId, input.listId);
        sendEvent(ctx.userId, "lists:updated");
        return { success: true };
      }),

    archive: encryptedProcedure
      .input(UpdateListSchema.pick({ listId: true }))
      .mutation(async ({ ctx, input }) => {
        await api.archiveList(ctx.userId, input.listId);
        sendEvent(ctx.userId, "lists:updated");
        return { success: true };
      }),

    unarchive: encryptedProcedure
      .input(UpdateListSchema.pick({ listId: true }))
      .mutation(async ({ ctx, input }) => {
        await api.unarchiveList(ctx.userId, input.listId);
        sendEvent(ctx.userId, "lists:updated");
        return { success: true };
      }),

    clear: encryptedProcedure
      .input(UpdateListSchema.pick({ listId: true }))
      .mutation(async ({ ctx, input }) => {
        await api.clearList(ctx.userId, input.listId);
        sendEvent(ctx.userId, "tasks:updated");
        return { success: true };
      }),
  }),

  // ── タスク操作 ──
  tasks: t.router({
    list: encryptedProcedure
      .input(GetListTasksSchema)
      .query(async ({ ctx, input }) => {
        return api.getListTasks(
          ctx.userId,
          input.listId,
          input.showType,
          input.ifModifiedSince,
        );
      }),

    create: encryptedProcedure
      .input(CreateTaskSchema)
      .mutation(async ({ ctx, input }) => {
        await api.postTask(ctx.userId, input.listId, input.text);
        sendEvent(ctx.userId, "tasks:updated");
        return { success: true };
      }),

    update: encryptedProcedure
      .input(UpdateTaskSchema)
      .mutation(async ({ ctx, input }) => {
        const { listId, taskId, ...data } = input;
        const result = api.patchTask(ctx.userId, listId, taskId, data);
        sendEvent(ctx.userId, "tasks:updated");
        return result;
      }),

    search: encryptedProcedure
      .input(SearchTasksSchema)
      .query(async ({ ctx, input }) => {
        return api.searchTasks(ctx.userId, input.query);
      }),

    reorder: encryptedProcedure
      .input(ReorderTasksSchema)
      .mutation(async ({ ctx, input }) => {
        await api.reorderTasks(ctx.userId, input.listId, input.taskIds);
        sendEvent(ctx.userId, "tasks:updated");
        return { success: true };
      }),
  }),

  // ── タイマー操作 ──
  timers: t.router({
    list: encryptedProcedure.query(async ({ ctx }) => {
      return api.getTimers(ctx.userId);
    }),

    create: encryptedProcedure
      .input(CreateTimerSchema)
      .mutation(async ({ ctx, input }) => {
        await api.createTimer(
          ctx.userId,
          input.name,
          input.base_seconds,
          input.adjust_minutes,
        );
        sendEvent(ctx.userId, "timers:updated");
        return { success: true };
      }),

    update: encryptedProcedure
      .input(UpdateTimerSchema)
      .mutation(async ({ ctx, input }) => {
        const { timerId, ...data } = input;
        await api.updateTimer(ctx.userId, timerId, data);
        sendEvent(ctx.userId, "timers:updated");
        return { success: true };
      }),

    delete: encryptedProcedure
      .input(TimerIdSchema)
      .mutation(async ({ ctx, input }) => {
        await api.deleteTimer(ctx.userId, input.timerId);
        sendEvent(ctx.userId, "timers:updated");
        return { success: true };
      }),

    start: encryptedProcedure
      .input(TimerIdSchema)
      .mutation(async ({ ctx, input }) => {
        await api.startTimer(ctx.userId, input.timerId);
        sendEvent(ctx.userId, "timers:updated");
        return { success: true };
      }),

    pause: encryptedProcedure
      .input(TimerIdSchema)
      .mutation(async ({ ctx, input }) => {
        await api.pauseTimer(ctx.userId, input.timerId);
        sendEvent(ctx.userId, "timers:updated");
        return { success: true };
      }),

    reset: encryptedProcedure
      .input(TimerIdSchema)
      .mutation(async ({ ctx, input }) => {
        await api.resetTimer(ctx.userId, input.timerId);
        sendEvent(ctx.userId, "timers:updated");
        return { success: true };
      }),

    adjust: encryptedProcedure
      .input(AdjustTimerSchema)
      .mutation(async ({ ctx, input }) => {
        await api.adjustTimer(ctx.userId, input.timerId, input.minutes);
        sendEvent(ctx.userId, "timers:updated");
        return { success: true };
      }),

    stop: encryptedProcedure
      .input(TimerStopSchema)
      .mutation(async ({ ctx, input }) => {
        await api.stopTimer(ctx.userId, input.timerId, input.started_at);
        sendEvent(ctx.userId, "timers:updated");
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

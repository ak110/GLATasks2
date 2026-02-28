/**
 * @fileoverview tRPC ルーター定義と暗号化ミドルウェア
 */

import { initTRPC, TRPCError } from "@trpc/server";
import type { RequestEvent } from "@sveltejs/kit";
import {
  CreateListSchema,
  CreateTaskSchema,
  GetListTasksSchema,
  RegisterUserSchema,
  ShowTypeSchema,
  UpdateListSchema,
  UpdateTaskSchema,
  LoginSchema,
} from "$lib/schemas";
import * as api from "./api";

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

// ── プロシージャ定義 ──

const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(isAuthed);

// TODO: 暗号化ミドルウェアは後で実装
// 現時点では protectedProcedure をそのまま使用
const encryptedProcedure = protectedProcedure;

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
        return { success: true };
      }),

    rename: encryptedProcedure
      .input(UpdateListSchema)
      .mutation(async ({ ctx, input }) => {
        await api.renameList(ctx.userId, input.listId, input.title);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(UpdateListSchema.pick({ listId: true }))
      .mutation(async ({ ctx, input }) => {
        await api.deleteList(ctx.userId, input.listId);
        return { success: true };
      }),

    hide: protectedProcedure
      .input(UpdateListSchema.pick({ listId: true }))
      .mutation(async ({ ctx, input }) => {
        await api.hideList(ctx.userId, input.listId);
        return { success: true };
      }),

    show: protectedProcedure
      .input(UpdateListSchema.pick({ listId: true }))
      .mutation(async ({ ctx, input }) => {
        await api.showList(ctx.userId, input.listId);
        return { success: true };
      }),

    clear: protectedProcedure
      .input(UpdateListSchema.pick({ listId: true }))
      .mutation(async ({ ctx, input }) => {
        await api.clearList(ctx.userId, input.listId);
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
        return { success: true };
      }),

    update: encryptedProcedure
      .input(UpdateTaskSchema)
      .mutation(async ({ ctx, input }) => {
        const { listId, taskId, ...data } = input;
        return api.patchTask(ctx.userId, listId, taskId, data);
      }),
  }),
});

export type AppRouter = typeof appRouter;

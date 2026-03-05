/**
 * @fileoverview SSE エンドポイント（リアルタイム通知用）
 *
 * Cookie 認証済みユーザーに対して SSE 接続を提供する。
 * mutation 完了時にイベント種別（lists:updated 等）のみを配信する。
 */

import type { RequestHandler } from "./$types";
import { addConnection, removeConnection } from "$lib/server/sse";

export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.user_id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  let savedController: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      savedController = controller;
      addConnection(userId, controller);
      // 接続確立を通知（クライアントが接続成功を検知するため）
      controller.enqueue(
        new TextEncoder().encode("event: connected\ndata: \n\n"),
      );
    },
    cancel() {
      if (savedController) {
        removeConnection(userId, savedController);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
};

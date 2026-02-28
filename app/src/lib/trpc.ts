/**
 * @fileoverview tRPC クライアント（ブラウザ側）
 */

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "$lib/server/trpc";

// TODO: 暗号化リンクは後で実装
export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
    }),
  ],
});

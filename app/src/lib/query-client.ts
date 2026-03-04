/**
 * @fileoverview Tanstack Query クライアント設定
 */

import { QueryClient } from "@tanstack/svelte-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分間はキャッシュ有効
      gcTime: 10 * 60 * 1000, // 10分間はガベージコレクション対象外
      refetchOnWindowFocus: "always",
      retry: 1,
    },
  },
});

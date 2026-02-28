/**
 * @fileoverview Tanstack Query クライアント設定
 */

import { QueryClient } from "@tanstack/svelte-query";
import { get, set, del } from "idb-keyval";

/**
 * IndexedDB を使用したキャッシュ永続化
 */
const persister = {
  async persistClient(client: unknown) {
    await set("tanstack-query-cache", client);
  },
  async restoreClient() {
    return await get<unknown>("tanstack-query-cache");
  },
  async removeClient() {
    await del("tanstack-query-cache");
  },
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分間はキャッシュ有効
      gcTime: 10 * 60 * 1000, // 10分間はガベージコレクション対象外
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ブラウザ環境でのみキャッシュ復元
if (typeof window !== "undefined") {
  persister.restoreClient().then((cached) => {
    if (cached) {
      queryClient.setQueryData(["__persisted__"], cached);
    }
  });

  // ページ離脱時にキャッシュ保存
  window.addEventListener("beforeunload", () => {
    const cache = queryClient.getQueryCache().getAll();
    persister.persistClient(cache);
  });
}

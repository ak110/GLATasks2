/**
 * @fileoverview tRPC クライアント（ブラウザ側）
 */

import { createTRPCClient, httpBatchLink, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AppRouter } from "$lib/server/trpc";
import { encrypt, decrypt } from "$lib/crypto";

// 暗号化鍵を保持するグローバル変数
let encryptKey: string | null = null;

/**
 * 暗号化鍵を設定する（+layout.svelteから呼ばれる）
 */
export function setEncryptKey(key: string) {
  encryptKey = key;
}

/**
 * 暗号化リンク: リクエストを暗号化し、レスポンスを復号化する
 */
const encryptionLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next: async (value) => {
          // レスポンスが暗号化されている場合は復号化
          if (
            value.result.type === "data" &&
            typeof value.result.data === "object" &&
            value.result.data !== null &&
            "encrypted" in value.result.data &&
            typeof value.result.data.encrypted === "string"
          ) {
            if (!encryptKey) {
              observer.error(new Error("Encryption key not set"));
              return;
            }
            try {
              const decryptedStr = await decrypt(
                value.result.data.encrypted,
                encryptKey,
              );
              const decryptedData = JSON.parse(decryptedStr);
              observer.next({
                ...value,
                result: {
                  ...value.result,
                  data: decryptedData,
                },
              });
            } catch (error) {
              observer.error(
                new Error("Failed to decrypt response", { cause: error }),
              );
            }
          } else {
            observer.next(value);
          }
        },
        error: (err) => observer.error(err),
        complete: () => observer.complete(),
      });
      return unsubscribe;
    });
  };
};

/**
 * リクエスト暗号化用のfetch wrapper
 */
async function encryptedFetch(
  url: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (init?.body && encryptKey) {
    try {
      const bodyObj = JSON.parse(init.body as string);
      // バッチリクエストの各アイテムを暗号化
      if (Array.isArray(bodyObj)) {
        const encryptedBatch = await Promise.all(
          bodyObj.map(async (item) => {
            if (item.input !== undefined) {
              const encryptedInput = await encrypt(
                JSON.stringify(item.input),
                encryptKey!,
              );
              return {
                ...item,
                input: { encrypted: encryptedInput },
              };
            }
            return item;
          }),
        );
        init = {
          ...init,
          body: JSON.stringify(encryptedBatch),
        };
      } else if (bodyObj.input !== undefined) {
        // 単一リクエストの場合
        const encryptedInput = await encrypt(
          JSON.stringify(bodyObj.input),
          encryptKey,
        );
        init = {
          ...init,
          body: JSON.stringify({
            ...bodyObj,
            input: { encrypted: encryptedInput },
          }),
        };
      }
    } catch (error) {
      console.error("Failed to encrypt request:", error);
    }
  }
  return fetch(url, init);
}

export const trpc = createTRPCClient<AppRouter>({
  links: [
    encryptionLink,
    httpBatchLink({
      url: "/api/trpc",
      fetch: encryptedFetch,
    }),
  ],
});

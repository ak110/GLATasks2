/**
 * @fileoverview tRPC SvelteKit アダプター
 */

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { RequestHandler } from "@sveltejs/kit";
import { appRouter } from "$lib/server/trpc";
import { getEncryptKey } from "$lib/server/env";

export const GET: RequestHandler = async (event) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: event.request,
    router: appRouter,
    createContext: () => ({
      event,
      userId: event.locals.user_id ?? null,
      encryptKey: getEncryptKey(),
    }),
  });
};

export const POST: RequestHandler = GET;

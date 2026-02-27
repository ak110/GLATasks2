import { error } from "@sveltejs/kit";
import * as api from "$lib/server/api";
import { encryptObject } from "$lib/server/crypto";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, locals, params }) => {
  if (!locals.user_id) error(401);

  const listId = Number(params.list_id);
  const ifModifiedSince = request.headers.get("If-Modified-Since") ?? undefined;

  const result = await api.getListTasks(
    locals.user_id,
    listId,
    params.show_type,
    ifModifiedSince,
  );
  if (result.status === 304) {
    return new Response(null, { status: 304 });
  }

  const encrypted = await encryptObject(result.data);
  return new Response(JSON.stringify({ data: encrypted }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Last-Modified": result.lastModified,
    },
  });
};

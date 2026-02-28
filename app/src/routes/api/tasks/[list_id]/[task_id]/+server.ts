import { json, error } from "@sveltejs/kit";
import * as api from "$lib/server/api";
import { decryptToString } from "$lib/server/crypto";
import type { RequestHandler } from "./$types";

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
  if (!locals.user_id) error(401);

  const listId = Number(params.list_id);
  const taskId = Number(params.task_id);
  const body = (await request.json()) as { data: string };
  const data = JSON.parse(await decryptToString(body.data)) as Record<
    string,
    unknown
  >;
  const result = await api.patchTask(locals.user_id, listId, taskId, data);
  return json(result);
};

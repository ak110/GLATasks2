import { json, error } from "@sveltejs/kit";
import * as api from "$lib/server/api";
import { decryptToString } from "$lib/server/crypto";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals, params }) => {
  if (!locals.user_id) error(401);

  const listId = Number(params.list_id);
  const body = (await request.json()) as { data: string };
  const plain = JSON.parse(await decryptToString(body.data)) as {
    text: string;
  };
  await api.postTask(locals.user_id, listId, plain.text);
  return json({ status: "ok" });
};

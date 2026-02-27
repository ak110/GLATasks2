import { json, error } from "@sveltejs/kit";
import * as api from "$lib/server/api";
import { decryptToString } from "$lib/server/crypto";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user_id) error(401);

  const body = (await request.json()) as { data: string };
  const plain = JSON.parse(await decryptToString(body.data)) as {
    title: string;
  };
  await api.postList(locals.user_id, plain.title);
  return json({ status: "ok" });
};

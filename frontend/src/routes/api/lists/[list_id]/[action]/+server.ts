import { json, error } from "@sveltejs/kit";
import * as api from "$lib/server/api";
import { decryptToString } from "$lib/server/crypto";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals, params }) => {
  if (!locals.user_id) error(401);

  const listId = Number(params.list_id);
  const { action } = params;

  switch (action) {
    case "clear":
      await api.clearList(locals.user_id, listId);
      break;
    case "rename": {
      const body = (await request.json()) as { data: string };
      const plain = JSON.parse(await decryptToString(body.data)) as {
        title: string;
      };
      await api.renameList(locals.user_id, listId, plain.title);
      break;
    }
    case "delete":
      await api.deleteList(locals.user_id, listId);
      break;
    case "hide":
      await api.hideList(locals.user_id, listId);
      break;
    case "show":
      await api.showList(locals.user_id, listId);
      break;
    default:
      error(404, `Unknown action: ${action}`);
  }

  return json({ status: "ok" });
};

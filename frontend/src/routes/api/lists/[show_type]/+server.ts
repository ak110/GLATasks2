import { json, error } from "@sveltejs/kit";
import * as api from "$lib/server/api";
import { encryptObject } from "$lib/server/crypto";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.user_id) error(401);

  const ifModifiedSince = request.headers.get("If-Modified-Since");
  const lists = await api.getLists(locals.user_id, params.show_type);

  let lastModified = "";
  if (lists.length > 0) {
    const latest = lists.reduce((a, b) =>
      a.last_updated > b.last_updated ? a : b,
    );
    lastModified = latest.last_updated;
  }

  if (ifModifiedSince && lastModified && lastModified <= ifModifiedSince) {
    return new Response(null, { status: 304 });
  }

  const encrypted = await encryptObject(lists);
  return json(
    { data: encrypted },
    { headers: lastModified ? { "Last-Modified": lastModified } : {} },
  );
};

import * as api from "$lib/server/api";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const lists = await api.getLists(locals.user_id!, "list");
  return { lists };
};

import { fail } from "@sveltejs/kit";
import * as api from "$lib/server/api";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  const title = url.searchParams.get("title") ?? "";
  const pageUrl = url.searchParams.get("url") ?? "";
  const inPopup = url.searchParams.get("in_popup") === "1";

  const lists = await api.getLists(locals.user_id!, "list");
  return { title, pageUrl, inPopup, lists };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    const listId = Number(data.get("list_id"));
    const text = data.get("text") as string;

    if (!listId || !text) {
      return fail(400, { error: "入力内容が不正です。" });
    }

    try {
      await api.postTask(locals.user_id!, listId, text);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "タスクの追加に失敗しました。";
      return fail(500, { error: msg });
    }

    return { success: true };
  },
};

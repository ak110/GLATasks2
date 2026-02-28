import { fail, redirect } from "@sveltejs/kit";
import * as api from "$lib/server/api";
import { createSessionToken } from "$lib/server/session";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user_id) {
    redirect(302, "/");
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const userId = data.get("user_id") as string;
    const password = data.get("password") as string;
    const passwordConfirm = data.get("password_confirm") as string;

    if (!userId || !password) {
      return fail(400, { error: "ユーザーIDとパスワードを入力してください。" });
    }
    if (password !== passwordConfirm) {
      return fail(400, { error: "パスワードが一致しません。" });
    }

    try {
      const userInfo = await api.registerUser(userId, password);
      const token = await createSessionToken(userInfo.id);
      cookies.set("gla-session", token, {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 365 * 24 * 60 * 60,
      });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "ユーザー登録に失敗しました。";
      return fail(400, { error: msg });
    }

    redirect(302, "/");
  },
};

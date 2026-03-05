/**
 * @fileoverview ログインページのサーバーサイド処理（認証・セッション発行）
 */

import { fail, redirect } from "@sveltejs/kit";
import * as api from "$lib/server/api";
import { createSessionToken, setSessionCookie } from "$lib/server/session";
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
    const user = data.get("user") as string;
    const password = data.get("password") as string;

    if (!user || !password) {
      return fail(400, { error: "ユーザーIDとパスワードを入力してください。" });
    }

    const userInfo = await api.validateCredentials(user, password);
    if (!userInfo) {
      return fail(401, { error: "ユーザーIDまたはパスワードが異なります。" });
    }

    const token = await createSessionToken(userInfo.id);
    setSessionCookie(cookies, token);

    redirect(302, "/");
  },
};

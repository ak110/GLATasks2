import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ cookies }) => {
  cookies.delete("gla-session", { path: "/" });
  redirect(302, "/auth/login");
};

import type { Handle } from "@sveltejs/kit";
import { verifySessionToken } from "$lib/server/session";

export const handle: Handle = async ({ event, resolve }) => {
  // CSRF対策: cross-site リクエストを API ルートでブロック（Fetch Metadata）
  const secFetchSite = event.request.headers.get("sec-fetch-site");
  const isMutating = ["POST", "PATCH", "PUT", "DELETE"].includes(
    event.request.method,
  );
  if (
    secFetchSite === "cross-site" &&
    isMutating &&
    event.url.pathname.startsWith("/api/")
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  // セッション Cookie の検証（JWT/HS256）
  const sessionCookie = event.cookies.get("gla-session");
  event.locals.user_id = sessionCookie
    ? await verifySessionToken(sessionCookie)
    : null;

  return resolve(event);
};

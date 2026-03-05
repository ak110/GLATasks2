/**
 * @fileoverview セッショントークン（JWT/HS256）の生成・検証
 */

import type { Cookies } from "@sveltejs/kit";
import { SignJWT, jwtVerify } from "jose";
import { getJwtSecret } from "./env";

/**
 * セッション署名用の秘密鍵を取得する（Uint8Array形式で）。
 */
function getSecret(): Uint8Array {
  const base64Secret = getJwtSecret();
  return Uint8Array.from(atob(base64Secret), (c) => c.codePointAt(0)!);
}

/**
 * ユーザーIDを含む署名済みセッショントークンを生成する。
 */
export async function createSessionToken(userId: number): Promise<string> {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(getSecret());
}

/** セッション Cookie 名 */
const SESSION_COOKIE = "gla-session";

/** セッション Cookie 有効期限（秒） */
const SESSION_MAX_AGE = 365 * 24 * 60 * 60;

/**
 * セッショントークンを Cookie にセットする。
 */
export function setSessionCookie(cookies: Cookies, token: string): void {
  cookies.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * セッショントークンを検証してユーザーIDを返す。
 * 無効なトークンの場合は null を返す。
 */
export async function verifySessionToken(
  token: string,
): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.sub ? parseInt(payload.sub, 10) : null;
    return userId !== null && !isNaN(userId) ? userId : null;
  } catch {
    return null;
  }
}

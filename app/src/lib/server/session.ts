/**
 * @fileoverview セッショントークン（JWT/HS256）の生成・検証
 */

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

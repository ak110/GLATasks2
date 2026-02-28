/**
 * @fileoverview セッショントークン（JWT/HS256）の生成・検証
 */

import crypto from "node:crypto";
import fs from "node:fs";
import { SignJWT, jwtVerify } from "jose";

let _secret: Uint8Array | null = null;

/**
 * セッション署名用の秘密鍵を取得する。
 * ファイルが存在しない場合はランダム生成して保存する。
 */
function getSecret(): Uint8Array {
  if (!_secret) {
    const keyFile =
      process.env.SESSION_SECRET_FILE ??
      (process.env.DATA_DIR ? `${process.env.DATA_DIR}/.secret_key` : null);
    if (!keyFile)
      throw new Error("SESSION_SECRET_FILE or DATA_DIR env var is required");

    if (!fs.existsSync(keyFile)) {
      const key = crypto.randomBytes(32);
      fs.writeFileSync(keyFile, key, { mode: 0o600 });
      _secret = new Uint8Array(key);
    } else {
      _secret = new Uint8Array(fs.readFileSync(keyFile));
    }
  }
  return _secret;
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

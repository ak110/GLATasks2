/**
 * @fileoverview 環境変数の型安全な管理
 */

import fs from "node:fs";
import crypto from "node:crypto";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATA_DIR: z.string().default("./data"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PROTOCOL_HEADER: z.string().optional(),
});

export const env = envSchema.parse(process.env);

// ── 暗号化キー・JWT秘密鍵の管理 ──

let _encryptKey: string | null = null;
let _jwtSecret: string | null = null;

/**
 * 鍵ファイルを読み込む（32バイトバイナリ形式、Base64文字列として返す）
 */
function loadOrCreateKey(keyPath: string): string {
  fs.mkdirSync(env.DATA_DIR, { recursive: true });

  if (!fs.existsSync(keyPath)) {
    const newKey = crypto.randomBytes(32);
    fs.writeFileSync(keyPath, newKey);
    return newKey.toString("base64");
  }

  return fs.readFileSync(keyPath).toString("base64");
}

/**
 * 暗号化キーを取得する（初回起動時に自動生成）
 */
export function getEncryptKey(): string {
  if (!_encryptKey) {
    _encryptKey = loadOrCreateKey(`${env.DATA_DIR}/.encrypt_key`);
  }
  return _encryptKey;
}

/**
 * JWT署名用秘密鍵を取得する（初回起動時に自動生成）
 */
export function getJwtSecret(): string {
  if (!_jwtSecret) {
    _jwtSecret = loadOrCreateKey(`${env.DATA_DIR}/.secret_key`);
  }
  return _jwtSecret;
}

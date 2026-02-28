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
 * 暗号化キーを取得する（初回起動時に自動生成）
 */
export function getEncryptKey(): string {
  if (!_encryptKey) {
    const keyPath = `${env.DATA_DIR}/.encrypt_key`;
    if (!fs.existsSync(keyPath)) {
      _encryptKey = crypto.randomBytes(32).toString("base64");
      fs.mkdirSync(env.DATA_DIR, { recursive: true });
      fs.writeFileSync(keyPath, _encryptKey, "utf-8");
    } else {
      _encryptKey = fs.readFileSync(keyPath, "utf-8").trim();
    }
  }
  return _encryptKey;
}

/**
 * JWT署名用秘密鍵を取得する（初回起動時に自動生成）
 */
export function getJwtSecret(): string {
  if (!_jwtSecret) {
    const keyPath = `${env.DATA_DIR}/.secret_key`;
    if (!fs.existsSync(keyPath)) {
      _jwtSecret = crypto.randomBytes(32).toString("base64");
      fs.mkdirSync(env.DATA_DIR, { recursive: true });
      fs.writeFileSync(keyPath, _jwtSecret, "utf-8");
    } else {
      _jwtSecret = fs.readFileSync(keyPath, "utf-8").trim();
    }
  }
  return _jwtSecret;
}

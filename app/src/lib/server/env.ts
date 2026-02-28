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
 * 鍵ファイルを読み込み、Base64形式に正規化する（バイナリ形式の既存ファイルにも対応）
 */
function loadOrCreateKey(keyPath: string): string {
  fs.mkdirSync(env.DATA_DIR, { recursive: true });

  if (!fs.existsSync(keyPath)) {
    // 新規作成: Base64形式で保存
    const newKey = crypto.randomBytes(32).toString("base64");
    fs.writeFileSync(keyPath, newKey, "utf-8");
    return newKey;
  }

  // 既存ファイルを読み込み
  const data = fs.readFileSync(keyPath, "utf-8").trim();

  // Base64形式かどうかを判定（Base64は44文字で、[A-Za-z0-9+/=]のみ）
  const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(data) && data.length >= 40;

  if (isBase64) {
    return data;
  }

  // バイナリ形式の場合: バイナリとして読み直してBase64に変換
  const binaryData = fs.readFileSync(keyPath);
  const base64Key = binaryData.toString("base64");

  // Base64形式で上書き保存（次回起動時から統一形式になる）
  fs.writeFileSync(keyPath, base64Key, "utf-8");

  return base64Key;
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

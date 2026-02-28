/**
 * @fileoverview サーバーサイド AES-GCM 暗号化（ブラウザ側と互換）
 */

import fs from "node:fs";

let _encryptKeyBase64: string | null = null;

/**
 * 暗号化キーを取得する（base64 文字列として返す）。
 * ブラウザに渡す際にそのまま使用できる。
 */
export function getEncryptKey(): string {
  if (!_encryptKeyBase64) {
    if (process.env.ENCRYPT_KEY) {
      _encryptKeyBase64 = process.env.ENCRYPT_KEY;
    } else {
      const keyFile =
        process.env.ENCRYPT_KEY_FILE ??
        (process.env.DATA_DIR ? `${process.env.DATA_DIR}/.encrypt_key` : null);
      if (!keyFile) throw new Error("ENCRYPT_KEY_FILE env var is required");
      _encryptKeyBase64 = fs.readFileSync(keyFile).toString("base64");
    }
  }
  return _encryptKeyBase64;
}

async function getCryptoKey(usage: KeyUsage[]): Promise<CryptoKey> {
  const base64 = getEncryptKey();
  const keyBytes = Uint8Array.from(atob(base64), (c) => c.codePointAt(0)!);
  return globalThis.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    usage,
  );
}

/**
 * オブジェクトを JSON 化して AES-GCM 暗号化し、base64 文字列で返す。
 */
export async function encryptObject(obj: unknown): Promise<string> {
  const key = await getCryptoKey(["encrypt"]);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(obj));
  const encrypted = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );
  const full = new Uint8Array(12 + encrypted.byteLength);
  full.set(iv);
  full.set(new Uint8Array(encrypted), 12);
  return btoa(String.fromCodePoint(...full));
}

/**
 * base64 の AES-GCM 暗号文を復号して文字列で返す。
 */
export async function decryptToString(ciphertext: string): Promise<string> {
  const key = await getCryptoKey(["decrypt"]);
  const data = Uint8Array.from(atob(ciphertext), (c) => c.codePointAt(0)!);
  const iv = data.slice(0, 12);
  const encrypted = data.slice(12);
  const decrypted = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted,
  );
  return new TextDecoder().decode(decrypted);
}

/**
 * @fileoverview サーバーサイド AES-GCM 暗号化（ブラウザ側と互換）
 */

import { getEncryptKey } from "./env";

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

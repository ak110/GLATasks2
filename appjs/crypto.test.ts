/** @jest-environment node */

import { webcrypto } from "node:crypto"
import { createKey, decryptText, encryptData, fromBase64, toArrayBuffer, toBase64 } from "./crypto.js"

// Jsdomで動かないので対応
globalThis.crypto = webcrypto as Crypto

describe("Crypto Utils", () => {
  it("should correctly encrypt and decrypt data", async () => {
    expect(globalThis.crypto).toBeDefined()
    expect(globalThis.crypto.subtle).toBeDefined()
    expect(globalThis.crypto.subtle.importKey).toBeDefined()
    expect(globalThis.crypto.subtle.encrypt).toBeDefined()
    expect(globalThis.crypto.subtle.decrypt).toBeDefined()
    // テストデータ
    const originalText = "Hello, World!"
    const key = await createKey(toBase64(toArrayBuffer("1234567890123456"))) // 16バイトのキー
    const iv = fromBase64(toBase64(toArrayBuffer("1234567890123456"))) // 16バイトのIV

    // 暗号化
    const encrypted = await encryptData(originalText, key, iv)

    // 復号
    const decrypted = await decryptText(encrypted, key, iv)

    // 元のテキストと一致することを確認
    expect(decrypted).toBe(originalText)
  })
})

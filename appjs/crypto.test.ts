import { webcrypto } from "node:crypto"
import { describe, expect, it } from "vitest"
import { createKey, decryptText, encryptData, fromBase64, toArrayBuffer, toBase64 } from "./crypto.js"

// Node.js環境でWebCrypto APIを使用するための設定
globalThis.crypto ??= webcrypto as Crypto

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

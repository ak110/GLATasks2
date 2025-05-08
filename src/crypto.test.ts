import { enc } from "crypto-js"
import { decryptText, encryptData } from "./crypto.js"

describe("Crypto Utils", () => {
  it("should correctly encrypt and decrypt data", () => {
    // テストデータ
    const originalText = "Hello, World!"
    const key = enc.Utf8.parse("1234567890123456") // 16バイトのキー
    const iv = enc.Utf8.parse("1234567890123456") // 16バイトのIV

    // 暗号化
    const encrypted = encryptData(originalText, key, iv)

    // 復号
    const decrypted = decryptText(encrypted, key, iv)

    // 元のテキストと一致することを確認
    expect(decrypted).toBe(originalText)
  })
})

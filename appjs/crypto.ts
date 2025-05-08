export function toArrayBuffer(string_: string): ArrayBuffer {
  const encoder = new TextEncoder() // UTF-8でエンコード
  return encoder.encode(string_).buffer as ArrayBuffer
}

// Base64 を Uint8Array に変換
export function fromBase64(base64: string): Uint8Array {
  const binaryString = globalThis.atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    const codePoint = binaryString.codePointAt(i)
    if (codePoint === undefined) {
      throw new Error(`Invalid character at index ${i}`)
    }

    bytes[i] = codePoint
  }

  return bytes
}

// Uint8Array を Base64 に変換
export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binaryString = ""
  for (const byte of bytes) {
    binaryString += String.fromCodePoint(byte)
  }

  return globalThis.btoa(binaryString)
}

// AES-CBC 鍵を CryptoKey としてインポート
export async function createKey(base64Key: string): Promise<CryptoKey> {
  const raw = fromBase64(base64Key)
  const length = raw.byteLength * 8 // 128 or 256 ビットを自動判定
  return globalThis.crypto.subtle.importKey("raw", raw, { name: "AES-CBC", length }, false, ["encrypt", "decrypt"])
}

// 復号
export async function decryptText(encrypted: string, key: CryptoKey, iv: Uint8Array): Promise<string> {
  const ciphertext = fromBase64(encrypted)
  const plainBuffer = await globalThis.crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, ciphertext)
  return new TextDecoder().decode(plainBuffer)
}

// 暗号化
export async function encryptData(data: string, key: CryptoKey, iv: Uint8Array): Promise<string> {
  const plainBuffer = new TextEncoder().encode(data)
  const cipherBuffer = await globalThis.crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, plainBuffer)
  return toBase64(cipherBuffer)
}

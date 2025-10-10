/**
 * @fileoverview 暗号化関連
 */

/**
 * stringからArrayBufferへの変換
 */
export function toArrayBuffer(string_: string): ArrayBuffer {
  const encoder = new TextEncoder() // UTF-8でエンコード
  return encoder.encode(string_).buffer
}

/**
 * Base64からUint8Arrayへの変換
 */
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

/**
 * Uint8ArrayからBase64への変換
 */
export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binaryString = ""
  for (const byte of bytes) {
    binaryString += String.fromCodePoint(byte)
  }

  return globalThis.btoa(binaryString)
}

/**
 * 暗号化
 */
export async function encrypt(plaintext: string, keyString: string): Promise<string> {
  const keyBuffer = Uint8Array.from(globalThis.atob(keyString), (c) => c.codePointAt(0)!)
  const key = await globalThis.crypto.subtle.importKey("raw", keyBuffer, { name: "AES-GCM" }, false, ["encrypt"])
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext))
  const encryptedArray = new Uint8Array(encrypted)
  const fullEncrypted = new Uint8Array(iv.length + encryptedArray.length)
  fullEncrypted.set(iv)
  fullEncrypted.set(encryptedArray, iv.length)
  let binaryString = ""
  for (const c of fullEncrypted) {
    binaryString += String.fromCodePoint(c)
  }

  return globalThis.btoa(binaryString)
}

/**
 * 復号
 */
export async function decrypt(ciphertext: string, keyString: string): Promise<string> {
  const keyBuffer = Uint8Array.from(globalThis.atob(keyString), (c) => c.codePointAt(0)!)
  const key = await globalThis.crypto.subtle.importKey("raw", keyBuffer, { name: "AES-GCM" }, false, ["decrypt"])
  const dataBuffer = Uint8Array.from(globalThis.atob(ciphertext), (c) => c.codePointAt(0)!)
  const iv = dataBuffer.slice(0, 12)
  const encryptedData = dataBuffer.slice(12)
  const decrypted = await globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encryptedData)
  return new TextDecoder().decode(decrypted)
}

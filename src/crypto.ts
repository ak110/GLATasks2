import { AES, enc, lib, mode } from "crypto-js"

export function createCipherParameters(encrypted: string): lib.CipherParams {
  const ciphertext = enc.Base64.parse(encrypted)
  return lib.CipherParams.create({ ciphertext })
}

export function decryptText(encrypted: string, key: lib.WordArray, iv: lib.WordArray): string {
  const cipherParameters = createCipherParameters(encrypted)
  const decrypted = AES.decrypt(cipherParameters, key, {
    iv,
    mode: mode.CBC,
  })
  return decrypted.toString(enc.Utf8)
}

export function encryptData(data: string, key: lib.WordArray, iv: lib.WordArray): string {
  const encrypted = AES.encrypt(data, key, {
    iv,
    mode: mode.CBC,
  })
  return encrypted.ciphertext.toString(enc.Base64)
}

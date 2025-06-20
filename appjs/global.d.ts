import type AlpineJS from "alpinejs"

declare global {
  type AppConfig = {
    encrypt_key: string
    encrypt_iv: string
    urls: {
      [key: string]: string
      "tasks.patch_api": string
      _swjs: string
    }
  }

  var encrypt_key: CryptoKey
  var encrypt_iv: Uint8Array
  var Alpine: typeof AlpineJS
  var bootstrap: any
}

export {}

import type AlpineJS from "alpinejs"
import type * as bootstrap from "bootstrap"

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
  /* eslint-disable-next-line @typescript-eslint/consistent-type-definitions */
  interface GlobalThis {
    encrypt_key: CryptoKey
    encrypt_iv: Uint8Array
    Alpine: typeof AlpineJS
    bootstrap: typeof bootstrap
  }
}

export {}

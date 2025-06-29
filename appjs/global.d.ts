import type AlpineJS from "alpinejs"

declare global {
  type AppConfig = {
    encrypt_key: string
    urls: {
      [key: string]: string
      "tasks.patch_api": string
      _swjs: string
    }
  }

  var Alpine: typeof AlpineJS
  var bootstrap: any
  var encrypt_key: string
}

export {}

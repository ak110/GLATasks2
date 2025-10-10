import type AlpineJS from "alpinejs"

declare global {
  type AppConfig = {
    encrypt_key: string
    urls: {
      "lists.api": string
      "lists.api_tasks": string
      "tasks.patch_api": string
      _swjs: string
    }
  }

  var Alpine: typeof AlpineJS
  var bootstrap: any
  var encrypt_key: string
  var listCache: any
  var appConfig: AppConfig
}

export {}

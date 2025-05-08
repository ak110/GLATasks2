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
}

export {}

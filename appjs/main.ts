import AlpineJS from "alpinejs"
import * as bootstrap from "bootstrap"
import "bootstrap/dist/css/bootstrap.min.css"
import { decrypt } from "./crypto.js"
import "./tailwind.css"
import { setupTaskFormHandlers } from "./task-form.js"
import { setupTaskOperationHandlers } from "./task-operation.js"
import { setupListCacheHandlers, listCache } from "./list-cache.js"

// アプリケーションの初期化
async function initializeApp(config: AppConfig): Promise<void> {
  globalThis.encrypt_key = config.encrypt_key

  // フォームハンドラの設定
  setupTaskFormHandlers()
  setupTaskOperationHandlers(config)
  setupListCacheHandlers()

  // サービスワーカーの登録
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(config.urls._swjs)
      console.log("ServiceWorker registration successful with scope:", registration.scope)
    } catch (error: unknown) {
      console.log("ServiceWorker registration failed:", error)
    }
  }

  // Alpine.jsの初期化
  AlpineJS.start()
}

// 復号
async function decryptObject<T>(crypted: string): Promise<T> {
  const decrypted = await decrypt(crypted, globalThis.encrypt_key)
  return JSON.parse(decrypted) as T
}

globalThis.Alpine = AlpineJS
globalThis.bootstrap = bootstrap
globalThis.initializeApp = initializeApp
globalThis.decryptObject = decryptObject
globalThis.listCache = listCache

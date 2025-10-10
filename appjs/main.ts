import AlpineJS from "alpinejs"
import * as bootstrap from "bootstrap"
import "bootstrap/dist/css/bootstrap.min.css"
import { decrypt } from "./crypto.js"
import "./tailwind.css"
import { initializeLists } from "./lists.js"
import { initializeTasks } from "./tasks.js"

// アプリケーションの初期化
async function initializeApp(): Promise<void> {
  globalThis.encrypt_key = globalThis.appConfig.encrypt_key

  // サービスワーカーの登録
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(globalThis.appConfig.urls._swjs)
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
globalThis.initializeLists = initializeLists
globalThis.initializeTasks = initializeTasks

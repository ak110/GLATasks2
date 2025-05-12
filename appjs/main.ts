import AlpineJS from "alpinejs"
import * as bootstrap from "bootstrap"
import "bootstrap/dist/css/bootstrap.min.css"
import { createKey, decryptText, fromBase64 } from "./crypto.js"
import "./tailwind.css"
import { setupTaskFormHandlers } from "./task-form.js"
import { setupTaskOperationHandlers } from "./task-operation.js"

// アプリケーションの初期化
async function initializeApp(config: AppConfig): Promise<void> {
  globalThis.encrypt_key = await createKey(config.encrypt_key)
  globalThis.encrypt_iv = fromBase64(config.encrypt_iv)

  // リスト選択の保存・復元
  const selectedList = localStorage.getItem("selectedList")
  const listElement = document.querySelector(`a.list-group-item[href="${selectedList ?? ""}"]`)
  if (listElement instanceof HTMLElement) {
    listElement.click()
  } else {
    const defaultElement = document.querySelector("a.list-group-item")
    if (defaultElement instanceof HTMLElement) {
      defaultElement.click()
    }
  }

  // フォームハンドラの設定
  setupTaskFormHandlers()
  setupTaskOperationHandlers(config)

  // リスト選択の保存
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement
    if (target.matches('a[data-bs-toggle="pill"]')) {
      const href = target.getAttribute("href") ?? ""
      localStorage.setItem("selectedList", href)
    }
  })

  // サービスワーカーの登録
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register(config.urls._swjs)
      .then((registration) => {
        console.log("ServiceWorker registration successful with scope:", registration.scope)
      })
      .catch((error: unknown) => {
        console.log("ServiceWorker registration failed:", error)
      })
  }

  // Alpine.jsの初期化
  AlpineJS.start()
}

// 復号
async function decryptObject<T>(crypted: string): Promise<T> {
  const key = globalThis.encrypt_key as CryptoKey
  const iv = globalThis.encrypt_iv as Uint8Array
  const decrypted = await decryptText(crypted, key, iv)
  return JSON.parse(decrypted) as T
}

globalThis.Alpine = AlpineJS
globalThis.bootstrap = bootstrap
globalThis.initializeApp = initializeApp
globalThis.decryptObject = decryptObject

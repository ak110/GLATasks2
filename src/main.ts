import AlpineJS from "alpinejs"
import * as bootstrap from "bootstrap"
import "bootstrap/dist/css/bootstrap.min.css"
import { enc } from "crypto-js"
import { decryptText } from "./crypto.js"
import "./site.css"
import { setupTaskFormHandlers } from "./task-form.js"
import { setupTaskOperationHandlers } from "./task-operation.js"

// アプリケーションの初期化
function initializeApp(config: AppConfig): void {
  globalThis.Alpine = AlpineJS

  const key = enc.Base64.parse(config.encrypt_key)
  const iv = enc.Base64.parse(config.encrypt_iv)
  globalThis.encrypt_key = key
  globalThis.encrypt_iv = iv

  // Alpine.jsの初期化
  AlpineJS.start()

  // DOMContentLoadedイベントで初期化
  document.addEventListener("DOMContentLoaded", () => {
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
  })
}

// 復号
function decryptObject(crypted: string): any {
  const key = globalThis.encrypt_key as CryptoJS.lib.WordArray
  const iv = globalThis.encrypt_iv as CryptoJS.lib.WordArray
  const decrypted = decryptText(crypted, key, iv)
  return JSON.parse(decrypted)
}

globalThis.initializeApp = initializeApp
globalThis.decryptObject = decryptObject
globalThis.bootstrap = bootstrap

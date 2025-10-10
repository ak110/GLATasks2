/**
 * @fileoverview メインアプリケーション
 */

import AlpineJS from "alpinejs"
import * as bootstrap from "bootstrap"
import "bootstrap/dist/css/bootstrap.min.css"
import "./tailwind.css"
import { initializeLists } from "./lists.js"
import { initializeTasks } from "./tasks.js"

/**
 * アプリケーションの初期化
 */
async function initializeApp(): Promise<void> {
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

globalThis.Alpine = AlpineJS
globalThis.bootstrap = bootstrap
globalThis.initializeApp = initializeApp
globalThis.initializeLists = initializeLists
globalThis.initializeTasks = initializeTasks

/* global chrome */

document.addEventListener("DOMContentLoaded", async function () {
  const BASE_URL = "https://glatasks.tqzh.tk"
  const loadingDiv = document.querySelector("#loading")
  const loginRequiredDiv = document.querySelector("#loginRequired")
  const contentFrame = document.querySelector("#contentFrame")

  try {
    // 現在のタブ情報を取得
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const currentTab = tabs[0]
    const title = encodeURIComponent(currentTab.title || "")
    const url = encodeURIComponent(currentTab.url || "")
    const targetUrl = `${BASE_URL}/share/ingest?title=${title}&url=${url}`

    // 認証状態を確認するためにfetchを実行
    const response = await fetch(targetUrl, {
      method: "GET",
      credentials: "include", // Cookieを含める
      redirect: "manual", // リダイレクトを手動処理
    })

    // ステータスコードで認証状態を判定
    if (response.ok || response.status === 0) {
      // 認証済み: iframeを表示
      loadingDiv.style.display = "none"
      contentFrame.src = targetUrl
      contentFrame.style.display = "block"
    } else if (response.status === 401 || response.type === "opaqueredirect") {
      // 未認証: ログインが必要
      loadingDiv.style.display = "none"
      loginRequiredDiv.style.display = "block"
    } else {
      // その他のエラー
      throw new Error(`Unexpected response status: ${response.status}`)
    }
  } catch (error) {
    console.error("Error checking authentication:", error)
    // エラー時はログイン画面を表示
    loadingDiv.style.display = "none"
    loginRequiredDiv.style.display = "block"
  }
})

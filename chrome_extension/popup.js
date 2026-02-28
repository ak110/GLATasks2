/* global chrome */

document.addEventListener("DOMContentLoaded", async function () {
  const BASE_URL = "https://glatasks.tqzh.tk";
  const contentFrame = document.querySelector("#contentFrame");

  // 現在のタブ情報を取得
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  const title = encodeURIComponent(currentTab.title || "");
  const url = encodeURIComponent(currentTab.url || "");
  const targetUrl = `${BASE_URL}/share/ingest?title=${title}&url=${url}&in_popup=1`;

  // Iframeに直接読み込み（未ログイン時はサーバー側が自動的にログインページにリダイレクト）
  contentFrame.src = targetUrl;
});
